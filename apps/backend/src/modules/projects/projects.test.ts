import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { projectsRoutes } from './projects.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;
interface PrismaProjectMock {
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

function makePrismaStubPlugin(prismaMock: PrismaProjectMock) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', prismaMock as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(prismaMock: PrismaProjectMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(makePrismaStubPlugin(prismaMock));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(projectsRoutes);
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

const SAMPLE_PROJECT = {
  id: 'p1',
  name: 'ALL-Flow',
  code: 'AF-1',
  color: '#5B7FFF',
  progress: 40,
  status: 'doing' as const,
  due: new Date('2026-12-31'),
  members: [{ userId: 'u1' }, { userId: 'u2' }],
  _count: { tasks: 10 },
};

describe('modules/projects', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('GET /projects → 인증 사용자 멤버십 프로젝트만 반환 + tasks 집계', async () => {
    const app = await buildTestApp({
      project: {
        findMany: async () => [SAMPLE_PROJECT],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      },
      task: { groupBy: async () => [{ projectId: 'p1', _count: { _all: 4 } }] },
      projectMember: { findUnique: async () => null },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{
      id: string;
      tasks: { total: number; done: number };
      due: string;
    }>;
    expect(body).toHaveLength(1);
    expect(body[0]?.tasks).toEqual({ total: 10, done: 4 });
    expect(body[0]?.due).toBe('2026-12-31');
    await app.close();
  });

  it('POST /projects → 201 + Project 응답 + 본인 owner 등록', async () => {
    let createdData: Record<string, unknown> = {};
    const app = await buildTestApp({
      project: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async (args: AnyArgs) => {
          createdData = args.data as Record<string, unknown>;
          return {
            ...SAMPLE_PROJECT,
            id: 'p-new',
            code: 'AF-NEW',
            _count: { tasks: 0 },
            members: [{ userId: 'u1' }],
          };
        },
        update: async () => ({}),
      },
      task: { groupBy: async () => [] },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { name: 'New', code: 'AF-NEW' },
    });
    expect(r.statusCode).toBe(201);
    expect((createdData.members as { create: { role: string } }).create.role).toBe('owner');
    await app.close();
  });

  it('POST /projects → code 중복 (P2002) 시 409 CONFLICT', async () => {
    const app = await buildTestApp({
      project: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => {
          throw { code: 'P2002' };
        },
        update: async () => ({}),
      },
      task: { groupBy: async () => [] },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { name: 'Dup', code: 'AF-1' },
    });
    expect(r.statusCode).toBe(409);
    expect((r.json() as { error: { code: string } }).error.code).toBe('CONFLICT');
    await app.close();
  });

  it('GET /projects/:id → 멤버십 없으면 403', async () => {
    const app = await buildTestApp({
      project: {
        findMany: async () => [],
        findFirst: async () => SAMPLE_PROJECT,
        create: async () => ({}),
        update: async () => ({}),
      },
      task: { groupBy: async () => [] },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await token('u-other')}` },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('PATCH /projects/:id → member 권한으로 호출 시 403', async () => {
    const app = await buildTestApp({
      project: {
        findMany: async () => [],
        findFirst: async () => SAMPLE_PROJECT,
        create: async () => ({}),
        update: async () => ({}),
      },
      task: { groupBy: async () => [] },
      projectMember: { findUnique: async () => ({ role: 'member' }) },
    });
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { name: 'Renamed' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('PATCH /projects/:id → admin/owner 권한으로 정상 업데이트', async () => {
    const app = await buildTestApp({
      project: {
        findMany: async () => [],
        findFirst: async () => SAMPLE_PROJECT,
        create: async () => ({}),
        update: async () => ({ ...SAMPLE_PROJECT, name: 'Renamed' }),
      },
      task: { groupBy: async () => [] },
      projectMember: { findUnique: async () => ({ role: 'admin' }) },
    });
    const r = await app.inject({
      method: 'PATCH',
      url: '/projects/p1',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { name: 'Renamed' },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { name: string }).name).toBe('Renamed');
    await app.close();
  });
});
