import { NotFoundError, ValidationError } from '@all-flow/shared/errors';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LeaveCreateBody = z
  .object({
    type: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'OTHER']),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().max(1000).optional(),
  })
  .strict();

const StatusBody = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  })
  .strict();

const LeavePatchBody = z
  .object({
    type: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'OTHER']).optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    reason: z.string().max(1000).optional(),
  })
  .strict();

export async function hrRoutes(app: FastifyInstance): Promise<void> {
  app.get('/hr/leave', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    return app.prisma.leaveRequest.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        approver: { select: { id: true, name: true } },
      },
    });
  });

  app.post('/hr/leave', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = LeaveCreateBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const created = await app.prisma.leaveRequest.create({
      data: {
        requesterId: userId,
        type: parsed.data.type,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        reason: parsed.data.reason,
      },
    });
    return reply.code(201).send(created);
  });

  app.patch('/hr/leave/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = LeavePatchBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const existing = await app.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('LeaveRequest', id);
    if (existing.requesterId !== userId) throw new NotFoundError('LeaveRequest', id);
    if (existing.status !== 'PENDING') throw new ValidationError('대기 중인 신청만 수정할 수 있습니다');
    return app.prisma.leaveRequest.update({
      where: { id },
      data: {
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.startDate !== undefined && { startDate: new Date(parsed.data.startDate) }),
        ...(parsed.data.endDate !== undefined && { endDate: new Date(parsed.data.endDate) }),
        ...(parsed.data.reason !== undefined && { reason: parsed.data.reason }),
      },
    });
  });

  app.patch('/hr/leave/:id/status', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = StatusBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const existing = await app.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('LeaveRequest', id);
    return app.prisma.leaveRequest.update({
      where: { id },
      data: { status: parsed.data.status, approverId: userId },
    });
  });

  app.delete('/hr/leave/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const existing = await app.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('LeaveRequest', id);
    if (existing.requesterId !== userId) {
      throw new NotFoundError('LeaveRequest', id);
    }
    await app.prisma.leaveRequest.delete({ where: { id } });
    return reply.code(204).send();
  });
}
