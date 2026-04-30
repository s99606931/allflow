import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { aiThreadRoutes } from './ai-thread.routes.js';

const TEST_AUTH = 'c'.repeat(16) + 'd'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock
type AnyArgs = any;

function makePrismaStub(overrides: Record<string, unknown> = {}) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', {
        aiThread: {
          findMany: async (_a: AnyArgs) => overrides['aiThread.findMany'] ?? [],
          create: async (_a: AnyArgs) =>
            overrides['aiThread.create'] ?? {
              id: 'th1',
              title: '새 대화',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          findFirst: async (_a: AnyArgs) =>
            'aiThread.findFirst' in overrides
              ? overrides['aiThread.findFirst']
              : { id: 'th1', userId: 'u1' },
          updateMany: async (_a: AnyArgs) => ({ count: 1 }),
        },
        aiMessage: {
          findMany: async (_a: AnyArgs) => overrides['aiMessage.findMany'] ?? [],
        },
        projectMember: { findUnique: async (_a: AnyArgs) => null },
      } as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(overrides: Record<string, unknown> = {}) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(makePrismaStub(overrides));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(aiThreadRoutes);
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/ai/ai-thread.routes', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('GET /ai/threads → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/ai/threads' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /ai/threads → 200 + 배열 반환', async () => {
    const threads = [{ id: 'th1', title: '대화1', createdAt: new Date(), updatedAt: new Date() }];
    const app = await buildTestApp({ 'aiThread.findMany': threads });
    const r = await app.inject({
      method: 'GET',
      url: '/ai/threads',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
    await app.close();
  });

  it('POST /ai/threads → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/ai/threads',
      payload: { title: '테스트 대화' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /ai/threads → 201 + 스레드 생성', async () => {
    const created = {
      id: 'th1',
      title: '테스트 대화',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const app = await buildTestApp({ 'aiThread.create': created });
    const r = await app.inject({
      method: 'POST',
      url: '/ai/threads',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { title: '테스트 대화' },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { id: string };
    expect(body.id).toBe('th1');
    await app.close();
  });

  it('POST /ai/threads → 빈 title 400', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/ai/threads',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { title: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET /ai/threads/:threadId/messages → 스레드 없으면 400', async () => {
    const app = await buildTestApp({ 'aiThread.findFirst': null });
    const r = await app.inject({
      method: 'GET',
      url: '/ai/threads/nonexistent/messages',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET /ai/threads/:threadId/messages → 200 + 메시지 배열', async () => {
    const messages = [
      {
        id: 'm1',
        role: 'user',
        content: '안녕',
        toolCalls: null,
        citations: null,
        model: null,
        createdAt: new Date(),
      },
    ];
    const app = await buildTestApp({ 'aiMessage.findMany': messages });
    const r = await app.inject({
      method: 'GET',
      url: '/ai/threads/th1/messages',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
    await app.close();
  });

  it('DELETE /ai/threads/:threadId → 204', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'DELETE',
      url: '/ai/threads/th1',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(204);
    await app.close();
  });

  it('DELETE /ai/threads/:threadId → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'DELETE',
      url: '/ai/threads/th1',
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });
});
