import { ForbiddenError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * approvals 모듈 — 결재 도메인 (T1: Prisma 영속화).
 *
 * 라우트:
 *   GET  /approvals                  — 목록 (status 필터 가능, createdAt desc)
 *   POST /approvals                  — 결재 요청 생성
 *   POST /approvals/:id/decision     — 결재 의사 결정 (approved | rejected)
 *
 * RBAC: 결재 의사 결정은 approverId === req.user.id 만 허용.
 * 멱등성: 이미 처리된 결재는 ValidationError 로 거절 (재호출 불가).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ApprovalCreate = z
  .object({
    title: z.string().min(1).max(200),
    approver: z.string().min(1).max(80),
    amount: z.number().finite().optional(),
    reason: z.string().min(1).max(2000).optional(),
  })
  .strict();

const ApprovalDecision = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    comment: z.string().min(1).max(2000).optional(),
  })
  .strict();

const StatusFilter = z.enum(['pending', 'approved', 'rejected', 'cancelled']);

type ApprovalStatus = z.infer<typeof StatusFilter>;

interface ApprovalRow {
  id: string;
  title: string;
  requesterId: string;
  approverId: string;
  status: ApprovalStatus;
  amount: number | null;
  reason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const serialize = (row: ApprovalRow) => ({
  id: row.id,
  title: row.title,
  requester: row.requesterId,
  approver: row.approverId,
  status: row.status,
  ...(row.amount !== null ? { amount: row.amount } : {}),
  ...(row.reason !== null ? { reason: row.reason } : {}),
  ...(row.decidedAt !== null ? { decidedAt: row.decidedAt.toISOString() } : {}),
  createdAt: row.createdAt.toISOString(),
});

export async function getPendingApprovalsCount(app: FastifyInstance): Promise<number> {
  return app.prisma.approval.count({ where: { status: 'pending' } });
}

export async function approvalsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/approvals', { preHandler: [app.authenticate] }, async (req) => {
    const raw = (req.query as { status?: string })?.status;
    const status = typeof raw === 'string' ? StatusFilter.safeParse(raw) : null;

    const where = status?.success ? { status: status.data } : {};
    const rows = await app.prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serialize);
  });

  app.post('/approvals', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = ApprovalCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const row = await app.prisma.approval.create({
      data: {
        title: parsed.data.title,
        requesterId: userId,
        approverId: parsed.data.approver,
        amount: parsed.data.amount ?? null,
        reason: parsed.data.reason ?? null,
      },
    });

    app.log.info(
      {
        action: 'approvals.create',
        actorId: userId,
        approvalId: row.id,
        approver: row.approverId,
        title: row.title,
      },
      'approval created',
    );

    return reply.code(201).send(serialize(row));
  });

  app.post('/approvals/:id/decision', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = ApprovalDecision.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const existing = await app.prisma.approval.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Approval', id);

    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    if (existing.approverId !== userId) {
      throw new ForbiddenError('지정된 결재자만 결정할 수 있습니다');
    }
    if (existing.status !== 'pending') {
      throw new ValidationError(`이미 ${existing.status} 상태인 결재입니다`);
    }

    const updated = await app.prisma.approval.update({
      where: { id },
      data: {
        status: parsed.data.decision,
        decidedAt: new Date(),
        ...(parsed.data.comment ? { reason: parsed.data.comment } : {}),
      },
    });

    app.log.info(
      {
        action: 'approvals.decide',
        actorId: userId,
        approvalId: id,
        decision: parsed.data.decision,
      },
      'approval decided',
    );

    return serialize(updated);
  });

  app.delete('/approvals/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.approval.findFirst({ where: { id } });
    if (!existing) throw new NotFoundError('Approval', id);
    if (existing.status !== 'pending') {
      throw new ValidationError('진행 중이 아닌 결재는 회수할 수 없습니다');
    }
    if (existing.requesterId !== userId) {
      throw new ForbiddenError('상신자만 결재를 회수할 수 있습니다');
    }

    await app.prisma.approval.delete({ where: { id } });

    app.log.info(
      { action: 'approvals.retract', actorId: userId, approvalId: id },
      'approval retracted',
    );

    reply.code(204);
    return reply.send();
  });
}
