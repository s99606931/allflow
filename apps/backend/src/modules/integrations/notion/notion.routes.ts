import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ConnectBody = z.object({
  workspaceId: z.string().min(1),
  workspaceName: z.string().min(1),
  accessToken: z.string().optional(),
  botId: z.string().optional(),
});

export async function notionRoutes(app: FastifyInstance): Promise<void> {
  // GET /integrations/notion/connections — list current user's connections
  app.get('/integrations/notion/connections', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user
    const userId = req.user!.id;
    const connections = await app.prisma.notionConnection.findMany({
      where: { createdById: userId },
      select: { id: true, workspaceName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return connections;
  });

  // POST /integrations/notion/connect — save a connection (mock OAuth result)
  // Production: receive code from Notion OAuth callback, exchange for token.
  // Dev mode: accept workspace details directly (no real NOTION_CLIENT_ID needed).
  app.post(
    '/integrations/notion/connect',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = ConnectBody.parse(req.body);
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user
      const userId = req.user!.id;

      const existing = await app.prisma.notionConnection.findUnique({
        where: { workspaceId: body.workspaceId },
      });
      if (existing) {
        return reply.code(409).send({ error: '이미 연결된 워크스페이스입니다' });
      }

      const connection = await app.prisma.notionConnection.create({
        data: {
          workspaceId: body.workspaceId,
          accessToken: body.accessToken ?? `mock-token-${Date.now()}`,
          botId: body.botId ?? 'mock-bot',
          workspaceName: body.workspaceName,
          createdById: userId,
        },
      });
      return reply.code(201).send({ id: connection.id, workspaceName: connection.workspaceName });
    },
  );

  // GET /integrations/notion/status — 현재 사용자의 연결 상태 요약
  app.get('/integrations/notion/status', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user
    const userId = req.user!.id;
    const count = await app.prisma.notionConnection.count({ where: { createdById: userId } });
    const last = await app.prisma.notionConnection.findFirst({
      where: { createdById: userId },
      orderBy: { updatedAt: 'desc' },
      select: { workspaceName: true, updatedAt: true },
    });
    return {
      connected: count > 0,
      connectionCount: count,
      lastWorkspaceName: last?.workspaceName ?? null,
      lastSyncedAt: last?.updatedAt?.toISOString() ?? null,
    };
  });

  // POST /integrations/notion/sync — 수동 동기화 트리거.
  // 본 사이클: 연결 row updatedAt 만 갱신(=마지막 sync 시각). 실 페이지 fetch 는 follow-up.
  app.post('/integrations/notion/sync', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user
    const userId = req.user!.id;
    const conns = await app.prisma.notionConnection.findMany({ where: { createdById: userId } });
    if (conns.length === 0) {
      return { synced: 0, message: '연결된 워크스페이스가 없습니다' };
    }
    const now = new Date();
    await app.prisma.notionConnection.updateMany({
      where: { createdById: userId },
      data: { updatedAt: now },
    });
    app.log.info(
      { action: 'notion.sync', actorId: userId, count: conns.length },
      'notion sync triggered',
    );
    return { synced: conns.length, syncedAt: now.toISOString() };
  });

  // DELETE /integrations/notion/connections/:id — disconnect
  app.delete(
    '/integrations/notion/connections/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user
      const userId = req.user!.id;

      const conn = await app.prisma.notionConnection.findFirst({
        where: { id, createdById: userId },
      });
      if (!conn) return reply.code(404).send({ error: '연결을 찾을 수 없습니다' });

      await app.prisma.notionConnection.delete({ where: { id } });
      return reply.code(204).send();
    },
  );
}
