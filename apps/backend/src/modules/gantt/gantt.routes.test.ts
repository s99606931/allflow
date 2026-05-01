/**
 * gantt.routes.test.ts — HTTP 경계 계약 테스트 (buildApp + in-memory prisma 스텁).
 *
 * 대상 경로:
 *   GET  /gantt             — 인증·쿼리 검증·응답 형태
 *   GET  /gantt/by-assignee — 담당자 그룹 응답
 *   GET  /tasks/:id/dependencies  — 의존성 목록
 *   POST /tasks/:id/dependencies  — 의존성 생성
 *   DELETE /tasks/:id/dependencies/:depId — 삭제
 *
 * 기존 gantt.test.ts 의 비즈니스 로직 케이스를 보완하며
 * HTTP 계약(상태코드·헤더·응답 형태)에 집중한다.
 */
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { ganttRoutes } from './gantt.routes.js';

const TEST_AUTH = 'e'.repeat(16) + 'f'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface GanttPrismaMock {
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

function noop() {
  return Promise.resolve({});
}

function makeEmptyMock(): GanttPrismaMock {
  return {
    task: { findMany: async () => [], findFirst: async () => null },
    taskDependency: {
      findMany: async () => [],
      findUnique: async () => null,
      create: noop,
      delete: noop,
    },
  };
}

function stubPlugin(mock: GanttPrismaMock) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', mock as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(mock: GanttPrismaMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(stubPlugin(mock));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(ganttRoutes);
  return app;
}

