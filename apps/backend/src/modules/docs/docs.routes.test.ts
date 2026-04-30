import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { docsRoutes } from './docs.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock prisma 시그니처 신뢰.
type AnyArgs = any;

interface DocRow {
  id: string;
  title: string;
  content: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

function makeStore() {
  const rows = new Map<string, DocRow>();
  let seq = 0;
  return {
    count: async () => rows.size,
    createMany: async (args: AnyArgs) => {
      for (const d of args.data) {
        seq += 1;
        const now = new Date(Date.now() + seq);
        const row: DocRow = {
          id: `doc-${seq}`,
          title: d.title,
          content: d.content ?? null,
          ownerId: d.ownerId,
          createdAt: now,
          updatedAt: now,
        };
        rows.set(row.id, row);
      }
    },
    findMany: async (args: AnyArgs) => {
      const all = Array.from(rows.values());
      if (args?.orderBy?.updatedAt === 'desc') {
        return all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      }
      return all;
    },
    create: async (args: AnyArgs) => {
      seq += 1;
      const now = new Date(Date.now() + seq);
      const row: DocRow = {
        id: `doc-${seq}`,
        title: args.data.title,
        content: args.data.content ?? null,
        ownerId: args.data.ownerId,
        createdAt: now,
        updatedAt: now,
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
  app.decorate('prisma', { doc: store } as never);
  await app.register(authPlugin);
  await app.register(docsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/docs — BE-N5', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET, POST)', async () => {
    const app = await buildTestApp();
    expect((await app.inject({ method: 'GET', url: '/docs' })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'POST', url: '/docs', payload: { title: 'x' } })).statusCode,
    ).toBe(401);
    await app.close();
  });

  it('POST → 201 + Doc (ownerId = caller, preview 추출)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/docs',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '회의록', content: 'a'.repeat(300) },
    });
    expect(r.statusCode).toBe(201);
    const created = r.json();
    expect(created).toMatchObject({ title: '회의록', ownerId: 'u1' });
    expect(typeof created.id).toBe('string');
    expect(typeof created.updatedAt).toBe('string');
    expect(created.preview?.length).toBe(200);
    await app.close();
  });

  it('POST → content 없으면 preview 미포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/docs',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '제목만' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().preview).toBeUndefined();
    await app.close();
  });

  it('POST → 빈 title 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/docs',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET 정렬: 최신 updatedAt 우선', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/docs',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'A' },
    });
    await new Promise((r) => setTimeout(r, 5));
    await app.inject({
      method: 'POST',
      url: '/docs',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'B' },
    });
    const get = await app.inject({
      method: 'GET',
      url: '/docs',
      headers: { authorization: `Bearer ${token}` },
    });
    const list = get.json() as Array<{ title: string }>;
    expect(list[0]?.title).toBe('B');
    expect(list[1]?.title).toBe('A');
    await app.close();
  });
});
