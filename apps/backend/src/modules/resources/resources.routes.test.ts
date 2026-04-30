import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { resourcesRoutes } from './resources.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock prisma 시그니처 신뢰.
type AnyArgs = any;

interface ResourceRow {
  id: string;
  name: string;
  kind: 'room' | 'equipment';
  capacity: number | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BookingRow {
  id: string;
  resourceId: string;
  start: Date;
  end: Date;
  bookedBy: string;
  createdAt: Date;
}

function makeStores() {
  const resources = new Map<string, ResourceRow>();
  const bookings = new Map<string, BookingRow>();
  let bSeq = 0;

  return {
    resource: {
      count: async () => resources.size,
      findUnique: async (args: AnyArgs) => resources.get(args.where.id) ?? null,
      findMany: async (_args: AnyArgs) =>
        Array.from(resources.values()).sort((a, b) => a.id.localeCompare(b.id)),
      createMany: async (args: AnyArgs) => {
        for (const data of args.data as Array<
          Partial<ResourceRow> & { id: string; name: string; kind: 'room' | 'equipment' }
        >) {
          const now = new Date();
          resources.set(data.id, {
            id: data.id,
            name: data.name,
            kind: data.kind,
            capacity: data.capacity ?? null,
            location: data.location ?? null,
            createdAt: now,
            updatedAt: now,
          });
        }
        return { count: args.data.length };
      },
    },
    booking: {
      findFirst: async (args: AnyArgs) => {
        const where = args.where as {
          resourceId: string;
          start: { lt: Date };
          end: { gt: Date };
        };
        for (const b of bookings.values()) {
          if (b.resourceId !== where.resourceId) continue;
          if (
            b.start.getTime() < where.start.lt.getTime() &&
            b.end.getTime() > where.end.gt.getTime()
          ) {
            return b;
          }
        }
        return null;
      },
      create: async (args: AnyArgs) => {
        bSeq += 1;
        const row: BookingRow = {
          id: `bk-${bSeq}`,
          resourceId: args.data.resourceId,
          start: args.data.start,
          end: args.data.end,
          bookedBy: args.data.bookedBy,
          createdAt: new Date(),
        };
        bookings.set(row.id, row);
        return row;
      },
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  app.decorate('prisma', makeStores() as never);
  await app.register(authPlugin);
  await app.register(resourcesRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/resources — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET, POST /book)', async () => {
    const app = await buildTestApp();
    expect((await app.inject({ method: 'GET', url: '/resources' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/resources/book',
          payload: {
            resourceId: 'room-101',
            start: '2026-05-04T01:00:00Z',
            end: '2026-05-04T02:00:00Z',
          },
        })
      ).statusCode,
    ).toBe(401);
    await app.close();
  });

  it('GET /resources → 시드 카탈로그 반환', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/resources',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ id: string; kind: string }>;
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((x) => x.kind === 'room')).toBe(true);
    await app.close();
  });

  it('POST /resources/book → 200 + booking', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      resourceId: 'room-101',
      start: '2026-05-04T01:00:00.000Z',
      end: '2026-05-04T02:00:00.000Z',
      bookedBy: 'u1',
    });
    await app.close();
  });

  it('POST → 충돌 시 409', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const ok = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(ok.statusCode).toBe(200);
    const dup = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:30:00Z',
        end: '2026-05-04T02:30:00Z',
      },
    });
    expect(dup.statusCode).toBe(409);
    await app.close();
  });

  it('POST → boundary touch 허용', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    const adj = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T02:00:00Z',
        end: '2026-05-04T03:00:00Z',
      },
    });
    expect(adj.statusCode).toBe(200);
    await app.close();
  });

  it('POST → 다른 resourceId 는 충돌 아님', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    const other = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-102',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(other.statusCode).toBe(200);
    await app.close();
  });

  it('POST → 존재하지 않는 resourceId 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-999',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → end<=start 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T02:00:00Z',
        end: '2026-05-04T01:00:00Z',
      },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
