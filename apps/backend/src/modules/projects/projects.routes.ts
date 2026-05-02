import { ConflictError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * projects 모듈 — `GET/POST /projects`, `GET/PATCH /projects/:id`.
 *
 * OpenAPI 컨트랙트: @all-flow/contracts `Project` 형태 그대로 응답 (packages/contracts/openapi.yaml).
 *  - members: ProjectMember[].userId 목록
 *  - tasks: { total, done } 집계
 *
 * RBAC:
 *  - GET /projects: 인증된 사용자가 멤버인 프로젝트만 노출
 *  - POST /projects: 인증된 사용자가 owner 로 자동 등록
 *  - GET /projects/:id: 멤버십 필수
 *  - PATCH /projects/:id: owner/admin 만
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ProjectCreate,
  ProjectPatch,
  Project as ProjectSchema,
  StatusKey,
} from '../../shared/schemas/index.js';

const ListQuery = z.object({
  status: StatusKey.optional(),
  q: z.string().min(1).max(120).optional(),
});

interface ProjectRow {
  id: string;
  name: string;
  code: string;
  color: string;
  progress: number;
  budget: number | null;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  due: Date | null;
  members: { userId: string }[];
  _count?: { tasks: number };
}

function toApiProject(p: ProjectRow, doneCount: number): unknown {
  return ProjectSchema.parse({
    id: p.id,
    name: p.name,
    code: p.code,
    color: p.color,
    progress: p.progress,
    budget: p.budget,
    status: p.status,
    due: p.due ? p.due.toISOString().slice(0, 10) : null,
    members: p.members.map((m) => m.userId),
    tasks: { total: p._count?.tasks ?? 0, done: doneCount },
  });
}

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/projects', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('잘못된 쿼리', parsed.error.issues);
    const { status, q } = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const rows = await app.prisma.project.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId } },
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        members: { select: { userId: true } },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ids = rows.map((r) => r.id);
    const doneByProject = await groupDoneTasks(app, ids);

    return rows.map((r) => toApiProject(r, doneByProject.get(r.id) ?? 0));
  });

  app.post('/projects', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = ProjectCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const input = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const dueDate = input.due ? new Date(input.due) : undefined;
    if (dueDate && isNaN(dueDate.getTime())) {
      throw new ValidationError('잘못된 due 형식', [
        { path: ['due'], message: 'YYYY-MM-DD 형식이어야 합니다', code: 'invalid_string' as const },
      ]);
    }

    const created = await app.prisma.project
      .create({
        data: {
          name: input.name,
          code: input.code,
          color: input.color ?? '#5B7FFF',
          ...(dueDate ? { due: dueDate } : {}),
          ...(input.budget !== undefined ? { budget: input.budget } : {}),
          members: { create: { userId, role: 'owner' } },
        },
        include: {
          members: { select: { userId: true } },
          _count: { select: { tasks: true } },
        },
      })
      .catch((err: { code?: string }) => {
        if (err.code === 'P2002') throw new ConflictError(`code 중복: ${input.code}`);
        throw err;
      });

    reply.code(201);
    return toApiProject(created, 0);
  });

  app.get(
    '/projects/:id',
    { preHandler: [app.authenticate, app.requireMembership('id')] },
    async (req) => {
      const { id } = req.params as { id: string };
      const row = await app.prisma.project.findFirst({
        where: { id, deletedAt: null },
        include: {
          members: { select: { userId: true } },
          _count: { select: { tasks: { where: { deletedAt: null } } } },
        },
      });
      if (!row) throw new NotFoundError('Project', id);
      const done = (await groupDoneTasks(app, [id])).get(id) ?? 0;
      return toApiProject(row, done);
    },
  );

  app.delete(
    '/projects/:id',
    { preHandler: [app.authenticate, app.requireRole(['owner', 'admin'], 'id')] },
    async (req) => {
      const { id } = req.params as { id: string };
      await app.prisma.project
        .update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } })
        .catch((err: { code?: string }) => {
          if (err.code === 'P2025') throw new NotFoundError('Project', id);
          throw err;
        });
      return { id, deleted: true };
    },
  );

  app.patch(
    '/projects/:id',
    { preHandler: [app.authenticate, app.requireRole(['owner', 'admin'], 'id')] },
    async (req) => {
      const { id } = req.params as { id: string };
      const parsed = ProjectPatch.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
      const patch = parsed.data;

      const updated = await app.prisma.project
        .update({
          where: { id },
          data: {
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
            ...(patch.due !== undefined ? { due: patch.due ? new Date(patch.due) : null } : {}),
            ...(patch.budget !== undefined ? { budget: patch.budget } : {}),
          },
          include: {
            members: { select: { userId: true } },
            _count: { select: { tasks: { where: { deletedAt: null } } } },
          },
        })
        .catch((err: { code?: string }) => {
          if (err.code === 'P2025') throw new NotFoundError('Project', id);
          throw err;
        });

      const done = (await groupDoneTasks(app, [id])).get(id) ?? 0;
      return toApiProject(updated, done);
    },
  );
}

/** 프로젝트별 status='done' 태스크 개수를 한 번에 집계. */
async function groupDoneTasks(
  app: FastifyInstance,
  projectIds: string[],
): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();
  const grouped = await app.prisma.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: projectIds }, status: 'done', deletedAt: null },
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.projectId, g._count._all]));
}
