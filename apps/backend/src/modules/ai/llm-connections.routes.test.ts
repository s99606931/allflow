import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import type { DbBackedAIRegistry } from './db-backed-registry.js';
import { llmConnectionsRoutes } from './llm-connections.routes.js';

const TEST_AUTH = 'l'.repeat(16) + 'm'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: mock
type AnyArgs = any;

interface LlmRow {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  model: string;
  apiKey: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function makeStore() {
  const rows = new Map<string, LlmRow>();
  let seq = 0;

  return {
    rows,
    llmConnection: {
      findMany: async (args: AnyArgs): Promise<LlmRow[]> => {
        const list = Array.from(rows.values());
        if (args?.orderBy) {
          list.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
        }
        return list;
      },
      findUnique: async (args: AnyArgs): Promise<LlmRow | null> =>
        rows.get(args?.where?.id as string) ?? null,
      findUniqueOrThrow: async (args: AnyArgs): Promise<LlmRow> => {
        const r = rows.get(args?.where?.id as string);
        if (!r) throw new Error('Not found');
        return r;
      },
      create: async (args: AnyArgs): Promise<LlmRow> => {
        seq += 1;
        const now = new Date();
        const row: LlmRow = {
          id: `lc-${seq}`,
          name: args.data.name as string,
          kind: args.data.kind as string,
          baseUrl: args.data.baseUrl as string,
          model: args.data.model as string,
          apiKey: (args.data.apiKey as string | null) ?? null,
          isActive: (args.data.isActive as boolean) ?? false,
          isDefault: (args.data.isDefault as boolean) ?? false,
          createdAt: now,
          updatedAt: now,
        };
        rows.set(row.id, row);
        return row;
      },
      update: async (args: AnyArgs): Promise<LlmRow> => {
        const row = rows.get(args?.where?.id as string);
        if (!row) throw new Error('Not found');
        Object.assign(row, args.data, { updatedAt: new Date() });
        return row;
      },
      updateMany: async (args: AnyArgs): Promise<void> => {
        for (const r of rows.values()) {
          if (args?.where?.isActive && r.isActive) {
            r.isActive = (args.data as { isActive: boolean }).isActive;
          }
        }
      },
      delete: async (args: AnyArgs): Promise<void> => {
        rows.delete(args?.where?.id as string);
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  const mockRegistry = { invalidate: vi.fn(async () => {}) } as unknown as DbBackedAIRegistry;

  await app.register(
    fp(
      async (fastify: FastifyInstance) => {
        fastify.decorate('prisma', store as never);
      },
      { name: 'prisma' },
    ),
  );
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(llmConnectionsRoutes, { registry: mockRegistry });
  return { app, mockRegistry };
}

async function makeToken(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/ai/llm-connections.routes', () => {
  let app: FastifyInstance;
  let token: string;
  let mockRegistry: { invalidate: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_AUTH;
    const built = await buildTestApp();
    app = built.app;
    mockRegistry = built.mockRegistry as { invalidate: ReturnType<typeof vi.fn> };
    token = await makeToken('u1');
  });

  afterAll(async () => {
    await app.close();
    resetEnvForTests();
  });

  it('GET /llm-connections → 200 empty initially', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/llm-connections',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
  });

  it('POST /llm-connections → 201 creates connection', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/llm-connections',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'LMStudio Local',
        kind: 'lmstudio',
        baseUrl: 'http://localhost:1234',
        model: 'gemma-4b',
      },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { id: string; name: string; isActive: boolean };
    expect(body.name).toBe('LMStudio Local');
    expect(body.isActive).toBe(false);
    expect(mockRegistry.invalidate).toHaveBeenCalledTimes(1);
  });

  it('POST /llm-connections invalid body → 400', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/llm-connections',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '', kind: 'ollama', baseUrl: 'not-a-url', model: 'm' },
    });
    expect(r.statusCode).toBe(400);
  });

  it('PATCH /llm-connections/:id → 200 updates fields', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/llm-connections',
      headers: { authorization: `Bearer ${token}` },
    });
    const [first] = list.json() as { id: string }[];
    const id = first!.id;

    const r = await app.inject({
      method: 'PATCH',
      url: `/llm-connections/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { model: 'gemma-8b' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { model: string };
    expect(body.model).toBe('gemma-8b');
  });

  it('PATCH /llm-connections/nonexistent → 404', async () => {
    const r = await app.inject({
      method: 'PATCH',
      url: '/llm-connections/nonexistent',
      headers: { authorization: `Bearer ${token}` },
      payload: { model: 'x' },
    });
    expect(r.statusCode).toBe(404);
  });

  it('POST /llm-connections/:id/activate → 200 sets isActive', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/llm-connections',
      headers: { authorization: `Bearer ${token}` },
    });
    const [first] = list.json() as { id: string }[];
    const id = first!.id;

    const r = await app.inject({
      method: 'POST',
      url: `/llm-connections/${id}/activate`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { isActive: boolean };
    expect(body.isActive).toBe(true);
  });

  it('DELETE /llm-connections/:id that is default → 403', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/llm-connections',
      headers: { authorization: `Bearer ${token}` },
    });
    const [conn] = (list.json() as Array<{ id: string; isDefault: boolean; isActive: boolean }>);
    // Manually patch to isDefault for this test
    const r2 = await app.inject({
      method: 'PATCH',
      url: `/llm-connections/${conn!.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { isDefault: true, isActive: false, name: conn!.id, kind: 'lmstudio', baseUrl: 'http://localhost:1234', model: 'g' },
    });
    expect(r2.statusCode).toBe(200);

    const del = await app.inject({
      method: 'DELETE',
      url: `/llm-connections/${conn!.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(403);
  });

  it('GET without auth → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/llm-connections' });
    expect(r.statusCode).toBe(401);
  });
});
