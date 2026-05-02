import { NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * events 모듈 — 일정 도메인 (T1: Prisma 영속화).
 *
 * 라우트:
 *   GET    /events?from&to   — 기간 필터 일정 목록 (start asc)
 *   POST   /events           — 일정 생성
 *   DELETE /events/:id       — 일정 삭제 (hard delete, 204)
 *
 * 검증:
 *  - start/end 는 ISO 8601 (Date.parse 검증)
 *  - end > start 강제
 *  - from/to 는 YYYY-MM-DD 또는 ISO. 양쪽 누락 시 전체 반환.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const isoDateTime = (value: string): boolean => Number.isFinite(Date.parse(value));

const EventCreate = z
  .object({
    title: z.string().min(1).max(200),
    start: z.string().refine(isoDateTime, { message: 'invalid datetime' }),
    end: z.string().refine(isoDateTime, { message: 'invalid datetime' }),
    location: z.string().min(1).max(200).optional(),
    attendees: z.array(z.string().min(1)).default([]),
    resourceId: z.string().min(1).max(80).optional(),
  })
  .strict();

interface EventRow {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location: string | null;
  attendees: string[];
  resourceId: string | null;
  source: 'internal' | 'google' | 'outlook';
}

const serialize = (row: EventRow) => ({
  id: row.id,
  title: row.title,
  start: row.start.toISOString(),
  end: row.end.toISOString(),
  ...(row.location !== null ? { location: row.location } : {}),
  attendees: row.attendees,
  ...(row.resourceId !== null ? { resourceId: row.resourceId } : {}),
  source: row.source,
});

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/events', { preHandler: [app.authenticate] }, async (req) => {
    const q = req.query as { from?: string; to?: string };
    const fromDate = q.from && isoDateTime(q.from) ? new Date(q.from) : null;
    const toDate = q.to && isoDateTime(q.to) ? new Date(q.to) : null;

    const where: { start?: { gte?: Date; lte?: Date } } = {};
    if (fromDate || toDate) {
      where.start = {};
      if (fromDate) where.start.gte = fromDate;
      if (toDate) where.start.lte = toDate;
    }

    const rows = await app.prisma.event.findMany({
      where,
      orderBy: { start: 'asc' },
    });
    return rows.map(serialize);
  });

  app.post('/events', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = EventCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    if (Date.parse(parsed.data.end) <= Date.parse(parsed.data.start)) {
      throw new ValidationError('end 는 start 이후여야 합니다');
    }
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const row = await app.prisma.event.create({
      data: {
        title: parsed.data.title,
        start: new Date(parsed.data.start),
        end: new Date(parsed.data.end),
        location: parsed.data.location ?? null,
        attendees: parsed.data.attendees,
        resourceId: parsed.data.resourceId ?? null,
        source: 'internal',
        createdById: userId,
      },
    });

    app.log.info(
      {
        action: 'events.create',
        actorId: userId,
        eventId: row.id,
        start: row.start.toISOString(),
        end: row.end.toISOString(),
      },
      'event created',
    );

    return reply.code(201).send(serialize(row));
  });

  app.delete('/events/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.event.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('Event', id);

    await app.prisma.event.delete({ where: { id } });

    app.log.info({ action: 'events.delete', actorId: userId, eventId: id }, 'event deleted');
    reply.code(204);
    return null;
  });
}
