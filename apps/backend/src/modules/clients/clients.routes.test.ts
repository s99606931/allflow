import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { clientsRoutes } from './clients.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock prisma 시그니처 신뢰.
type AnyArgs = any;

interface ClientRow {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function makeStore() {
  const rows = new Map<string, ClientRow>();
  let seq = 0;
  return {
    findMany: async (_args: AnyArgs) => {
      return Array.from(rows.values())
        .filter((r) => r.deletedAt === null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    create: async (args: AnyArgs) => {
      seq += 1;
      const now = new Date(Date.now() + seq);
      const row: ClientRow = {
        id: `cli-${seq}`,
        name: args.data.name,
        contact: args.data.contact ?? null,
        email: args.data.email ?? null,
        phone: args.data.phone ?? null,
        industry: args.data.industry ?? null,
        ownerId: args.data.ownerId ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      rows.set(row.id, row);
      return row;
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  app.decorate('prisma', { client: store } as never);
  await app.register(authPlugin);
  await app.register(clientsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/clients — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/clients' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/clients',
      payload: { name: 'CJ ENM' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST → 201 + Client (ownerId = caller), GET 에 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'CJ ENM', email: 'crm@cjenm.com', industry: '미디어' },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json();
    expect(created).toMatchObject({
      name: 'CJ ENM',
      email: 'crm@cjenm.com',
      industry: '미디어',
      ownerId: 'u1',
    });
    expect(typeof created.id).toBe('string');
    expect(typeof created.createdAt).toBe('string');

    const get = await app.inject({
      method: 'GET',
      url: '/clients',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    const list = get.json() as Array<{ id: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(created.id);
    await app.close();
  });

  it('POST → 입력 검증 실패 시 400 (빈 name)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → 잘못된 email 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'X', email: 'not-an-email' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET 정렬: 최신 createdAt 우선', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'A' },
    });
    await new Promise((r) => setTimeout(r, 5));
    await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'B' },
    });
    const get = await app.inject({
      method: 'GET',
      url: '/clients',
      headers: { authorization: `Bearer ${token}` },
    });
    const list = get.json() as Array<{ name: string }>;
    expect(list[0]?.name).toBe('B');
    expect(list[1]?.name).toBe('A');
    await app.close();
  });
});
