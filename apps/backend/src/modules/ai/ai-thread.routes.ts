import { ValidationError } from '@all-flow/shared/errors';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CreateThreadBody = z.object({
  title: z.string().min(1).max(200).default('새 대화'),
});

export async function aiThreadRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ai/threads', { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as { sub: string }).sub;
    return app.prisma.aiThread.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  });

  app.post('/ai/threads', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = CreateThreadBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const userId = (req.user as { sub: string }).sub;
    const thread = await app.prisma.aiThread.create({
      data: { title: parsed.data.title, userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    return reply.code(201).send(thread);
  });

  app.get('/ai/threads/:threadId/messages', { preHandler: [app.authenticate] }, async (req) => {
    const { threadId } = req.params as { threadId: string };
    const userId = (req.user as { sub: string }).sub;
    const thread = await app.prisma.aiThread.findFirst({
      where: { id: threadId, userId, deletedAt: null },
    });
    if (!thread) throw new ValidationError('스레드를 찾을 수 없습니다', []);
    return app.prisma.aiMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        toolCalls: true,
        citations: true,
        model: true,
        createdAt: true,
      },
    });
  });

  app.delete('/ai/threads/:threadId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { threadId } = req.params as { threadId: string };
    const userId = (req.user as { sub: string }).sub;
    await app.prisma.aiThread.updateMany({
      where: { id: threadId, userId },
      data: { deletedAt: new Date() },
    });
    return reply.code(204).send();
  });
}
