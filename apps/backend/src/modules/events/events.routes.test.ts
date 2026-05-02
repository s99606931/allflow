import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { eventsRoutes } from './events.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock prisma 시그니처 신뢰.
type AnyArgs = any;

interface EventRow {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location: string | null;
  attendees: string[];
  resourceId: string | null;
  source: 'internal' | 'google' | 'outlook';
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function makeStore() {
  const rows = new Map<string, EventRow>();
  let seq = 0;
  return {
    findMany: async (args: AnyArgs) => {
      const startFilter = args?.where?.start as { gte?: Date; lte?: Date } | undefined;
      let list = Array.from(rows.values());
      if (startFilter?.gte) {
        const gte = startFilter.gte;
        list = list.filter((r) => r.start.getTime() >= gte.getTime());
      }
      if (startFilter?.lte) {
        const lte = startFilter.lte;
        list = list.filter((r) => r.start.getTime() <= lte.getTime());
      }
      return list.sort((a, b) => a.start.getTime() - b.start.getTime());
    },
    create: async (args: AnyArgs) => {
      seq += 1;
      const now = new Date(Date.now() + seq);
      const row: EventRow = {
        id: `evt-${seq}`,
        title: args.data.title,
        start: args.data.start,
        end: args.data.end,
        location: args.data.location ?? null,
        attendees: args.data.attendees ?? [],
        resourceId: args.data.resourceId ?? null,
        source: args.data.source ?? 'internal',
        createdById: args.data.createdById ?? null,
        createdAt: now,
        updatedAt: now,
      };
      rows.set(row.id, row);
      return row;
    },
    findFirst: async (args: AnyArgs) => rows.get(args.where.id) ?? null,
    update: async (args: AnyArgs) => {
      const row = rows.get(args.where.id);
      if (!row) return null;
      if (args.data.title !== undefined) row.title = args.data.title;
      if (args.data.start !== undefined) row.start = args.data.start;
      if (args.data.end !== undefined) row.end = args.data.end;
      if (args.data.location !== undefined) row.location = args.data.location;
      if (args.data.attendees !== undefined) row.attendees = args.data.attendees;
      if (args.data.resourceId !== undefined) row.resourceId = args.data.resourceId;
      row.updatedAt = new Date();
      return row;
    },
    delete: async (args: AnyArgs) => {
      const row = rows.get(args.where.id);
      if (row) rows.delete(args.where.id);
      return row ?? null;
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  app.decorate('prisma', { event: store } as never);
  await app.register(authPlugin);
  await app.register(eventsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/events — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET, POST, DELETE)', async () => {
    const app = await buildTestApp();
    expect((await app.inject({ method: 'GET', url: '/events' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/events',
          payload: { title: 'x', start: '2026-05-01T09:00:00Z', end: '2026-05-01T10:00:00Z' },
        })
      ).statusCode,
    ).toBe(401);
    expect((await app.inject({ method: 'DELETE', url: '/events/evt-1' })).statusCode).toBe(401);
    await app.close();
  });

  it('POST → 201 + Event, 그 다음 GET 에 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: '주간 동기화',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
        location: '본사 5F',
        attendees: ['u2', 'u3'],
      },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json();
    expect(created).toMatchObject({
      title: '주간 동기화',
      start: '2026-05-04T01:00:00.000Z',
      end: '2026-05-04T02:00:00.000Z',
      attendees: ['u2', 'u3'],
      source: 'internal',
    });
    expect(typeof created.id).toBe('string');

    const get = await app.inject({
      method: 'GET',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    expect((get.json() as Array<{ id: string }>).length).toBe(1);
    await app.close();
  });

  it('POST → end<=start 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'x', start: '2026-05-04T02:00:00Z', end: '2026-05-04T01:00:00Z' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → 잘못된 datetime 형식 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'x', start: 'not-a-date', end: 'not-a-date' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('DELETE /events/:id → 204 + GET 에 미포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '삭제 일정', start: '2026-05-04T01:00:00Z', end: '2026-05-04T02:00:00Z' },
    });
    const { id } = post.json() as { id: string };
    const del = await app.inject({
      method: 'DELETE',
      url: `/events/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: '/events', headers: { authorization: `Bearer ${token}` } });
    expect((get.json() as Array<{ id: string }>).find((e) => e.id === id)).toBeUndefined();
    await app.close();
  });

  it('DELETE → 없는 id 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({ method: 'DELETE', url: '/events/no-such-evt', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('PATCH /events/:id → 200 + 수정된 Event (title 변경)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Original Title', start: '2026-05-10T09:00:00Z', end: '2026-05-10T10:00:00Z' },
    });
    const { id } = post.json() as { id: string };
    const patch = await app.inject({
      method: 'PATCH',
      url: `/events/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Updated Title' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({ id, title: 'Updated Title' });
    await app.close();
  });

  it('PATCH /events/:id → 빈 body 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'X', start: '2026-05-10T09:00:00Z', end: '2026-05-10T10:00:00Z' },
    });
    const { id } = post.json() as { id: string };
    const patch = await app.inject({
      method: 'PATCH',
      url: `/events/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(patch.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /events/:id → 없는 id 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'PATCH',
      url: '/events/non-existent-id',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'X' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('PATCH /events/:id → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'PATCH',
      url: '/events/any-id',
      payload: { title: 'X' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET ?from&to 필터 + start asc 정렬', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const mk = (title: string, start: string, end: string) =>
      app.inject({
        method: 'POST',
        url: '/events',
        headers: { authorization: `Bearer ${token}` },
        payload: { title, start, end },
      });
    await mk('A', '2026-04-30T01:00:00Z', '2026-04-30T02:00:00Z');
    await mk('B', '2026-05-05T01:00:00Z', '2026-05-05T02:00:00Z');
    await mk('C', '2026-05-12T01:00:00Z', '2026-05-12T02:00:00Z');

    const all = await app.inject({
      method: 'GET',
      url: '/events',
      headers: { authorization: `Bearer ${token}` },
    });
    const allList = all.json() as Array<{ title: string }>;
    expect(allList.map((x) => x.title)).toEqual(['A', 'B', 'C']);

    const filtered = await app.inject({
      method: 'GET',
      url: '/events?from=2026-05-01&to=2026-05-10',
      headers: { authorization: `Bearer ${token}` },
    });
    expect((filtered.json() as Array<{ title: string }>).map((x) => x.title)).toEqual(['B']);

    await app.close();
  });
});
