import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { tasksRoutes } from './tasks.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface TaskRow {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  due: string | null;
  priority: 'high' | 'med' | 'low';
  tags: string[];
  startDate: Date | null;
  endDate: Date | null;
  parentTaskId: string | null;
  kind: 'task' | 'milestone' | 'summary';
  progress: number;
  projectId: string;
  assigneeId: string | null;
  createdById: string;
  deletedAt: Date | null;
  updatedAt: Date;
  project: { id: string; name: string; members: { userId: string }[] };
  assignee: { id: string; name: string } | null;
}

interface ProjectRow {
  id: string;
  name: string;
  deletedAt: Date | null;
  members: { userId: string }[];
}

interface UserRow {
  id: string;
  name: string;
  deletedAt: Date | null;
}

function makeStore() {
  const tasks = new Map<string, TaskRow>();
  const projects = new Map<string, ProjectRow>();
  const users = new Map<string, UserRow>();
  let seq = 0;

  function addProject(id: string, name: string, memberIds: string[]): ProjectRow {
    const p: ProjectRow = {
      id,
      name,
      deletedAt: null,
      members: memberIds.map((uid) => ({ userId: uid })),
    };
    projects.set(id, p);
    return p;
  }

  function addUser(id: string, name: string): UserRow {
    const u: UserRow = { id, name, deletedAt: null };
    users.set(id, u);
    return u;
  }

  const taskModel = {
    findMany: async (args: AnyArgs) => {
      // Extract userId from: where.project.members.some.userId
      const userId: string | undefined = args?.where?.project?.members?.some?.userId;
      const projectId: string | undefined = args?.where?.projectId;
      const assigneeId: string | undefined = args?.where?.assigneeId;
      const status: string | undefined = args?.where?.status;

      let list = Array.from(tasks.values()).filter((t) => t.deletedAt === null);

      if (userId) {
        list = list.filter((t) => t.project.members.some((m) => m.userId === userId));
      }
      if (projectId) list = list.filter((t) => t.projectId === projectId);
      if (assigneeId) list = list.filter((t) => t.assigneeId === assigneeId);
      if (status) list = list.filter((t) => t.status === status);

      return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },

    findFirst: async (args: AnyArgs) => {
      const id: string | undefined = args?.where?.id;
      const checkDeleted: boolean = 'deletedAt' in (args?.where ?? {});
      if (!id) return null;
      const t = tasks.get(id);
      if (!t) return null;
      if (checkDeleted && t.deletedAt !== null) return null;

      // If called from PATCH/DELETE: select.project.select.members.where.userId
      const memberUserId: string | undefined =
        args?.select?.project?.select?.members?.where?.userId;
      if (memberUserId !== undefined) {
        return {
          id: t.id,
          projectId: t.projectId,
          project: {
            members: t.project.members.filter((m) => m.userId === memberUserId),
          },
        };
      }
      return t;
    },

    create: async (args: AnyArgs) => {
      seq += 1;
      const now = new Date(Date.now() + seq);
      const projectId: string = args.data.projectId;
      const proj = projects.get(projectId);
      if (!proj) throw new Error(`Project ${projectId} not found`);
      const assigneeId: string | undefined = args.data.assigneeId;
      const assigneeUser = assigneeId ? (users.get(assigneeId) ?? null) : null;

      const row: TaskRow = {
        id: `task-${seq}`,
        title: args.data.title,
        status: (args.data.status as TaskRow['status']) ?? 'todo',
        due: args.data.due ?? null,
        priority: (args.data.priority as TaskRow['priority']) ?? 'med',
        tags: [],
        startDate: null,
        endDate: null,
        parentTaskId: null,
        kind: 'task',
        progress: 0,
        projectId,
        assigneeId: assigneeId ?? null,
        createdById: args.data.createdById,
        deletedAt: null,
        updatedAt: now,
        project: { id: proj.id, name: proj.name, members: proj.members },
        assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name } : null,
      };
      tasks.set(row.id, row);
      return row;
    },

    update: async (args: AnyArgs) => {
      const id: string = args.where.id;
      const t = tasks.get(id);
      if (!t) throw new Error(`Task ${id} not found`);
      const data = args.data as Partial<TaskRow>;
      const updated: TaskRow = {
        ...t,
        ...data,
        id: t.id,
        projectId: t.projectId,
        updatedAt: new Date(),
        project: t.project,
        assignee: t.assignee,
      };
      tasks.set(id, updated);
      return updated;
    },
  };

  const projectModel = {
    findFirst: async (args: AnyArgs) => {
      const id: string | undefined = args?.where?.id;
      const name: string | undefined = args?.where?.name;
      let proj: ProjectRow | undefined;
      if (id) {
        proj = projects.get(id);
      } else if (name) {
        proj = Array.from(projects.values()).find(
          (p) => p.name === name && p.deletedAt === null,
        );
      }
      if (!proj || proj.deletedAt !== null) return null;
      // If called with select.members.where.userId, filter members
      const memberUserId: string | undefined = args?.select?.members?.where?.userId;
      if (memberUserId !== undefined) {
        return {
          id: proj.id,
          members: proj.members.filter((m) => m.userId === memberUserId),
        };
      }
      return proj;
    },
  };

  const userModel = {
    findFirst: async (args: AnyArgs) => {
      const name: string | undefined = args?.where?.name;
      if (!name) return null;
      const u = Array.from(users.values()).find(
        (uu) => uu.name === name && uu.deletedAt === null,
      );
      if (!u) return null;
      return { id: u.id };
    },
  };

  const commentModel = {
    updateMany: async (_args: AnyArgs) => ({ count: 0 }),
  };

  return {
    tasks,
    projects,
    users,
    addProject,
    addUser,
    taskModel,
    projectModel,
    userModel,
    commentModel,
  };
}

