import { ForbiddenError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * comments 서브리소스 — task / issue 공통.
 *
 * 라우트:
 *   GET  /tasks/:id/comments     — 활성 코멘트 목록
 *   POST /tasks/:id/comments     — 코멘트 추가
 *   GET  /issues/:id/comments    — 활성 코멘트 목록
 *   POST /issues/:id/comments    — 코멘트 추가
 *
 * RBAC:
 *  - 대상(task/issue) 의 프로젝트 멤버여야 한다.
 *
 * 응답 형태(컨트랙트 내부):
 *   { id, body, author: { id, name }, createdAt }
 *
 * Frontend 정합성: Issue.comments / Task.comments 카운트는 각 도메인 모듈에서 `_count.comments`
 * 로 이미 노출되며, 본 모듈은 본문 + 추가 흐름을 담당한다.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CommentCreate = z.object({
  body: z.string().min(1).max(4000),
});

interface CommentRow {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string };
}

function toApiComment(row: CommentRow): unknown {
  return {
    id: row.id,
    body: row.body,
    author: { id: row.author.id, name: row.author.name },
    createdAt: row.createdAt.toISOString(),
  };
}

const COMMENT_INCLUDE = {
  author: { select: { id: true, name: true } },
} as const;

export async function commentsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tasks/:id/comments', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    await ensureTaskMembership(app, id, userId);
    return listComments(app, { taskId: id });
  });

  app.post('/tasks/:id/comments', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = CommentCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    await ensureTaskMembership(app, id, userId);

    const created = await app.prisma.comment.create({
      data: {
        body: parsed.data.body,
        targetKind: 'task',
        taskId: id,
        authorId: userId,
      },
      include: COMMENT_INCLUDE,
    });
    reply.code(201);
    return toApiComment(created as unknown as CommentRow);
  });

  app.get('/issues/:id/comments', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    await ensureIssueMembership(app, id, userId);
    return listComments(app, { issueId: id });
  });

  app.post('/issues/:id/comments', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = CommentCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    await ensureIssueMembership(app, id, userId);

    const created = await app.prisma.comment.create({
      data: {
        body: parsed.data.body,
        targetKind: 'issue',
        issueId: id,
        authorId: userId,
      },
      include: COMMENT_INCLUDE,
    });
    reply.code(201);
    return toApiComment(created as unknown as CommentRow);
  });
}

async function listComments(
  app: FastifyInstance,
  filter: { taskId?: string; issueId?: string },
): Promise<unknown[]> {
  const rows = await app.prisma.comment.findMany({
    where: {
      deletedAt: null,
      ...(filter.taskId ? { taskId: filter.taskId } : {}),
      ...(filter.issueId ? { issueId: filter.issueId } : {}),
    },
    include: COMMENT_INCLUDE,
    orderBy: { createdAt: 'asc' },
    take: 500,
  });
  return rows.map((r) => toApiComment(r as unknown as CommentRow));
}

interface MembershipParent {
  project: { members: { userId: string }[] };
}

function assertMember(parent: MembershipParent | null, kind: string, id: string): void {
  if (!parent) throw new NotFoundError(kind, id);
  if (parent.project.members.length === 0) {
    throw new ForbiddenError('프로젝트 멤버가 아닙니다');
  }
}

async function ensureTaskMembership(
  app: FastifyInstance,
  taskId: string,
  userId: string,
): Promise<void> {
  const task = (await app.prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: {
      project: { select: { members: { where: { userId }, select: { userId: true } } } },
    },
  })) as MembershipParent | null;
  assertMember(task, 'Task', taskId);
}

async function ensureIssueMembership(
  app: FastifyInstance,
  issueId: string,
  userId: string,
): Promise<void> {
  const issue = (await app.prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null },
    select: {
      project: { select: { members: { where: { userId }, select: { userId: true } } } },
    },
  })) as MembershipParent | null;
  assertMember(issue, 'Issue', issueId);
}