async function makeJws(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('gantt.routes — GET /gantt', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({ method: 'GET', url: '/gantt' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('200 + tasks/dependencies 배열 포함', async () => {
    const mock = makeEmptyMock();
    mock.task.findMany = async () => [
      {
        id: 'task-1',
        title: 'Route test task',
        status: 'doing',
        priority: 'high',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-10'),
        progress: 50,
        kind: 'task',
        assigneeId: 'u1',
        projectId: 'p1',
        project: { color: '#aabbcc' },
      },
    ];
    mock.taskDependency.findMany = async () => [];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/gantt',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { tasks: unknown[]; dependencies: unknown[] };
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(Array.isArray(body.dependencies)).toBe(true);
    expect(body.tasks).toHaveLength(1);
    await app.close();
  });

  it('projectId 쿼리 필터 — 200', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/gantt?projectId=p1',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    await app.close();
  });

  it('from 날짜 형식 올바름 + to 함께 — 200 + range 포함', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/gantt?from=2026-05-01&to=2026-05-31',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { range?: { from: string; to: string } };
    expect(body.range).toEqual({ from: '2026-05-01', to: '2026-05-31' });
    await app.close();
  });

  it('from 형식 잘못됨 → 400', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/gantt?from=not-a-date',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('to 형식 잘못됨 → 400', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/gantt?to=2026/05/31',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('태스크 날짜를 YYYY-MM-DD 문자열로 직렬화', async () => {
    const mock = makeEmptyMock();
    mock.task.findMany = async () => [
      {
        id: 't-date',
        title: 'date check',
        status: 'todo',
        priority: 'low',
        startDate: new Date('2026-06-15T00:00:00Z'),
        endDate: new Date('2026-06-20T00:00:00Z'),
        progress: 0,
        kind: 'task',
        assigneeId: null,
        projectId: 'p1',
        project: { color: '#000000' },
      },
    ];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/gantt',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { tasks: Array<{ startDate: string; endDate: string }> };
    expect(body.tasks[0]?.startDate).toBe('2026-06-15');
    expect(body.tasks[0]?.endDate).toBe('2026-06-20');
    await app.close();
  });

  it('milestone의 startDate=null 유지', async () => {
    const mock = makeEmptyMock();
    mock.task.findMany = async () => [
      {
        id: 'm1',
        title: 'Milestone',
        status: 'todo',
        priority: 'high',
        startDate: null,
        endDate: new Date('2026-07-01'),
        progress: 0,
        kind: 'milestone',
        assigneeId: null,
        projectId: 'p1',
        project: { color: '#ff0000' },
      },
    ];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/gantt',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { tasks: Array<{ kind: string; startDate: null }> };
    expect(body.tasks[0]?.kind).toBe('milestone');
    expect(body.tasks[0]?.startDate).toBeNull();
    await app.close();
  });
});

describe('gantt.routes — GET /gantt/by-assignee', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({ method: 'GET', url: '/gantt/by-assignee' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('200 + groups 배열', async () => {
    const mock = makeEmptyMock();
    mock.task.findMany = async () => [
      {
        id: 't1',
        title: 'A',
        status: 'doing',
        priority: 'high',
        startDate: null,
        endDate: null,
        progress: 0,
        kind: 'task',
        assigneeId: 'u1',
        projectId: 'p1',
        project: { color: '#123456' },
        assignee: { id: 'u1', name: '김철수' },
      },
    ];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/gantt/by-assignee',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { groups: Array<{ assigneeId: string; tasks: unknown[] }> };
    expect(Array.isArray(body.groups)).toBe(true);
    expect(body.groups).toHaveLength(1);
    expect(body.groups[0]?.assigneeId).toBe('u1');
    await app.close();
  });

  it('태스크 없으면 groups 빈 배열', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/gantt/by-assignee',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { groups: unknown[] };
    expect(body.groups).toHaveLength(0);
    await app.close();
  });
});

describe('gantt.routes — GET /tasks/:id/dependencies', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({ method: 'GET', url: '/tasks/t1/dependencies' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('존재하지 않는 태스크 → 404', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/tasks/no-such-task/dependencies',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('멤버 아닌 태스크 → 403', async () => {
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 't1',
      project: { members: [] },
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await makeJws('u-other')}` },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('200 + predecessors/successors 구조', async () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 't1',
      project: { members: [{ userId: 'u1' }] },
    });
    mock.taskDependency.findMany = async (args: AnyArgs) => {
      if (args?.where?.successorId === 't1') {
        return [{ id: 'dep-pre', predecessorId: 't0', successorId: 't1', type: 'FS', lagDays: 0, createdAt: now }];
      }
      return [{ id: 'dep-suc', predecessorId: 't1', successorId: 't2', type: 'SS', lagDays: 1, createdAt: now }];
    };
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      predecessors: Array<{ id: string }>;
      successors: Array<{ id: string }>;
    };
    expect(body.predecessors).toHaveLength(1);
    expect(body.successors).toHaveLength(1);
    expect(body.predecessors[0]?.id).toBe('dep-pre');
    expect(body.successors[0]?.id).toBe('dep-suc');
    await app.close();
  });
});

describe('gantt.routes — POST /tasks/:id/dependencies', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      payload: { successorId: 't2' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('successorId 누락 시 400', async () => {
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 't1',
      project: { members: [{ userId: 'u1' }] },
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: {},
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('유효하지 않은 type → 400', async () => {
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 't1',
      project: { members: [{ userId: 'u1' }] },
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { successorId: 't2', type: 'INVALID' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('정상 생성 → 201 + 의존성 객체', async () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 'tx',
      project: { members: [{ userId: 'u1' }] },
    });
    mock.taskDependency.create = async () => ({
      id: 'dep-new',
      predecessorId: 't1',
      successorId: 't2',
      type: 'SS',
      lagDays: 2,
      createdAt: now,
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { successorId: 't2', type: 'SS', lagDays: 2 },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { id: string; type: string; lagDays: number };
    expect(body.id).toBe('dep-new');
    expect(body.type).toBe('SS');
    expect(body.lagDays).toBe(2);
    await app.close();
  });

  it('자기 참조 → 422 사이클', async () => {
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 't1',
      project: { members: [{ userId: 'u1' }] },
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/dependencies',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { successorId: 't1' },
    });
    expect(r.statusCode).toBe(422);
    await app.close();
  });
});

describe('gantt.routes — DELETE /tasks/:id/dependencies/:depId', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({ method: 'DELETE', url: '/tasks/t1/dependencies/dep1' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('없는 dep → 404', async () => {
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 't1',
      project: { members: [{ userId: 'u1' }] },
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/t1/dependencies/no-dep',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('정상 삭제 → 204 + 빈 본문', async () => {
    const mock = makeEmptyMock();
    mock.task.findFirst = async () => ({
      id: 't1',
      project: { members: [{ userId: 'u1' }] },
    });
    mock.taskDependency.findUnique = async () => ({
      id: 'dep1',
      predecessorId: 't1',
      successorId: 't2',
      type: 'FS',
      lagDays: 0,
    });
    let deleteCalled = false;
    mock.taskDependency.delete = async () => {
      deleteCalled = true;
      return {};
    };
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'DELETE',
      url: '/tasks/t1/dependencies/dep1',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(204);
    expect(deleteCalled).toBe(true);
    await app.close();
  });
});
