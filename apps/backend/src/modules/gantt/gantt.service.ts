/**
 * gantt 서비스 — 포트폴리오 간트 조회 + 담당자 그룹 + 의존성 CRUD.
 *
 * RBAC: 호출자가 멤버인 프로젝트의 태스크만 노출.
 * 사이클 감지는 dependency-cycle.ts 위임.
 */
import { AppError, ForbiddenError, NotFoundError } from '@all-flow/shared/errors';
import type { PrismaClient } from '@prisma/client';
import { wouldCreateCycle } from './dependency-cycle.js';

const ISO_DATE_LEN = 10;

export interface GanttQuery {
  userId: string;
  projectId?: string;
  assigneeId?: string;
  from?: string;
  to?: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  priority: 'high' | 'med' | 'low';
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  kind: 'task' | 'milestone' | 'summary';
  assigneeId: string | null;
  projectId: string;
  project: { color: string } | null;
}

interface DependencyRow {
  id: string;
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
  createdAt: Date;
}

function toIsoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, ISO_DATE_LEN) : null;
}

function toGanttTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    projectId: row.projectId,
    projectColor: row.project?.color,
    assigneeId: row.assigneeId,
    startDate: toIsoDate(row.startDate),
    endDate: toIsoDate(row.endDate),
    progress: row.progress,
    status: row.status,
    priority: row.priority,
  };
}

function toApiDependency(d: DependencyRow) {
  return {
    id: d.id,
    predecessorId: d.predecessorId,
    successorId: d.successorId,
    type: d.type,
    lagDays: d.lagDays,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function getGantt(
  prisma: PrismaClient,
  query: GanttQuery,
): Promise<{
  range?: { from: string; to: string };
  tasks: ReturnType<typeof toGanttTask>[];
  dependencies: ReturnType<typeof toApiDependency>[];
}> {
  const dateFilter = buildDateFilter(query.from, query.to);
  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      project: { members: { some: { userId: query.userId } } },
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...dateFilter,
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      startDate: true,
      endDate: true,
      progress: true,
      kind: true,
      assigneeId: true,
      projectId: true,
      project: { select: { color: true } },
    },
    orderBy: [{ startDate: 'asc' }, { updatedAt: 'desc' }],
    take: 1000,
  });

  const taskIds = tasks.map((t) => t.id);
  const dependencies = taskIds.length
    ? await prisma.taskDependency.findMany({
        where: { OR: [{ predecessorId: { in: taskIds } }, { successorId: { in: taskIds } }] },
      })
    : [];

  return {
    ...(query.from && query.to ? { range: { from: query.from, to: query.to } } : {}),
    tasks: tasks.map(toGanttTask),
    dependencies: dependencies.map(toApiDependency),
  };
}

function buildDateFilter(from?: string, to?: string) {
  if (!from && !to) return {};
  const start = from ? new Date(from) : undefined;
  const end = to ? new Date(to) : undefined;
  // True overlap: task [startDate, endDate] intersects window [start, end]
  // Condition: startDate <= end AND endDate >= start
  return {
    AND: [
      ...(end ? [{ startDate: { lte: end } }] : []),
      ...(start ? [{ endDate: { gte: start } }] : []),
    ],
  };
}

export async function getGanttByAssignee(
  prisma: PrismaClient,
  userId: string,
): Promise<{
  groups: Array<{
    assigneeId: string | null;
    assigneeName: string | null;
    tasks: ReturnType<typeof toGanttTask>[];
    conflictCount: number;
  }>;
}> {
  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      project: { members: { some: { userId } } },
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      startDate: true,
      endDate: true,
      progress: true,
      kind: true,
      assigneeId: true,
      projectId: true,
      project: { select: { color: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ startDate: 'asc' }],
    take: 1000,
  });

  const grouped = new Map<
    string,
    { assigneeId: string | null; assigneeName: string | null; tasks: typeof tasks }
  >();

  for (const t of tasks) {
    const key = t.assigneeId ?? '__unassigned__';
    const existing = grouped.get(key);
    if (existing) {
      existing.tasks.push(t);
    } else {
      grouped.set(key, {
        assigneeId: t.assigneeId,
        assigneeName: t.assignee?.name ?? null,
        tasks: [t],
      });
    }
  }

  return {
    groups: Array.from(grouped.values()).map((g) => ({
      assigneeId: g.assigneeId,
      assigneeName: g.assigneeName,
      tasks: g.tasks.map(toGanttTask),
      conflictCount: 0,
    })),
  };
}

export async function listDependencies(
  prisma: PrismaClient,
  taskId: string,
  userId: string,
): Promise<{
  predecessors: ReturnType<typeof toApiDependency>[];
  successors: ReturnType<typeof toApiDependency>[];
}> {
  await assertTaskAccess(prisma, taskId, userId);

  const [predecessors, successors] = await Promise.all([
    prisma.taskDependency.findMany({ where: { successorId: taskId } }),
    prisma.taskDependency.findMany({ where: { predecessorId: taskId } }),
  ]);

  return {
    predecessors: predecessors.map(toApiDependency),
    successors: successors.map(toApiDependency),
  };
}

export interface CreateDependencyInput {
  successorId: string;
  type?: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays?: number;
}

export async function createDependency(
  prisma: PrismaClient,
  predecessorId: string,
  userId: string,
  input: CreateDependencyInput,
): Promise<ReturnType<typeof toApiDependency>> {
  await assertTaskAccess(prisma, predecessorId, userId);
  await assertTaskAccess(prisma, input.successorId, userId);

  if (await wouldCreateCycle(predecessorId, input.successorId, prisma)) {
    throw new AppError({
      code: 'DEPENDENCY_CYCLE',
      message: '의존성 사이클이 감지되었습니다',
      statusCode: 422,
      details: [{ code: 'dependency_cycle', path: [], message: 'cycle detected' }],
    });
  }

  const created = await prisma.taskDependency.create({
    data: {
      predecessorId,
      successorId: input.successorId,
      type: input.type ?? 'FS',
      lagDays: input.lagDays ?? 0,
    },
  });

  return toApiDependency(created);
}

export async function deleteDependency(
  prisma: PrismaClient,
  taskId: string,
  depId: string,
  userId: string,
): Promise<void> {
  await assertTaskAccess(prisma, taskId, userId);
  const existing = await prisma.taskDependency.findUnique({ where: { id: depId } });
  if (!existing) throw new NotFoundError('TaskDependency', depId);

  await prisma.taskDependency.delete({ where: { id: depId } });
}

async function assertTaskAccess(
  prisma: PrismaClient,
  taskId: string,
  userId: string,
): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: {
      id: true,
      project: { select: { members: { where: { userId }, select: { userId: true } } } },
    },
  });
  if (!task) throw new NotFoundError('Task', taskId);
  if (task.project.members.length === 0) {
    throw new ForbiddenError('프로젝트 멤버가 아닙니다');
  }
}
