import { ValidationError } from '@all-flow/shared/errors';
/**
 * events 모듈 — 일정 도메인 (BE-N3).
 *
 * 라우트:
 *   GET  /events?from&to   — 기간 필터 일정 목록 (start asc)
 *   POST /events           — 일정 생성
 *
 * 현재 구현: in-memory store + audit log (`events.create`).
 * 영속화 + RRULE/외부 캘린더 연동은 follow-up.
 *
 * 검증:
 *  - start/end 는 ISO 8601 (Date.parse 검증)
 *  - end > start 강제 (잘못된 범위 400)
 *  - from/to 는 YYYY-MM-DD 또는 ISO. 양쪽 누락 시 전체 반환.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

interface EventRow {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  attendees: string[];
  resourceId?: string;
  source: 'internal' | 'google' | 'outlook';
}

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

const store = new Map<string, EventRow>();
let seq = 0;

export function __resetEventsForTests(): void {
  store.clear();
  seq = 0;
}

const newId = (): string => {
  seq += 1;
  return `evt-${seq.toString(36)}-${Date.now().toString(36)}`;
};

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/events', { preHandler: [app.authenticate] }, async (req) => {
    const q = req.query as { from?: string; to?: string };
    const fromMs = q.from && isoDateTime(q.from) ? Date.parse(q.from) : null;
    const toMs = q.to && isoDateTime(q.to) ? Date.parse(q.to) : null;

    const all = Array.from(store.values()).sort((a, b) => a.start.localeCompare(b.start));
    return all.filter((e) => {
      const s = Date.parse(e.start);
      if (fromMs !== null && s < fromMs) return false;
      if (toMs !== null && s > toMs) return false;
      return true;
    });
  });

  app.post('/events', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = EventCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    if (Date.parse(parsed.data.end) <= Date.parse(parsed.data.start)) {
      throw new ValidationError('end 는 start 이후여야 합니다');
    }
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const row: EventRow = {
      id: newId(),
      title: parsed.data.title,
      start: parsed.data.start,
      end: parsed.data.end,
      ...(parsed.data.location ? { location: parsed.data.location } : {}),
      attendees: parsed.data.attendees,
      ...(parsed.data.resourceId ? { resourceId: parsed.data.resourceId } : {}),
      source: 'internal',
    };
    store.set(row.id, row);

    app.log.info(
      {
        action: 'events.create',
        actorId: userId,
        eventId: row.id,
        start: row.start,
        end: row.end,
      },
      'event created',
    );

    return reply.code(201).send(row);
  });
}
