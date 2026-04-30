import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { mcpConnectionRoutes } from './mcp-connection.routes.js';

const TEST_AUTH = 'e'.repeat(16) + 'f'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock
type AnyArgs = any;

const DEFAULT_CONN = {
  id: 'mcp1',
  name: 'test-mcp',
  transport: 'stdio',
  isEnabled: true,
  createdAt: new Date(),
};

function makePrismaStub(overrides: Record<string, unknown> = {}) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', {
        mcpConnection: {
          findMany: async (_a: AnyArgs) => overrides['mcpConnection.findMany'] ?? [DEFAULT_CONN],
          create: async (_a: AnyArgs) => overrides['mcpConnection.create'] ?? DEFAULT_CONN,
          update: async (_a: AnyArgs) =>
            overrides['mcpConnection.update'] ?? {
              ...DEFAULT_CONN,
              updatedAt: new Date(),
            },
          delete: async (_a: AnyArgs) => DEFAULT_CONN,
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
  await app.register(mcpConnectionRoutes);
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/ai/mcp-connection.routes', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('GET /ai/mcp-connections → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/ai/mcp-connections' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /ai/mcp-connections → 200 + 배열 반환', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'GET',
      url: '/ai/mcp-connections',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
    await app.close();
  });

  it('POST /ai/mcp-connections → 201 + 생성 반환', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/ai/mcp-connections',
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        name: 'test-mcp',
        transport: 'stdio',
        config: { command: 'npx', args: ['mcp-server'] },
        isEnabled: true,
      },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { id: string; name: string };
    expect(body.id).toBe('mcp1');
    await app.close();
  });

  it('POST /ai/mcp-connections → 잘못된 transport 400', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/ai/mcp-connections',
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        name: 'bad',
        transport: 'invalid_transport',
        config: {},
      },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /ai/mcp-connections/:id → isEnabled 토글', async () => {
    const app = await buildTestApp({
      'mcpConnection.update': { ...DEFAULT_CONN, isEnabled: false, updatedAt: new Date() },
    });
    const r = await app.inject({
      method: 'PATCH',
      url: '/ai/mcp-connections/mcp1',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { isEnabled: false },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { isEnabled: boolean };
    expect(body.isEnabled).toBe(false);
    await app.close();
  });

  it('PATCH /ai/mcp-connections/:id → 잘못된 body 400', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'PATCH',
      url: '/ai/mcp-connections/mcp1',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { isEnabled: 'not-a-boolean' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('DELETE /ai/mcp-connections/:id → 204', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'DELETE',
      url: '/ai/mcp-connections/mcp1',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(204);
    await app.close();
  });

  it('DELETE /ai/mcp-connections/:id → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'DELETE',
      url: '/ai/mcp-connections/mcp1',
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });
});
