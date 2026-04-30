import { ForbiddenError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * issues 모듈 — `GET /issues` (필터: status, prio) + `POST /issues` (생성) + `POST /issues/:id/transition` (상태 전이).
 *
 * 상태 머신 (`ISSUE_TRANSITIONS`):
 *  - open         → in-progress, resolved
 *  - in-progress  → in-review, resolved
 *  - in-review    → resolved, in-progress (반려)
 *  - resolved     → in-progress (재오픈)
 *
 * 동일 상태로의 전이는 멱등 허용 (no-op 200). 정의되지 않은 전이는 400.
 *
 * 응답은 @all-flow/contracts `Issue` 스키마(packages/contracts/openapi.yaml)와 동일.
 *  - assignee/reporter: User.name 으로 직렬화 (없으면 빈 문자열)
 *  - comments: 활성 코멘트 카운트
 *
 * RBAC: 인증 사용자가 멤버인 프로젝트의 이슈만 노출.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  IssuePrio,
  Issue as IssueSchema,
  IssueSev,
  IssueStatus,
} from '../../shared/schemas/index.js';

const ListQuery = z.object({
  status: IssueStatus.optional(),
  prio: IssuePrio.optional(),
});

const PRISMA_ISSUE_STATUS = {
  open: 'open',
  'in-progress': 'in_progress',
  'in-review': 'in_review',
  resolved: 'resolved',
} as const;

const API_ISSUE_STATUS = Object.fromEntries(
  Object.entries(PRISMA_ISSUE_STATUS).map(([api, prisma]) => [prisma, api]),
) as Record<string, string>;

const IssueCreate = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200),
  sev: IssueSev,
  prio: IssuePrio,
  assigneeId: z.string().min(1).optional(),
  tags: z.array(z.string()).max(20).optional(),
  sla: z.string().min(1).max(40),
});

interface IssueRow {
  id: string;
  title: string;
  projColor: string;
  sev: string;
  prio: string;
  status: string;
  tags: string[];
  sla: string;
  slaPct: number;
  linked: number;
  resolved: boolean;
  createdAt: Date;
  project: { name: string };
  assignee: { name: string } | null;
  reporter: { name: string } | null;
  _count?: { comments: number };
}

function toApiIssue(row: IssueRow): unknown {
  return IssueSchema.parse({
    id: row.id,
    title: row.title,
    proj: row.project.name,
    projColor: row.projColor,
    sev: row.sev,
    prio: row.prio,
    status: API_ISSUE_STATUS[row.status] ?? row.status,
    assignee: row.assignee?.name ?? '',
    reporter: row.reporter?.name ?? '',
    tags: row.tags,
    created: row.createdAt.toISOString(),
    sla: row.sla,
    slaPct: row.slaPct,
    comments: row._count?.comments ?? 0,
    linked: row.linked,
    resolved: row.resolved,
  });
}

const ISSUE_INCLUDE = {
  project: { select: { name: true, color: true } },
  assignee: { select: { name: true } },
  reporter: { select: { name: true } },
  _count: { select: { comments: { where: { deletedAt: null } } } },
} as const;

export async function issuesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/issues', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('잘못된 쿼리', parsed.error.issues);
    const { status, prio } = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const rows = await app.prisma.issue.findMany({
      where: {
        deletedAt: null,
        project: { members: { some: { userId } } },
        ...(status ? { status: PRISMA_ISSUE_STATUS[status] } : {}),
        ...(prio ? { prio } : {}),
      },
      include: ISSUE_INCLUDE,
      orderBy: [{ prio: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return rows.map((r) => toApiIssue(r as unknown as IssueRow));
  });

  app.post('/issues', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = IssueCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const input = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    // 프로젝트 멤버십 직접 검증 (요청 body의 projectId)
    const project = await app.prisma.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
      select: { id: true, color: true, members: { where: { userId }, select: { userId: true } } },
    });
    if (!project) throw new NotFoundError('Project', input.projectId);
    if (project.members.length === 0) {
      throw new ForbiddenError('프로젝트 멤버가 아닙니다');
    }

    const created = await app.prisma.issue.create({
      data: {
        title: input.title,
        sev: input.sev,
        prio: input.prio,
        sla: input.sla,
        slaPct: 0,
        linked: 0,
        resolved: false,
        projColor: project.color,
        tags: input.tags ?? [],
        projectId: project.id,
        reporterId: userId,
        ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
      },
      include: ISSUE_INCLUDE,
    });

    reply.code(201);
    return toApiIssue(created as unknown as IssueRow);
  });

  app.post('/issues/:id/transition', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = TransitionInput.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { status: nextWireStatus, comment } = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = (await app.prisma.issue.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
        project: { select: { members: { where: { userId }, select: { userId: true } } } },
      },
    })) as {
      id: string;
      status: keyof typeof DB_TO_WIRE_STATUS;
      project: { members: { userId: string }[] };
    } | null;
    if (!existing) throw new NotFoundError('Issue', id);
    if (existing.project.members.length === 0) {
      throw new ForbiddenError('프로젝트 멤버가 아닙니다');
    }

    const currentWireStatus = DB_TO_WIRE_STATUS[existing.status];
    if (!isAllowedTransition(currentWireStatus, nextWireStatus)) {
      throw new ValidationError(
        `허용되지 않는 상태 전이: ${currentWireStatus} → ${nextWireStatus}`,
        [{ from: currentWireStatus, to: nextWireStatus }],
      );
    }

    const updated = await app.prisma.issue.update({
      where: { id },
      data: {
        status: PRISMA_ISSUE_STATUS[nextWireStatus],
        ...(nextWireStatus === 'resolved' ? { resolved: true } : {}),
        ...(currentWireStatus === 'resolved' && nextWireStatus !== 'resolved'
          ? { resolved: false }
          : {}),
      },
      include: ISSUE_INCLUDE,
    });

    // Optional transition note: persisted as an issue Comment for audit trail.
    if (comment) {
      await app.prisma.comment.create({
        data: {
          body: comment,
          targetKind: 'issue',
          issueId: id,
          authorId: userId,
        },
      });
    }

    return toApiIssue(updated as unknown as IssueRow);
  });
}

const TransitionInput = z
  .object({
    status: IssueStatus,
    comment: z.string().min(1).max(4000).optional(),
  })
  .strict();

const DB_TO_WIRE_STATUS = {
  open: 'open',
  in_progress: 'in-progress',
  in_review: 'in-review',
  resolved: 'resolved',
} as const;

const ISSUE_TRANSITIONS: Record<string, ReadonlyArray<string>> = {
  open: ['in-progress', 'resolved'],
  'in-progress': ['in-review', 'resolved'],
  'in-review': ['resolved', 'in-progress'],
  resolved: ['in-progress'],
};

function isAllowedTransition(from: string, to: string): boolean {
  if (from === to) return true; // 멱등
  const allowed = ISSUE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}