function makePrismaPlugin(store: ReturnType<typeof makeStore>) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', {
        task: store.taskModel,
        project: store.projectModel,
        user: store.userModel,
        comment: store.commentModel,
      } as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(store: ReturnType<typeof makeStore>) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(makePrismaPlugin(store));
  await app.register(authPlugin);
  await app.register(tasksRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/tasks routes — T2 in-memory store', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET /tasks)', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const r = await app.inject({ method: 'GET', url: '/tasks' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST /tasks)', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { title: 'x', projectId: 'p1' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (PATCH /tasks/:id)', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const r = await app.inject({ method: 'PATCH', url: '/tasks/t1', payload: { title: 'x' } });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (DELETE /tasks/:id)', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const r = await app.inject({ method: 'DELETE', url: '/tasks/t1' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /tasks → 빈 목록 반환', async () => {
    const store = makeStore();
    store.addProject('p1', 'My Project', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
    await app.close();
  });

  it('POST /tasks → 201 생성 후 GET 에 포함', async () => {
    const store = makeStore();
    store.addProject('p1', 'Alpha', ['u1']);
    store.addUser('u2', '김지민');
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const post = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: '배포 준비',
        projectId: 'p1',
        proj: 'Alpha',
        assignee: '김지민',
        priority: 'high',
      },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json() as {
      id: string;
      title: string;
      proj: string;
      assignee: string;
      priority: string;
    };
    expect(created.title).toBe('배포 준비');
    expect(created.proj).toBe('Alpha');
    expect(created.assignee).toBe('김지민');
    expect(created.priority).toBe('high');
    expect(typeof created.id).toBe('string');

    const get = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    const list = get.json() as Array<{ id: string }>;
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(created.id);
    await app.close();
  });

  it('POST /tasks → projectId 와 proj 모두 없으면 400', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '누락 프로젝트' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /tasks → title 누락 시 400', async () => {
    const store = makeStore();
    store.addProject('p1', 'Alpha', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'p1', proj: 'Alpha' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /tasks → 존재하지 않는 프로젝트 → 404', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '태스크', projectId: 'missing', proj: 'NoProject' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /tasks → 프로젝트 멤버가 아니면 403', async () => {
    const store = makeStore();
    store.addProject('p1', 'Private', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u-other');
    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '침입', projectId: 'p1', proj: 'Private' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('GET /tasks?status=todo — 상태 필터', async () => {
    const store = makeStore();
    store.addProject('p1', 'Beta', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Task A', projectId: 'p1', proj: 'Beta' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/tasks?status=todo',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ status: string }>;
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((t) => t.status === 'todo')).toBe(true);
    await app.close();
  });

  it('GET /tasks?status=done — 해당 상태 태스크만 반환', async () => {
    const store = makeStore();
    store.addProject('p1', 'Gamma', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Done Task', projectId: 'p1', proj: 'Gamma' },
    });
    const taskId = (created.json() as { id: string }).id;

    // status: todo 로 시작하므로 done 필터 결과에 없어야 함
    const beforePatch = await app.inject({
      method: 'GET',
      url: '/tasks?status=done',
      headers: { authorization: `Bearer ${token}` },
    });
    expect((beforePatch.json() as unknown[]).length).toBe(0);

    await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'done' },
    });

    const afterPatch = await app.inject({
      method: 'GET',
      url: '/tasks?status=done',
      headers: { authorization: `Bearer ${token}` },
    });
    expect((afterPatch.json() as Array<{ id: string }>).some((t) => t.id === taskId)).toBe(true);
    await app.close();
  });

  it('GET /tasks?projectId=p1 — 프로젝트 필터', async () => {
    const store = makeStore();
    store.addProject('p1', 'ProjectOne', ['u1']);
    store.addProject('p2', 'ProjectTwo', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'P1 Task', projectId: 'p1', proj: 'ProjectOne' },
    });
    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'P2 Task', projectId: 'p2', proj: 'ProjectTwo' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/tasks?projectId=p1',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ proj: string }>;
    expect(list.every((t) => t.proj === 'ProjectOne')).toBe(true);
    await app.close();
  });

  it('GET /tasks — 잘못된 status 쿼리 파라미터 → 400', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/tasks?status=invalid-status',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /tasks/:id → 부분 업데이트 (title)', async () => {
    const store = makeStore();
    store.addProject('p1', 'Proj', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '원래 제목', projectId: 'p1', proj: 'Proj' },
    });
    const taskId = (created.json() as { id: string }).id;

    const patched = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '변경된 제목' },
    });
    expect(patched.statusCode).toBe(200);
    expect((patched.json() as { title: string }).title).toBe('변경된 제목');
    await app.close();
  });

  it('PATCH /tasks/:id → 없는 id 404', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'PATCH',
      url: '/tasks/nonexistent',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'x' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('PATCH /tasks/:id → startDate > endDate 면 400', async () => {
    const store = makeStore();
    store.addProject('p1', 'Proj', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '날짜 태스크', projectId: 'p1', proj: 'Proj' },
    });
    const taskId = (created.json() as { id: string }).id;

    const r = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { startDate: '2026-05-10', endDate: '2026-05-05' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /tasks/:id → progress 업데이트', async () => {
    const store = makeStore();
    store.addProject('p1', 'Proj', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '진행중', projectId: 'p1', proj: 'Proj' },
    });
    const taskId = (created.json() as { id: string }).id;

    const r = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { progress: 60 },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { progress: number }).progress).toBe(60);
    await app.close();
  });

  it('PATCH /tasks/:id → kind=milestone 변경', async () => {
    const store = makeStore();
    store.addProject('p1', 'Proj', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '마일스톤', projectId: 'p1', proj: 'Proj' },
    });
    const taskId = (created.json() as { id: string }).id;

    const r = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: 'milestone', endDate: '2026-06-01' },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { kind: string }).kind).toBe('milestone');
    await app.close();
  });

  it('DELETE /tasks/:id → 204 soft-delete', async () => {
    const store = makeStore();
    store.addProject('p1', 'Proj', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '삭제할 태스크', projectId: 'p1', proj: 'Proj' },
    });
    const taskId = (created.json() as { id: string }).id;

    const del = await app.inject({
      method: 'DELETE',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);

    const storedTask = store.tasks.get(taskId);
    expect(storedTask?.deletedAt).toBeInstanceOf(Date);
    await app.close();
  });

  it('DELETE /tasks/:id → 없는 id 404', async () => {
    const store = makeStore();
    const app = await buildTestApp(store);
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/nonexistent',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('DELETE /tasks/:id → soft-delete 후 GET 에서 제외됨', async () => {
    const store = makeStore();
    store.addProject('p1', 'Proj', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '삭제 후 확인', projectId: 'p1', proj: 'Proj' },
    });
    const taskId = (created.json() as { id: string }).id;

    await app.inject({
      method: 'DELETE',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
    });
    const list = r.json() as Array<{ id: string }>;
    expect(list.find((t) => t.id === taskId)).toBeUndefined();
    await app.close();
  });

  it('응답 태스크 구조 검증 — Task 스키마 필드 포함', async () => {
    const store = makeStore();
    store.addProject('p1', 'SchemaProj', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const post = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: '스키마 태스크',
        projectId: 'p1',
        proj: 'SchemaProj',
        priority: 'low',
        due: '2026-06-30',
      },
    });
    expect(post.statusCode).toBe(201);
    const body = post.json() as Record<string, unknown>;
    expect(typeof body.id).toBe('string');
    expect(body.title).toBe('스키마 태스크');
    expect(body.status).toBe('todo');
    expect(body.proj).toBe('SchemaProj');
    expect(body.assignee).toBe('');
    expect(body.priority).toBe('low');
    expect(body.due).toBe('2026-06-30');
    expect(Array.isArray(body.tags)).toBe(true);
    await app.close();
  });

  it('POST /tasks → proj 이름으로 프로젝트 찾기 (projectId 없이)', async () => {
    const store = makeStore();
    store.addProject('p1', 'NamedProject', ['u1']);
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '이름으로 찾기', proj: 'NamedProject' },
    });
    expect(r.statusCode).toBe(201);
    expect((r.json() as { proj: string }).proj).toBe('NamedProject');
    await app.close();
  });

  it('GET /tasks?assigneeId=u2 — assigneeId 필터', async () => {
    const store = makeStore();
    store.addProject('p1', 'Proj', ['u1']);
    store.addUser('u2', '박서준');
    const app = await buildTestApp(store);
    const token = await makeJws('u1');

    // assigneeId=u2 로 직접 지정해서 생성
    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'u2 태스크',
        projectId: 'p1',
        proj: 'Proj',
        assigneeId: 'u2',
        assignee: '박서준',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '미배정 태스크', projectId: 'p1', proj: 'Proj' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/tasks?assigneeId=u2',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ assignee: string }>;
    expect(list.every((t) => t.assignee === '박서준')).toBe(true);
    await app.close();
  });
});
