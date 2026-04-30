import { ForbiddenError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * tasks 모듈 — `GET/POST /tasks` + `PATCH /tasks/:id` + `DELETE /tasks/:id`.
 *
 * OpenAPI 컨트랙트(@all-flow/contracts `Task`, packages/contracts/openapi.yaml):
 *   - 응답: { id, title, status, proj, assignee, due, priority, tags }
 *     - `proj`     = project.name
 *     - `assignee` = assignee.name (없으면 빈 문자열)
 *   - 생성/수정 입력은 frontend 컨트랙트(`proj`/`assignee` 이름 기반)와
 *     백엔드 친화적인 ID 기반(`projectId`/`assigneeId`) 둘 다 허용.
 *
 * 필터: `projectId`, `assigneeId`, `status` (openapi 쿼리 그대로).
 *
 * RBAC:
 *   - GET   /tasks       : 인증 사용자가 멤버인 프로젝트의 태스크만 노출
 *   - POST  /tasks       : 대상 프로젝트 멤버 필수
 *   - PATCH /tasks/:id   : 해당 태스크 프로젝트 멤버 필수
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  StatusKey,
  TaskCreate as TaskCreateApi,
  TaskPatch as TaskPatchApi,
  Task as TaskSchema,
} from '../../shared/schemas/index.js';

const ListQuery = z.object({
  projectId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  status: StatusKey.optional(),
});

/**
 * 생성 입력: 컨트랙트(`proj`/`assignee`)를 따르되, ID 우회 키도 함께 받는다.
 * - projectId 또는 proj 둘 중 하나는 필수.
 */
const TaskCreateInput = TaskCreateApi.extend({
  projectId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  proj: z.string().min(1).optional(),
  assignee: z.string().min(1).optional(),
}).refine((v) => Boolean(v.projectId) || Boolean(v.proj), {
  message: 'projectId 또는 proj 필수',
  path: ['projectId'],
});

const TaskPatchInput = TaskPatchApi.extend({
  assigneeId: z.string().min(1).optional(),
  status: StatusKey.optional(),
});

interface TaskRow {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  due: string | null;
  priority: 'high' | 'med' | 'low';
  tags: string[];
  project: { name: string };
  assignee: { name: string } | null;
}

const TASK_INCLUDE = {
  project: { select: { name: true } },
  assignee: { select: { name: true } },
} as const;

function toApiTask(row: TaskRow): unknown {
  return TaskSchema.parse({
    id: row.id,
    title: row.title,
    status: row.status,
    proj: row.project.name,
    assignee: row.assignee?.name ?? '',
    due: row.due ?? '',
    priority: row.priority,
    tags: row.tags,
  });
}

export async function tasksRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tasks', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('잘못된 쿼리', parsed.error.issues);
    const { projectId, assigneeId, status } = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const rows = await app.prisma.task.findMany({
      where: {
        deletedAt: null,
        project: { members: { some: { userId } } },
        ...(projectId ? { projectId } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(status ? { status } : {}),
      },
      include: TASK_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });

    return rows.map((r) => toApiTask(r as unknown as TaskRow));
  });

  app.post('/tasks', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = TaskCreateInput.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const input = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const project = await resolveProjectMembership(app, userId, {
      id: input.projectId,
      name: input.proj,
    });
    if (!project) throw new NotFoundError('Project', input.projectId ?? input.proj);
    if (project.members.length === 0) {
      throw new ForbiddenError('프로젝트 멤버가 아닙니다');
    }

    const assigneeId = await resolveAssigneeId(app, {
      id: input.assigneeId,
      name: input.assignee,
    });

    const created = await app.prisma.task.create({
      data: {
        title: input.title,
        priority: input.priority ?? 'med',
        ...(input.due ? { due: input.due } : {}),
        projectId: project.id,
        createdById: userId,
        ...(assigneeId ? { assigneeId } : {}),
      },
      include: TASK_INCLUDE,
    });

    reply.code(201);
    return toApiTask(created as unknown as TaskRow);
  });

  app.patch('/tasks/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = TaskPatchInput.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const patch = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        projectId: true,
        project: { select: { members: { where: { userId }, select: { userId: true } } } },
      },
    });
    if (!existing) throw new NotFoundError('Task', id);
    if (existing.project.members.length === 0) {
      throw new ForbiddenError('프로젝트 멤버가 아닙니다');
    }

    const assigneeId =
      patch.assigneeId !== undefined || patch.assignee !== undefined
        ? await resolveAssigneeId(app, { id: patch.assigneeId, name: patch.assignee })
        : undefined;

    const updated = await app.prisma.task.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.due !== undefined ? { due: patch.due } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
      },
      include: TASK_INCLUDE,
    });

    return toApiTask(updated as unknown as TaskRow);
  });

  app.delete('/tasks/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        project: { select: { members: { where: { userId }, select: { userId: true } } } },
      },
    });
    if (!existing) throw new NotFoundError('Task', id);
    if (existing.project.members.length === 0) {
      throw new ForbiddenError('프로젝트 멤버가 아닙니다');
    }

    const now = new Date();
    await app.prisma.task.update({
      where: { id },
      data: { deletedAt: now },
    });
    // Cascade soft-delete comments belonging to this task.
    await app.prisma.comment.updateMany({
      where: { taskId: id, deletedAt: null },
      data: { deletedAt: now },
    });

    reply.code(204);
    return null;
  });
}

interface ResolvedProject {
  id: string;
  members: { userId: string }[];
}

async function resolveProjectMembership(
  app: FastifyInstance,
  userId: string,
  ref: { id?: string; name?: string },
): Promise<ResolvedProject | null> {
  if (ref.id) {
    return app.prisma.project.findFirst({
      where: { id: ref.id, deletedAt: null },
      select: {
        id: true,
        members: { where: { userId }, select: { userId: true } },
      },
    });
  }
  if (ref.name) {
    return app.prisma.project.findFirst({
      where: { name: ref.name, deletedAt: null },
      select: {
        id: true,
        members: { where: { userId }, select: { userId: true } },
      },
    });
  }
  return null;
}

async function resolveAssigneeId(
  app: FastifyInstance,
  ref: { id?: string; name?: string },
): Promise<string | undefined> {
  if (ref.id) return ref.id;
  if (!ref.name || ref.name.length === 0) return undefined;
  const u = await app.prisma.user.findFirst({
    where: { name: ref.name, deletedAt: null },
    select: { id: true },
  });
  return u?.id;
}
