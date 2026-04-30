import { NotFoundError } from '@all-flow/shared/errors';
/**
 * notifications 모듈 — `/notifications` REST.
 *
 * 엔드포인트:
 *  - GET    /notifications?unread=true|false  → 본인 알림 목록 (createdAt desc, 최대 100)
 *  - POST   /notifications/:id/read           → 단건 읽음 처리 (멱등)
 *  - POST   /notifications/read-all           → 본인 모든 미읽음 일괄 읽음 (멱등)
 *
 * 인증: Bearer JWT 필수. 본인 소유 알림만 접근 가능.
 *
 * 직렬화: OpenAPI `Notification` 스키마 — id/kind/title/(body)/(actor)/(href)/time/read.
 *  - DB createdAt → wire `time` (ISO 8601)
 *  - 옵셔널 필드는 null → 응답에서 제거.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Notification as NotificationSchema } from '../../shared/schemas/index.js';

const ListQuery = z.object({
  unread: z.coerce.boolean().optional(),
});

const NOTIFICATION_LIMIT = 100;

interface DbNotification {
  id: string;
  kind: 'mention' | 'sla' | 'ai' | 'system' | 'comment';
  title: string;
  body: string | null;
  actor: string | null;
  href: string | null;
  read: boolean;
  createdAt: Date;
}

function toWire(row: DbNotification): unknown {
  return NotificationSchema.parse({
    id: row.id,
    kind: row.kind,
    title: row.title,
    read: row.read,
    time: row.createdAt.toISOString(),
    ...(row.body ? { body: row.body } : {}),
    ...(row.actor ? { actor: row.actor } : {}),
    ...(row.href ? { href: row.href } : {}),
  });
}

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/notifications', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const query = ListQuery.parse(req.query);
    const where: { userId: string; read?: boolean } = { userId };
    if (query.unread === true) where.read = false;
    if (query.unread === false) where.read = true;

    const rows = (await app.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: NOTIFICATION_LIMIT,
    })) as DbNotification[];

    return rows.map(toWire);
  });

  app.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: [app.authenticate] },
    async (req) => {
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;
      const { id } = req.params;
      const found = (await app.prisma.notification.findFirst({
        where: { id, userId },
        select: { id: true },
      })) as { id: string } | null;
      if (!found) throw new NotFoundError('Notification', id);
      const updated = (await app.prisma.notification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
      })) as DbNotification;
      return toWire(updated);
    },
  );

  app.post('/notifications/read-all', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const result = (await app.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    })) as { count: number };
    return { updated: result.count };
  });
}
