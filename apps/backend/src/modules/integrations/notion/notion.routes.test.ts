import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../../app.js';
import { resetEnvForTests } from '../../../config/env.js';
import { authPlugin } from '../../../plugins/auth.js';
import { rbacPlugin } from '../../../plugins/rbac.js';
import { notionRoutes } from './notion.routes.js';

const TEST_AUTH = 'n'.repeat(16) + 'o'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: mock
type AnyArgs = any;

interface NotionRow {
  id: string;
  workspaceId: string;
  workspaceName: string;
  accessToken: string;
  botId: string;
  createdById: string;
  createdAt: Date;
}

function makeStore() {
  const conns = new Map<string, NotionRow>();
  let seq = 0;

  return {
    notionConnection: {
      findMany: async (args: AnyArgs): Promise<Partial<NotionRow>[]> => {
        return Array.from(conns.values())
          .filter((r) => r.createdById === args?.where?.createdById)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(({ id, workspaceName, createdAt }) => ({ id, workspaceName, createdAt }));
      },
      findUnique: async (args: AnyArgs): Promise<NotionRow | null> => {
        for (const r of conns.values()) {
          if (r.workspaceId === args?.where?.workspaceId) return r;
          if (r.id === args?.where?.id) return r;
        }
        return null;
      },
      findFirst: async (args: AnyArgs): Promise<NotionRow | null> => {
        for (const r of conns.values()) {
          if (r.id === args?.where?.id && r.createdById === args?.where?.createdById) return r;
        }
        return null;
      },
      create: async (args: AnyArgs): Promise<NotionRow> => {
        seq += 1;
        const row: NotionRow = {
          id: `nc-${seq}`,
          workspaceId: args.data.workspaceId as string,
          workspaceName: args.data.workspaceName as string,
          accessToken: args.data.accessToken as string,
          botId: args.data.botId as string,
          createdById: args.data.createdById as string,
          createdAt: new Date(),
        };
        conns.set(row.id, row);
        return row;
      },
      delete: async (args: AnyArgs): Promise<void> => {
        conns.delete(args?.where?.id as string);
      },
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();

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
  await app.register(notionRoutes);
  return app;
}

async function makeToken(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/integrations/notion/notion.routes', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_AUTH;
    app = await buildTestApp();
    token = await makeToken('u1');
  });

  afterAll(async () => {
    await app.close();
    resetEnvForTests();
  });

  it('GET /integrations/notion/connections → 200 empty array initially', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/integrations/notion/connections',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
  });

  it('POST /integrations/notion/connect → 201 creates connection', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/integrations/notion/connect',
      headers: { authorization: `Bearer ${token}` },
      payload: { workspaceId: 'ws-1', workspaceName: 'My Workspace' },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { id: string; workspaceName: string };
    expect(body.workspaceName).toBe('My Workspace');
    expect(body.id).toBeTruthy();
  });

  it('POST /integrations/notion/connect duplicate → 409', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/integrations/notion/connect',
      headers: { authorization: `Bearer ${token}` },
      payload: { workspaceId: 'ws-1', workspaceName: 'My Workspace' },
    });
    expect(r.statusCode).toBe(409);
  });

  it('GET /integrations/notion/connections → 200 now returns created connection', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/integrations/notion/connections',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as { id: string }[];
    expect(list).toHaveLength(1);
  });

  it('DELETE /integrations/notion/connections/:id → 204', async () => {
    const listR = await app.inject({
      method: 'GET',
      url: '/integrations/notion/connections',
      headers: { authorization: `Bearer ${token}` },
    });
    const [first] = listR.json() as { id: string }[];
    const id = first!.id;

    const r = await app.inject({
      method: 'DELETE',
      url: `/integrations/notion/connections/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(204);
  });

  it('DELETE /integrations/notion/connections/:id unknown id → 404', async () => {
    const r = await app.inject({
      method: 'DELETE',
      url: '/integrations/notion/connections/nonexistent',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
  });

  it('GET without auth → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/integrations/notion/connections' });
    expect(r.statusCode).toBe(401);
  });
});
