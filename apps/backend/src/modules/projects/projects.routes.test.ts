/**
 * projects.routes.test.ts — HTTP 경계 계약 테스트 (buildApp + in-memory prisma 스텁).
 *
 * 대상 경로:
 *   GET    /projects        — 목록, 필터, 인증 없이 401
 *   POST   /projects        — 201 생성, 필수 누락 400, code 중복 409
 *   GET    /projects/:id    — 200, 멤버십 없으면 403, 없으면 404
 *   PATCH  /projects/:id    — 부분 업데이트, owner/admin만 허용
 *
 * 기존 projects.test.ts 의 비즈니스 로직 케이스를 보완하며
 * HTTP 계약(상태코드·응답 필드·직렬화 형식)에 집중한다.
 */
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { projectsRoutes } from './projects.routes.js';

const TEST_AUTH = 'g'.repeat(16) + 'h'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface ProjectPrismaMock {
  project: {
    findMany: (args: AnyArgs) => Promise<unknown[]>;
    findFirst: (args: AnyArgs) => Promise<unknown>;
    create: (args: AnyArgs) => Promise<unknown>;
    update: (args: AnyArgs) => Promise<unknown>;
  };
  task: {
    groupBy: (args: AnyArgs) => Promise<{ projectId: string; _count: { _all: number } }[]>;
  };
  projectMember: {
    findUnique: (args: AnyArgs) => Promise<unknown>;
  };
}

const BASE_PROJECT = {
  id: 'p1',
  name: 'Test Project',
  code: 'TP-1',
  color: '#5B7FFF',
  progress: 0,
  status: 'todo' as const,
  due: null,
  members: [{ userId: 'u1' }],
  _count: { tasks: 0 },
};

function makeEmptyMock(): ProjectPrismaMock {
  return {
    project: {
      findMany: async () => [],
      findFirst: async () => null,
      create: async () => ({}),
      update: async () => ({}),
    },
    task: { groupBy: async () => [] },
    projectMember: { findUnique: async () => null },
  };
}

function stubPlugin(mock: ProjectPrismaMock) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', mock as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(mock: ProjectPrismaMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(stubPlugin(mock));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(projectsRoutes);
  return app;
}

async function makeJws(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('projects.routes — GET /projects', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({ method: 'GET', url: '/projects' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('200 + 배열 응답', async () => {
    const mock = makeEmptyMock();
    mock.project.findMany = async () => [BASE_PROJECT];
    mock.task.groupBy = async () => [{ projectId: 'p1', _count: { _all: 3 } }];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{ id: string; tasks: { total: number; done: number } }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]?.id).toBe('p1');
    expect(body[0]?.tasks.done).toBe(3);
    await app.close();
  });

  it('프로젝트 없으면 빈 배열', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
    await app.close();
  });

  it('?status=todo 필터 통과 — 200', async () => {
    const mock = makeEmptyMock();
    mock.project.findMany = async () => [];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/projects?status=todo',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    await app.close();
  });

  it('?status=invalid_status — 400', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'GET',
      url: '/projects?status=invalid_status',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('due 날짜를 YYYY-MM-DD 문자열로 직렬화', async () => {
    const mock = makeEmptyMock();
    mock.project.findMany = async () => [
      { ...BASE_PROJECT, due: new Date('2026-12-31T00:00:00Z') },
    ];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{ due: string }>;
    expect(body[0]?.due).toBe('2026-12-31');
    await app.close();
  });

  it('due=null인 프로젝트 → due: null', async () => {
    const mock = makeEmptyMock();
    mock.project.findMany = async () => [BASE_PROJECT];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{ due: null }>;
    expect(body[0]?.due).toBeNull();
    await app.close();
  });
});

