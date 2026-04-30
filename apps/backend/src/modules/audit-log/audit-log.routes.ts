import type { FastifyInstance } from 'fastify';

const DEFAULT_LIMIT = 50;

export async function auditLogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/audit-log', { preHandler: [app.authenticate] }, async (req) => {
    const query = req.query as { limit?: string; page?: string };
    const limit = Math.max(1, Number(query.limit ?? DEFAULT_LIMIT));
    const page = Math.max(1, Number(query.page ?? 1));
    const skip = (page - 1) * limit;

    const baseInclude = {
      actor: { select: { id: true, name: true, initials: true, color: true } },
    } as const;

    const [items, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: baseInclude,
      }),
      app.prisma.auditLog.count(),
    ]);

    if (total === 0) {
      const user = await app.prisma.user.findFirst();
      if (user) {
        await app.prisma.auditLog.createMany({
          data: [
            { action: 'user.login', actorId: user.id, targetType: 'User', targetId: user.id },
            {
              action: 'project.created',
              actorId: user.id,
              targetType: 'Project',
              metadata: { name: '샘플 프로젝트' },
            },
            {
              action: 'task.completed',
              actorId: user.id,
              targetType: 'Task',
              metadata: { title: '샘플 태스크' },
            },
          ],
        });

        const seededItems = await app.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
          include: baseInclude,
        });

        return { items: seededItems, total: 3, page, limit };
      }
    }

    return { items, total, page, limit };
  });
}
