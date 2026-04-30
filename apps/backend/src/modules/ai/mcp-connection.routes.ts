import { ValidationError } from '@all-flow/shared/errors';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CreateMcpBody = z.object({
  name: z.string().min(1).max(100),
  transport: z.enum(['stdio', 'sse']),
  config: z.record(z.string(), z.unknown()),
  isEnabled: z.boolean().default(true),
});

export async function mcpConnectionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ai/mcp-connections', { preHandler: [app.authenticate] }, async () => {
    return app.prisma.mcpConnection.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, transport: true, isEnabled: true, createdAt: true },
    });
  });

  app.post('/ai/mcp-connections', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = CreateMcpBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { config, ...rest } = parsed.data;
    const conn = await app.prisma.mcpConnection.create({
      data: { ...rest, config: config as Prisma.InputJsonValue },
      select: { id: true, name: true, transport: true, isEnabled: true, createdAt: true },
    });
    return reply.code(201).send(conn);
  });

  app.patch('/ai/mcp-connections/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({ isEnabled: z.boolean() }).safeParse(req.body);
    if (!body.success) throw new ValidationError('잘못된 입력', body.error.issues);
    return app.prisma.mcpConnection.update({
      where: { id },
      data: { isEnabled: body.data.isEnabled },
      select: { id: true, name: true, transport: true, isEnabled: true, updatedAt: true },
    });
  });

  app.delete('/ai/mcp-connections/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await app.prisma.mcpConnection.delete({ where: { id } });
    return reply.code(204).send();
  });
}
