import { ConflictError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * resources 모듈 — 리소스(회의실/장비) 도메인 (T1: Prisma 영속화).
 *
 * 라우트:
 *   GET    /resources              — 리소스 목록 (DB 기반, 비어 있으면 자동 시드)
 *   PATCH  /resources/:id          — 리소스 메타 수정 (name/capacity/location)
 *   DELETE /resources/:id          — 리소스 삭제 (Cascade bookings)
 *   GET    /resources/bookings     — 예약 목록 (date=YYYY-MM-DD, 기본 오늘)
 *   POST   /resources/book         — 예약 (Booking 영속화 + 충돌 검증)
 *   DELETE /resources/bookings/:id — 예약 취소
 *
 * 충돌 규칙: 동일 resourceId 의 [start, end) 가 기존 예약과 겹치면 409.
 *           즉 boundary touch 는 허용 (10:00 종료 → 10:00 시작 OK).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const RESOURCE_SEED = [
  {
    id: 'room-101',
    name: '본사 5F 회의실 A',
    kind: 'room' as const,
    capacity: 8,
    location: '본사 5F',
  },
  {
    id: 'room-102',
    name: '본사 5F 회의실 B',
    kind: 'room' as const,
    capacity: 4,
    location: '본사 5F',
  },
  { id: 'eq-vr-1', name: 'Quest Pro 헤드셋', kind: 'equipment' as const, location: 'IT 캐비닛' },
];

const isoDateTime = (value: string): boolean => Number.isFinite(Date.parse(value));

const BookingCreate = z
  .object({
    resourceId: z.string().min(1).max(80),
    start: z.string().refine(isoDateTime, { message: 'invalid datetime' }),
    end: z.string().refine(isoDateTime, { message: 'invalid datetime' }),
    bookedBy: z.string().min(1).max(80).optional(),
  })
  .strict();

async function ensureResourcesSeeded(app: FastifyInstance): Promise<void> {
  const count = await app.prisma.resource.count();
  if (count > 0) return;
  await app.prisma.resource.createMany({
    data: RESOURCE_SEED.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      capacity: r.capacity ?? null,
      location: r.location ?? null,
    })),
  });
}

interface ResourceRow {
  id: string;
  name: string;
  kind: 'room' | 'equipment';
  capacity: number | null;
  location: string | null;
}

const serializeResource = (r: ResourceRow) => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  ...(r.capacity !== null ? { capacity: r.capacity } : {}),
  ...(r.location !== null ? { location: r.location } : {}),
});

export async function resourcesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/resources', { preHandler: [app.authenticate] }, async () => {
    await ensureResourcesSeeded(app);
    const rows = await app.prisma.resource.findMany({ orderBy: { id: 'asc' } });
    return rows.map(serializeResource);
  });

  const ResourcePatch = z.object({
    name: z.string().min(1).max(120).optional(),
    capacity: z.number().int().positive().nullable().optional(),
    location: z.string().max(120).nullable().optional(),
  }).strict();

  app.patch('/resources/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = ResourcePatch.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const existing = await app.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Resource', id);
    const updated = await app.prisma.resource.update({
      where: { id },
      data: parsed.data,
    });
    return serializeResource(updated);
  });

  app.delete('/resources/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await app.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Resource', id);
    await app.prisma.resource.delete({ where: { id } });
    reply.code(204).send();
  });

  app.get('/resources/bookings', { preHandler: [app.authenticate] }, async (req) => {
    const query = req.query as { date?: string };
    const dateStr = query.date ?? new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    const rows = await app.prisma.booking.findMany({
      where: { start: { gte: dayStart }, end: { lte: dayEnd } },
      orderBy: { start: 'asc' },
    });
    return rows.map(r => ({
      id: r.id,
      resourceId: r.resourceId,
      start: r.start.toISOString(),
      end: r.end.toISOString(),
      bookedBy: r.bookedBy,
    }));
  });

  app.delete('/resources/bookings/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const booking = await app.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundError('Booking', id);
    await app.prisma.booking.delete({ where: { id } });
    reply.code(204).send();
  });

  app.post('/resources/book', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = BookingCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const start = new Date(parsed.data.start);
    const end = new Date(parsed.data.end);
    if (end.getTime() <= start.getTime()) {
      throw new ValidationError('end 는 start 이후여야 합니다');
    }

    await ensureResourcesSeeded(app);
    const exists = await app.prisma.resource.findUnique({
      where: { id: parsed.data.resourceId },
    });
    if (!exists) throw new ValidationError(`존재하지 않는 리소스: ${parsed.data.resourceId}`);

    // overlap: existing.start < newEnd AND newStart < existing.end
    const conflict = await app.prisma.booking.findFirst({
      where: {
        resourceId: parsed.data.resourceId,
        start: { lt: end },
        end: { gt: start },
      },
    });
    if (conflict) {
      throw new ConflictError(
        `해당 시간대에 이미 예약이 있습니다: ${conflict.start.toISOString()} ~ ${conflict.end.toISOString()}`,
      );
    }

    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const created = await app.prisma.booking.create({
      data: {
        resourceId: parsed.data.resourceId,
        start,
        end,
        bookedBy: parsed.data.bookedBy ?? userId,
      },
    });

    const row = {
      id: created.id,
      resourceId: created.resourceId,
      start: created.start.toISOString(),
      end: created.end.toISOString(),
      bookedBy: created.bookedBy,
    };

    app.log.info(
      {
        action: 'resources.book',
        actorId: userId,
        ...row,
      },
      'resource booked',
    );

    return row;
  });
}
