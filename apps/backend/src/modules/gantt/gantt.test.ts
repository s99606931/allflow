import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { ganttRoutes } from './gantt.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface PrismaGanttMock {
  task: {
    findMany: (args: AnyArgs) => Promise<unknown[]>;
    findFirst: (args: AnyArgs) => Promise<unknown>;
  };
  taskDependency: {
    findMany: (args: AnyArgs) => Promise<unknown[]>;
    findUnique: (args: AnyArgs) => Promise<unknown>;
    create: (args: AnyArgs) => Promise<unknown>;
    delete: (args: AnyArgs) => Promise<unknown>;
  };
}

function makePrismaStub(mock: PrismaGanttMock) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', mock as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(mock: PrismaGanttMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(makePrismaStub(mock));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(ganttRoutes);
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
  title: 'Gantt task A',
  status: 'doing' as const,
  priority: 'high' as const,
  startDate: new Date('2026-04-30'),
  endDate: new Date('2026-05-05'),
  progress: 25,
  kind: 'task' as const,
  assigneeId: 'u1',
  projectId: 'p1',
  project: { color: '#5B6CFF' },
};

const SAMPLE_MILESTONE = {
  id: 't2',
  title: 'Beta Launch',
  status: 'todo' as const,
  priority: 'high' as const,
  startDate: null,
  endDate: new Date('2026-05-15'),
  progress: 0,
  kind: 'milestone' as const,
  assigneeId: null,
  projectId: 'p1',
  project: { color: '#5B6CFF' },
};

describe('modules/gantt — GET /gantt', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 사용자 멤버십 프로젝트의 태스크 + 의존성 반환', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [SAMPLE_TASK, SAMPLE_MILESTONE],
        findFirst: async () => null,
      },
      taskDependency: {
        findMany: async () => [
          {
            id: 'dep1',
            predecessorId: 't1',
            successorId: 't2',
            type: 'FS',
            lagDays: 0,
            createdAt: new Date('2026-04-30T00:00:00Z'),
          },
        ],
        findUnique: async () => null,
        create: async () => ({}),
        delete: async () => ({}),
      },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/gantt',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      tasks: Array<{ id: string; kind: string; startDate: string | null; endDate: string | null }>;
      dependencies: Array<{ id: string; type: string }>;
    };
    expect(body.tasks).toHaveLength(2);
    expect(body.tasks[0]?.startDate).toBe('2026-04-30');
    expect(body.tasks[0]?.endDate).toBe('2026-05-05');
    expect(body.tasks[1]?.kind).toBe('milestone');
    expect(body.tasks[1]?.startDate).toBeNull();
    expect(body.dependencies).toHaveLength(1);
    expect(body.dependencies[0]?.type).toBe('FS');
    await app.close();
  });

  it('인증 누락 시 401', async () => {
    const app = await buildTestApp({
      task: { findMany: async () => [], findFirst: async () => null },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        delete: async () => ({}),
      },
    });
    const r = await app.inject({ method: 'GET', url: '/gantt' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('잘못된 from 형식 → 400', async () => {
    const app = await buildTestApp({
      task: { findMany: async () => [], findFirst: async () => null },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        delete: async () => ({}),
      },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/gantt?from=invalid',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});

describe('modules/gantt — GET /gantt/by-assignee', () => {
  it('담당자별로 그룹핑하여 반환', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [
          { ...SAMPLE_TASK, assignee: { id: 'u1', name: '김민지' } },
          { ...SAMPLE_TASK, id: 't3', assigneeId: 'u2', assignee: { id: 'u2', name: '이도현' } },
          { ...SAMPLE_MILESTONE, assignee: null },
        ],
        findFirst: async () => null,
      },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        delete: async () => ({}),
      },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/gantt/by-assignee',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { groups: Array<{ assigneeId: string | null; tasks: unknown[] }> };
    expect(body.groups).toHaveLength(3);
    await app.close();
  });
});

describe('modules/gantt — POST /tasks/:id/dependencies', () => {
  it('정상 의존성 생성 → 201', async () => {
    let createdData: Record<string, unknown> = {};
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          project: { members: [{ userId: 'u1' }] },
        }),
      },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async (args: AnyArgs) => {
          createdData = args.data as Record<string, unknown>;
          return {
            id: 'dep-new',
            predecessorId: 't1',
            successorId: 't2',
            type: 'FS',
            lagDays: 0,
            createdAt: new Date('2026-04-30T00:00:00Z'),
          };
        },
        delete: async () => ({}),
      },
    });

    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { successorId: 't2', type: 'FS' },
    });
    expect(r.statusCode).toBe(201);
    expect(createdData.predecessorId).toBe('t1');
    expect(createdData.successorId).toBe('t2');
    expect(createdData.type).toBe('FS');
    await app.close();
  });

  it('자기 참조 의존성 → 422 사이클', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          project: { members: [{ userId: 'u1' }] },
        }),
      },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        delete: async () => ({}),
      },
    });

    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { successorId: 't1' },
    });
    expect(r.statusCode).toBe(422);
    await app.close();
  });

  it('멤버 아닌 프로젝트의 태스크 → 403', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({ id: 't1', project: { members: [] } }),
      },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        delete: async () => ({}),
      },
    });

    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await token('u-other')}` },
      payload: { successorId: 't2' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });
});

describe('modules/gantt — DELETE /tasks/:id/dependencies/:depId', () => {
  it('정상 삭제 → 204', async () => {
    let deleted = false;
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          project: { members: [{ userId: 'u1' }] },
        }),
      },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => ({
          id: 'dep1',
          predecessorId: 't1',
          successorId: 't2',
          type: 'FS',
          lagDays: 0,
        }),
        create: async () => ({}),
        delete: async () => {
          deleted = true;
          return {};
        },
      },
    });

    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/t1/dependencies/dep1',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(204);
    expect(deleted).toBe(true);
    await app.close();
  });

  it('존재하지 않는 dep → 404', async () => {
    const app = await buildTestApp({
      task: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 't1',
          project: { members: [{ userId: 'u1' }] },
        }),
      },
      taskDependency: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        delete: async () => ({}),
      },
    });

    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/t1/dependencies/dep-missing',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});
