import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { hrRoutes } from './hr.routes.js';

const TEST_AUTH = 'c'.repeat(16) + 'd'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface LeaveRow {
  id: string;
  requesterId: string;
  approverId: string | null;
  type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startDate: Date;
  endDate: Date;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function makeStore() {
  const rows = new Map<string, LeaveRow>();
  let seq = 0;
  return {
    rows,
    findMany: async (args: AnyArgs) => {
      const userId = args?.where?.requesterId;
      let list = Array.from(rows.values());
      if (userId) list = list.filter((r) => r.requesterId === userId);
      const sorted = list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return sorted.map((r) => ({
        ...r,
        approver: r.approverId ? { id: r.approverId, name: 'Approver' } : null,
      }));
    },
    findUnique: async (args: AnyArgs) => rows.get(args.where.id) ?? null,
    create: async (args: AnyArgs) => {
      seq += 1;
      const now = new Date(Date.now() + seq);
      const row: LeaveRow = {
        id: `leave-${seq}`,
        requesterId: args.data.requesterId,
        approverId: null,
        type: args.data.type,
        status: 'PENDING',
        startDate: args.data.startDate,
        endDate: args.data.endDate,
        reason: args.data.reason ?? null,
        createdAt: now,
        updatedAt: now,
      };
      rows.set(row.id, row);
      return row;
    },
    update: async (args: AnyArgs) => {
      const cur = rows.get(args.where.id);
      if (!cur) throw new Error('not found');
      const updated: LeaveRow = {
        ...cur,
        ...args.data,
        updatedAt: new Date(),
      };
      rows.set(cur.id, updated);
      return updated;
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  app.decorate('prisma', {
    leaveRequest: {
      findMany: store.findMany,
      findUnique: store.findUnique,
      create: store.create,
      update: store.update,
    },
    revokedToken: {
      findUnique: async () => null,
    },
  } as never);
  await app.register(authPlugin);
  await app.register(hrRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/hr — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET /hr/leave)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/hr/leave' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST /hr/leave)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/hr/leave',
      payload: { type: 'ANNUAL', startDate: '2026-06-01', endDate: '2026-06-05' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (PATCH /hr/leave/:id/status)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'PATCH',
      url: '/hr/leave/some-id/status',
      payload: { status: 'APPROVED' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST → 201 + LeaveRequest, 그 다음 GET 목록에 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'ANNUAL',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        reason: '휴가',
      },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json();
    expect(created).toMatchObject({
      requesterId: 'u1',
      type: 'ANNUAL',
      status: 'PENDING',
    });
    expect(typeof created.id).toBe('string');

    const get = await app.inject({
      method: 'GET',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    const list = get.json() as Array<{ id: string }>;
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(created.id);
    await app.close();
  });

  it('POST → 입력 검증 실패 시 400 (type 누락)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${token}` },
      payload: { startDate: '2026-06-01', endDate: '2026-06-05' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → 잘못된 type 값이면 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'VACATION', startDate: '2026-06-01', endDate: '2026-06-05' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /hr/leave/:id/status → 200 + status 갱신', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u2 = await makeJws('u2');

    const post = await app.inject({
      method: 'POST',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${u1}` },
      payload: { type: 'SICK', startDate: '2026-07-01', endDate: '2026-07-03' },
    });
    const created = post.json() as { id: string };

    const patch = await app.inject({
      method: 'PATCH',
      url: `/hr/leave/${created.id}/status`,
      headers: { authorization: `Bearer ${u2}` },
      payload: { status: 'APPROVED' },
    });
    expect(patch.statusCode).toBe(200);
    const updated = patch.json();
    expect(updated.status).toBe('APPROVED');
    expect(updated.approverId).toBe('u2');
    await app.close();
  });

  it('PATCH → 존재하지 않는 id는 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u2');
    const r = await app.inject({
      method: 'PATCH',
      url: '/hr/leave/not-exist/status',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'REJECTED' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('PATCH → 잘못된 status 값이면 400', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u2 = await makeJws('u2');

    const post = await app.inject({
      method: 'POST',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${u1}` },
      payload: { type: 'PERSONAL', startDate: '2026-08-01', endDate: '2026-08-02' },
    });
    const created = post.json() as { id: string };

    const r = await app.inject({
      method: 'PATCH',
      url: `/hr/leave/${created.id}/status`,
      headers: { authorization: `Bearer ${u2}` },
      payload: { status: 'PENDING' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET → 본인 요청만 반환 (다른 사용자 요청은 미포함)', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u2 = await makeJws('u2');

    await app.inject({
      method: 'POST',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${u1}` },
      payload: { type: 'ANNUAL', startDate: '2026-09-01', endDate: '2026-09-05' },
    });
    await app.inject({
      method: 'POST',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${u2}` },
      payload: { type: 'SICK', startDate: '2026-09-10', endDate: '2026-09-11' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/hr/leave',
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ requesterId: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.requesterId).toBe('u1');
    await app.close();
  });
});
