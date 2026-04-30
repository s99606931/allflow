import { ConflictError, ValidationError } from '@all-flow/shared/errors';
/**
 * resources 모듈 — 리소스(회의실/장비) 도메인 (BE-N4).
 *
 * 라우트:
 *   GET  /resources       — 리소스 목록 (시드 픽스처)
 *   POST /resources/book  — 예약 (충돌 검증)
 *
 * 충돌 규칙: 동일 resourceId 의 [start, end) 가 기존 예약과 겹치면 409.
 *           start <= existing.start < end  OR  start < existing.end <= end
 *           즉 boundary touch 는 허용 (10:00 종료 → 10:00 시작 OK).
 *
 * 영속화/카탈로그 관리는 follow-up.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

interface ResourceRow {
  id: string;
  name: string;
  kind: 'room' | 'equipment';
  capacity?: number;
  location?: string;
}

interface BookingRow {
  resourceId: string;
  start: string;
  end: string;
  bookedBy: string;
}

const RESOURCES_SEED: ResourceRow[] = [
  { id: 'room-101', name: '본사 5F 회의실 A', kind: 'room', capacity: 8, location: '본사 5F' },
  { id: 'room-102', name: '본사 5F 회의실 B', kind: 'room', capacity: 4, location: '본사 5F' },
  { id: 'eq-vr-1', name: 'Quest Pro 헤드셋', kind: 'equipment', location: 'IT 캐비닛' },
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

const bookings = new Map<string, BookingRow[]>();

export function __resetResourcesForTests(): void {
  bookings.clear();
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd;

export async function resourcesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/resources', { preHandler: [app.authenticate] }, async () => {
    return RESOURCES_SEED;
  });

  app.post('/resources/book', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = BookingCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const startMs = Date.parse(parsed.data.start);
    const endMs = Date.parse(parsed.data.end);
    if (endMs <= startMs) throw new ValidationError('end 는 start 이후여야 합니다');

    const exists = RESOURCES_SEED.find((r) => r.id === parsed.data.resourceId);
    if (!exists) throw new ValidationError(`존재하지 않는 리소스: ${parsed.data.resourceId}`);

    const existing = bookings.get(parsed.data.resourceId) ?? [];
    const conflict = existing.find((b) =>
      overlaps(startMs, endMs, Date.parse(b.start), Date.parse(b.end)),
    );
    if (conflict) {
      throw new ConflictError(
        `해당 시간대에 이미 예약이 있습니다: ${conflict.start} ~ ${conflict.end}`,
      );
    }

    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const row: BookingRow = {
      resourceId: parsed.data.resourceId,
      start: parsed.data.start,
      end: parsed.data.end,
      bookedBy: parsed.data.bookedBy ?? userId,
    };
    bookings.set(parsed.data.resourceId, [...existing, row]);

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
