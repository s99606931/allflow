import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { tasksRoutes } from './tasks.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;
interface PrismaTaskMock {
  task: {
    findMany: (args: AnyArgs) => Promise<unknown[]>;
    findFirst: (args: AnyArgs) => Promise<unknown>;
    create: (args: AnyArgs) => Promise<unknown>;
    update: (args: AnyArgs) => Promise<unknown>;
  };
  project: {
    findFirst: (args: AnyArgs) => Promise<unknown>;
  };
  user: {
    findFirst: (args: AnyArgs) => Promise<unknown>;
  };
  projectMember: {
    findUnique: (args: AnyArgs) => Promise<unknown>;
  };
  comment?: {
    updateMany: (args: AnyArgs) => Promise<{ count: number }>;
  };
}

function makePrismaStubPlugin(prismaMock: PrismaTaskMock) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', prismaMock as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(prismaMock: PrismaTaskMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(makePrismaStubPlugin(prismaMock));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(tasksRoutes);
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

const SAMPLE_TASK = {
  id: 't1',
  title: 'Refactor auth module',
  status: 'doing' as const,
  due: '오늘',
  priority: 'high' as const,
  tags: ['auth'],
  project: { name: 'ALL-Flow' },
  assignee: { name: '김지민' },
};

describe('modules/tasks', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('GET /tasks → 멤버십 프로젝트 태스크 목록 반환', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [SAMPLE_TASK],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/tasks?status=doing',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{ proj: string; assignee: string; status: string }>;
    expect(body).toHaveLength(1);
    expect(body[0]?.proj).toBe('ALL-Flow');
    expect(body[0]?.assignee).toBe('김지민');
    await app.close();
  });

  it('POST /tasks → projectId + 멤버일 때 201', async () => {
    let createdData: Record<string, unknown> = {};
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async (args: AnyArgs) => {
          createdData = args.data as Record<string, unknown>;
          return { ...SAMPLE_TASK, id: 't-new' };
        },
        update: async () => ({}),
      },
      project: {
        findFirst: async () => ({
          id: 'p1',
          members: [{ userId: 'u1' }],
        }),
      },
      user: { findFirst: async () => ({ id: 'u-assignee' }) },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { title: 'New task', projectId: 'p1', proj: 'ALL-Flow', assignee: '김지민' },
    });
    expect(r.statusCode).toBe(201);
    expect(createdData.projectId).toBe('p1');
    expect(createdData.assigneeId).toBe('u-assignee');
    expect(createdData.createdById).toBe('u1');
    await app.close();
  });

  it('POST /tasks → 멤버가 아니면 403', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      project: {
        findFirst: async () => ({ id: 'p1', members: [] }),
      },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${await token('u-other')}` },
      payload: { title: 'X', projectId: 'p1', proj: 'X', assignee: 'X' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('POST /tasks → projectId/proj 모두 누락 시 400', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { title: 'Missing project', assignee: 'X' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /tasks/:id → 상태 변경 + 멤버십 통과', async () => {
    let updatedData: Record<string, unknown> = {};
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          projectId: 'p1',
          project: { members: [{ userId: 'u1' }] },
        }),
        create: async () => ({}),
        update: async (args: AnyArgs) => {
          updatedData = args.data as Record<string, unknown>;
          return { ...SAMPLE_TASK, status: 'done' as const };
        },
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'PATCH',
      url: '/tasks/t1',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { status: 'done' },
    });
    expect(r.statusCode).toBe(200);
    expect(updatedData.status).toBe('done');
    expect((r.json() as { status: string }).status).toBe('done');
    await app.close();
  });

  it('PATCH /tasks/:id → 멤버 아니면 403', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          projectId: 'p1',
          project: { members: [] },
        }),
        create: async () => ({}),
        update: async () => ({}),
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'PATCH',
      url: '/tasks/t1',
      headers: { authorization: `Bearer ${await token('u-other')}` },
      payload: { title: 'changed' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('PATCH /tasks/:id → 없는 태스크는 404', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'PATCH',
      url: '/tasks/missing',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { title: 'x' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('DELETE /tasks/:id → 인증 없으면 401', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({ method: 'DELETE', url: '/tasks/t1' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('DELETE /tasks/:id → 정상: 204 + task soft-delete + comment cascade', async () => {
    const taskUpdates: { where: AnyArgs; data: AnyArgs }[] = [];
    const commentUpdateMany: { where: AnyArgs; data: AnyArgs }[] = [];
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          project: { members: [{ userId: 'u1' }] },
        }),
        create: async () => ({}),
        update: async (args: AnyArgs) => {
          taskUpdates.push(args);
          return { id: 't1' };
        },
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
      comment: {
        updateMany: async (args: AnyArgs) => {
          commentUpdateMany.push(args);
          return { count: 3 };
        },
      },
    });

    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/t1',
      headers: { authorization: `Bearer ${await token('u1')}` },
    });
    expect(r.statusCode).toBe(204);
    expect(taskUpdates).toHaveLength(1);
    const taskCall = taskUpdates[0];
    if (!taskCall) throw new Error('task.update was not called');
    expect(taskCall).toMatchObject({ where: { id: 't1' } });
    expect(taskCall.data.deletedAt).toBeInstanceOf(Date);
    expect(commentUpdateMany).toHaveLength(1);
    const commentCall = commentUpdateMany[0];
    if (!commentCall) throw new Error('comment.updateMany was not called');
    expect(commentCall).toMatchObject({ where: { taskId: 't1', deletedAt: null } });
    expect(commentCall.data.deletedAt).toBeInstanceOf(Date);
    await app.close();
  });

  it('DELETE /tasks/:id → 멤버 아니면 403', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          project: { members: [] },
        }),
        create: async () => ({}),
        update: async () => ({}),
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
      comment: { updateMany: async () => ({ count: 0 }) },
    });

    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/t1',
      headers: { authorization: `Bearer ${await token('u-other')}` },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('DELETE /tasks/:id → 없거나 이미 삭제된 태스크는 404', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      project: { findFirst: async () => null },
      user: { findFirst: async () => null },
      projectMember: { findUnique: async () => null },
      comment: { updateMany: async () => ({ count: 0 }) },
    });

    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/missing',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});
