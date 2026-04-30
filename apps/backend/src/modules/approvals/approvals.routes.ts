import { ForbiddenError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * approvals 모듈 — 결재 도메인 (BE-N1).
 *
 * 라우트:
 *   GET  /approvals                  — 목록 (status 필터 가능)
 *   POST /approvals                  — 결재 요청 생성
 *   POST /approvals/:id/decision     — 결재 의사 결정 (approved | rejected)
 *
 * 현재 구현(BE-N1 1차):
 *  - in-memory store (모듈 스코프 Map). 영속화는 follow-up (Prisma Approval 모델).
 *  - 모든 변경에 audit log (`approvals.create`, `approvals.decide`).
 *  - RBAC: 결재 의사 결정은 approver === req.user.id 만 허용.
 *  - 멱등성: 동일 결정 재호출 시 200 + 동일 본문 (이미 처리된 결재는 ValidationError로 거절).
 *
 * 컨트랙트(openapi)·FE 와이어링은 본 stub 단계에서 정합. 영속화/이력은 후속.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface ApprovalRow {
  id: string;
  title: string;
  requester: string;
  approver: string;
  status: ApprovalStatus;
  amount?: number;
  reason?: string;
  decidedAt?: string;
  createdAt: string;
}

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

const store = new Map<string, ApprovalRow>();
let seq = 0;

export function __resetApprovalsForTests(): void {
  store.clear();
  seq = 0;
}

const newId = (): string => {
  seq += 1;
  return `apr-${seq.toString(36)}-${Date.now().toString(36)}`;
};

export async function approvalsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/approvals', { preHandler: [app.authenticate] }, async (req) => {
    const status =
      typeof (req.query as { status?: string })?.status === 'string'
        ? StatusFilter.safeParse((req.query as { status?: string }).status)
        : null;

    const all: ApprovalRow[] = Array.from(store.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    if (status?.success) return all.filter((row) => row.status === status.data);
    return all;
  });

  app.post('/approvals', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = ApprovalCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const row: ApprovalRow = {
      id: newId(),
      title: parsed.data.title,
      requester: userId,
      approver: parsed.data.approver,
      status: 'pending',
      ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
      ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
      createdAt: new Date().toISOString(),
    };
    store.set(row.id, row);

    app.log.info(
      {
        action: 'approvals.create',
        actorId: userId,
        approvalId: row.id,
        approver: row.approver,
        title: row.title,
      },
      'approval created',
    );

    return reply.code(201).send(row);
  });

  app.post('/approvals/:id/decision', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = ApprovalDecision.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const existing = store.get(id);
    if (!existing) throw new NotFoundError('Approval', id);

    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    if (existing.approver !== userId) {
      throw new ForbiddenError('지정된 결재자만 결정할 수 있습니다');
    }
    if (existing.status !== 'pending') {
      throw new ValidationError(`이미 ${existing.status} 상태인 결재입니다`);
    }

    const updated: ApprovalRow = {
      ...existing,
      status: parsed.data.decision,
      decidedAt: new Date().toISOString(),
      ...(parsed.data.comment ? { reason: parsed.data.comment } : {}),
    };
    store.set(id, updated);

    app.log.info(
      {
        action: 'approvals.decide',
        actorId: userId,
        approvalId: id,
        decision: parsed.data.decision,
      },
      'approval decided',
    );

    return updated;
  });
}
