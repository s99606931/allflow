import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { commentsRoutes } from './comments.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;
interface PrismaCommentMock {
  task: { findFirst: (args: AnyArgs) => Promise<unknown> };
  issue: { findFirst: (args: AnyArgs) => Promise<unknown> };
  comment: {
    findMany: (args: AnyArgs) => Promise<unknown[]>;
    create: (args: AnyArgs) => Promise<unknown>;
  };
  projectMember: { findUnique: (args: AnyArgs) => Promise<unknown> };
}

function makePrismaStubPlugin(prismaMock: PrismaCommentMock) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', prismaMock as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(prismaMock: PrismaCommentMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(makePrismaStubPlugin(prismaMock));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(commentsRoutes);
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

const SAMPLE_COMMENT = {
  id: 'c1',
  body: 'LGTM',
  createdAt: new Date('2026-04-28T10:00:00Z'),
  author: { id: 'u1', name: '김지민' },
};

describe('modules/comments', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('GET /tasks/:id/comments → 멤버는 200 + 목록', async () => {
    const app = await buildTestApp({
      task: {
        findFirst: async () => ({ project: { members: [{ userId: 'u1' }] } }),
      },
      issue: { findFirst: async () => null },
      comment: {
        findMany: async () => [SAMPLE_COMMENT],
        create: async () => ({}),
      },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{ id: string; author: { name: string } }>;
    expect(body[0]?.author.name).toBe('김지민');
    await app.close();
  });

  it('GET /tasks/:id/comments → 멤버 아니면 403', async () => {
    const app = await buildTestApp({
      task: { findFirst: async () => ({ project: { members: [] } }) },
      issue: { findFirst: async () => null },
      comment: { findMany: async () => [], create: async () => ({}) },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${await token('u-other')}` },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('POST /tasks/:id/comments → 201 + targetKind=task 저장', async () => {
    let createdData: Record<string, unknown> = {};
    const app = await buildTestApp({
      task: { findFirst: async () => ({ project: { members: [{ userId: 'u1' }] } }) },
      issue: { findFirst: async () => null },
      comment: {
        findMany: async () => [],
        create: async (args: AnyArgs) => {
          createdData = args.data as Record<string, unknown>;
          return SAMPLE_COMMENT;
        },
      },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { body: 'great work' },
    });
    expect(r.statusCode).toBe(201);
    expect(createdData.targetKind).toBe('task');
    expect(createdData.taskId).toBe('t1');
    expect(createdData.authorId).toBe('u1');
    await app.close();
  });

  it('POST /issues/:id/comments → 201 + targetKind=issue', async () => {
    let createdData: Record<string, unknown> = {};
    const app = await buildTestApp({
      task: { findFirst: async () => null },
      issue: { findFirst: async () => ({ project: { members: [{ userId: 'u1' }] } }) },
      comment: {
        findMany: async () => [],
        create: async (args: AnyArgs) => {
          createdData = args.data as Record<string, unknown>;
          return SAMPLE_COMMENT;
        },
      },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/comments',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { body: 'reproduced on staging' },
    });
    expect(r.statusCode).toBe(201);
    expect(createdData.targetKind).toBe('issue');
    expect(createdData.issueId).toBe('i1');
    await app.close();
  });

  it('POST /tasks/:id/comments → 빈 body는 400', async () => {
    const app = await buildTestApp({
      task: { findFirst: async () => ({ project: { members: [{ userId: 'u1' }] } }) },
      issue: { findFirst: async () => null },
      comment: { findMany: async () => [], create: async () => SAMPLE_COMMENT },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { body: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /issues/:id/comments → 존재 안하는 이슈는 404', async () => {
    const app = await buildTestApp({
      task: { findFirst: async () => null },
      issue: { findFirst: async () => null },
      comment: { findMany: async () => [], create: async () => SAMPLE_COMMENT },
      projectMember: { findUnique: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i-missing/comments',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { body: 'hi' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});