describe('projects.routes — POST /projects', () => {
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
      url: '/projects',
      payload: { name: 'test', code: 'T1' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('201 + Project 응답', async () => {
    const mock = makeEmptyMock();
    mock.project.create = async () => ({
      ...BASE_PROJECT,
      id: 'p-new',
      name: 'New Project',
      code: 'NP-1',
      members: [{ userId: 'u1' }],
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'New Project', code: 'NP-1' },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { id: string; name: string; code: string; members: string[] };
    expect(body.id).toBe('p-new');
    expect(body.name).toBe('New Project');
    expect(body.code).toBe('NP-1');
    expect(body.members).toContain('u1');
    await app.close();
  });

  it('name 누락 → 400', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { code: 'NP-1' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('code 누락 → 400', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'No Code' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('code 중복 (P2002) → 409 + CONFLICT 코드', async () => {
    const mock = makeEmptyMock();
    mock.project.create = async () => {
      throw { code: 'P2002' };
    };
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'Dup', code: 'TP-1' },
    });
    expect(r.statusCode).toBe(409);
    expect((r.json() as { error: { code: string } }).error.code).toBe('CONFLICT');
    await app.close();
  });

  it('due 날짜 유효 → 201', async () => {
    const mock = makeEmptyMock();
    mock.project.create = async () => ({
      ...BASE_PROJECT,
      id: 'p-due',
      due: new Date('2026-12-31'),
      members: [{ userId: 'u1' }],
    });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'Dated', code: 'DT-1', due: '2026-12-31' },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { due: string };
    expect(body.due).toBe('2026-12-31');
    await app.close();
  });

  it('due 형식 잘못됨 → 400', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'Bad Due', code: 'BD-1', due: 'not-a-date' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('기본 color 적용 (#5B7FFF)', async () => {
    let capturedColor: string | undefined;
    const mock = makeEmptyMock();
    mock.project.create = async (args: AnyArgs) => {
      capturedColor = args.data.color as string;
      return { ...BASE_PROJECT, members: [{ userId: 'u1' }] };
    };
    const app = await buildTestApp(mock);
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'Default Color', code: 'DC-1' },
    });
    expect(capturedColor).toBe('#5B7FFF');
    await app.close();
  });
});

describe('projects.routes — GET /projects/:id', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp(makeEmptyMock());
    const r = await app.inject({ method: 'GET', url: '/projects/p1' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('멤버십 없으면 403', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => null;
    mock.project.findFirst = async () => BASE_PROJECT;
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await makeJws('u-stranger')}` },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('존재하지 않는 id → 404', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'member' });
    mock.project.findFirst = async () => null;
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/projects/no-such',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('200 + Project 형태 반환', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'member' });
    mock.project.findFirst = async () => ({ ...BASE_PROJECT, due: new Date('2026-08-15') });
    mock.task.groupBy = async () => [{ projectId: 'p1', _count: { _all: 2 } }];
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'GET',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await makeJws()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { id: string; tasks: { total: number; done: number }; due: string };
    expect(body.id).toBe('p1');
    expect(body.tasks).toEqual({ total: 0, done: 2 });
    expect(body.due).toBe('2026-08-15');
    await app.close();
  });
});

describe('projects.routes — PATCH /projects/:id', () => {
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
      method: 'PATCH',
      url: '/projects/p1',
      payload: { name: 'Updated' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('member 역할 → 403', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'member' });
    mock.project.findFirst = async () => BASE_PROJECT;
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'Hacked' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('owner 역할 → 200 + 업데이트된 프로젝트', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'owner' });
    mock.project.update = async () => ({ ...BASE_PROJECT, name: 'Renamed' });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'Renamed' },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { name: string }).name).toBe('Renamed');
    await app.close();
  });

  it('admin 역할 → 200', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'admin' });
    mock.project.update = async () => ({ ...BASE_PROJECT, status: 'done' as const });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { status: 'done' },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { status: string }).status).toBe('done');
    await app.close();
  });

  it('잘못된 status 값 → 400', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'owner' });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { status: 'flying' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('존재하지 않는 id (P2025) → 404', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'owner' });
    mock.project.update = async () => {
      throw { code: 'P2025' };
    };
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/no-such',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { name: 'Ghost' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('progress 정수 값 → 200', async () => {
    const mock = makeEmptyMock();
    mock.projectMember.findUnique = async () => ({ role: 'owner' });
    mock.project.update = async () => ({ ...BASE_PROJECT, progress: 75 });
    const app = await buildTestApp(mock);
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await makeJws()}` },
      payload: { progress: 75 },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { progress: number }).progress).toBe(75);
    await app.close();
  });
});
