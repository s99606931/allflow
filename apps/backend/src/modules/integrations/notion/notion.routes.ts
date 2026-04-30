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
