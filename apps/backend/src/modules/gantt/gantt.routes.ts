/**
 * gantt 라우트 — `/gantt`, `/gantt/by-assignee`, `/tasks/:id/dependencies`.
 *
 * 모든 엔드포인트는 인증 필수 + 프로젝트 멤버십 RBAC 통과한 태스크만 노출.
 */
import { ValidationError } from '@all-flow/shared/errors';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createDependency,
  deleteDependency,
  getGantt,
  getGanttByAssignee,
  listDependencies,
} from './gantt.service.js';

const GanttQuery = z.object({
  projectId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const DependencyCreate = z.object({
  successorId: z.string().min(1),
  type: z.enum(['FS', 'SS', 'FF', 'SF']).optional(),
  lagDays: z.number().int().optional(),
});

export async function ganttRoutes(app: FastifyInstance): Promise<void> {
  app.get('/gantt', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = GanttQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('잘못된 쿼리', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    return getGantt(app.prisma, { userId, ...parsed.data });
  });

  app.get('/gantt/by-assignee', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    return getGanttByAssignee(app.prisma, userId);
  });

  app.get('/tasks/:id/dependencies', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    return listDependencies(app.prisma, id, userId);
  });

  app.post('/tasks/:id/dependencies', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = DependencyCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const created = await createDependency(app.prisma, id, userId, parsed.data);
    reply.code(201);
    return created;
  });

  app.delete(
    '/tasks/:id/dependencies/:depId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id, depId } = req.params as { id: string; depId: string };
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;
      await deleteDependency(app.prisma, id, depId, userId);
      reply.code(204);
      return null;
    },
  );
}
