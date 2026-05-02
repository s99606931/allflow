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

    return { items, total, page, limit };
  });
}
