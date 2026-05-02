import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { approvalsRoutes } from './approvals.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface ApprovalRow {
  id: string;
  title: string;
  requesterId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  amount: number | null;
  reason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  attachments: string[];
}

function makeStore() {
  const rows = new Map<string, ApprovalRow>();
  let seq = 0;
  return {
    rows,
    findMany: async (args: AnyArgs) => {
      const status = args?.where?.status;
      let list = Array.from(rows.values());
      if (status) list = list.filter((r) => r.status === status);
      return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    findUnique: async (args: AnyArgs) => rows.get(args.where.id) ?? null,
    findFirst: async (args: AnyArgs) => rows.get(args.where.id) ?? null,
    delete: async (args: AnyArgs) => {
      const cur = rows.get(args.where.id);
      if (!cur) throw new Error('not found');
      rows.delete(args.where.id);
      return cur;
    },
    create: async (args: AnyArgs) => {
      seq += 1;
      const now = new Date(Date.now() + seq);
      const row: ApprovalRow = {
        id: `apr-${seq}`,
        title: args.data.title,
        requesterId: args.data.requesterId,
        approverId: args.data.approverId,
        status: args.data.status ?? 'pending',
        amount: args.data.amount ?? null,
        reason: args.data.reason ?? null,
        decidedAt: null,
        attachments: args.data.attachments ?? [],
        createdAt: now,
        updatedAt: now,
      };
      rows.set(row.id, row);
      return row;
    },
    update: async (args: AnyArgs) => {
      const cur = rows.get(args.where.id);
      if (!cur) throw new Error('not found');
      const updated: ApprovalRow = {
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
    approval: {
      findMany: store.findMany,
      findUnique: store.findUnique,
      findFirst: store.findFirst,
      delete: store.delete,
      create: store.create,
      update: store.update,
    },
  } as never);
  await app.register(authPlugin);
  await app.register(approvalsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/approvals — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/approvals' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/approvals',
      payload: { title: 'x', approver: 'u2' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST → 201 + Approval, 그 다음 GET 에 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '경비 5만원', approver: 'u2', amount: 50000, reason: '회의' },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json();
    expect(created).toMatchObject({
      title: '경비 5만원',
      approver: 'u2',
      requester: 'u1',
      status: 'pending',
      amount: 50000,
      reason: '회의',
    });
    expect(typeof created.id).toBe('string');
    expect(typeof created.createdAt).toBe('string');

    const get = await app.inject({
      method: 'GET',
      url: '/approvals',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    const list = get.json() as Array<{ id: string }>;
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(created.id);
    await app.close();
  });

  it('POST → 입력 검증 실패 시 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '', approver: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET ?status=pending 필터', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u2 = await makeJws('u2');
    await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: 'A', approver: 'u2' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: 'B', approver: 'u2' },
    });
    const created = second.json() as { id: string };
    await app.inject({
      method: 'POST',
      url: `/approvals/${created.id}/decision`,
      headers: { authorization: `Bearer ${u2}` },
      payload: { decision: 'approved' },
    });

    const pending = await app.inject({
      method: 'GET',
      url: '/approvals?status=pending',
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(pending.json()).toHaveLength(1);
    const approved = await app.inject({
      method: 'GET',
      url: '/approvals?status=approved',
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(approved.json()).toHaveLength(1);
    await app.close();
  });

  it('decision: approver 만 결정 가능 (403)', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u3 = await makeJws('u3');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: 'A', approver: 'u2' },
    });
    const id = (post.json() as { id: string }).id;
    const r = await app.inject({
      method: 'POST',
      url: `/approvals/${id}/decision`,
      headers: { authorization: `Bearer ${u3}` },
      payload: { decision: 'approved' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('decision: 정상 → 200 + status 갱신, 두번째 호출은 400', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u2 = await makeJws('u2');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: 'A', approver: 'u2' },
    });
    const id = (post.json() as { id: string }).id;
    const first = await app.inject({
      method: 'POST',
      url: `/approvals/${id}/decision`,
      headers: { authorization: `Bearer ${u2}` },
      payload: { decision: 'approved', comment: 'OK' },
    });
    expect(first.statusCode).toBe(200);
    const updated = first.json();
    expect(updated.status).toBe('approved');
    expect(typeof updated.decidedAt).toBe('string');

    const second = await app.inject({
      method: 'POST',
      url: `/approvals/${id}/decision`,
      headers: { authorization: `Bearer ${u2}` },
      payload: { decision: 'rejected' },
    });
    expect(second.statusCode).toBe(400);
    await app.close();
  });

  it('decision: 존재하지 않는 id → 404', async () => {
    const app = await buildTestApp();
    const u2 = await makeJws('u2');
    const r = await app.inject({
      method: 'POST',
      url: '/approvals/missing/decision',
      headers: { authorization: `Bearer ${u2}` },
      payload: { decision: 'approved' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('DELETE /approvals/:id → pending 결재 회수 → 204', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '회수할 결재', approver: 'u2' },
    });
    const { id } = post.json() as { id: string };

    const del = await app.inject({
      method: 'DELETE',
      url: `/approvals/${id}`,
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({
      method: 'GET',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
    });
    const list = get.json() as Array<{ id: string }>;
    expect(list.some((item) => item.id === id)).toBe(false);
    await app.close();
  });

  it('DELETE /approvals/:id → pending 아닌 결재 → 400', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u2 = await makeJws('u2');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '이미 처리된 결재', approver: 'u2' },
    });
    const { id } = post.json() as { id: string };
    await app.inject({
      method: 'POST',
      url: `/approvals/${id}/decision`,
      headers: { authorization: `Bearer ${u2}` },
      payload: { decision: 'approved' },
    });

    const del = await app.inject({
      method: 'DELETE',
      url: `/approvals/${id}`,
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(del.statusCode).toBe(400);
    await app.close();
  });

  it('DELETE /approvals/:id → 없는 id → 404', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'DELETE',
      url: '/approvals/missing',
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('DELETE /approvals/:id → 상신자 아닌 사용자 → 403', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u3 = await makeJws('u3');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '권한 없는 회수 시도', approver: 'u2' },
    });
    const { id } = post.json() as { id: string };

    const del = await app.inject({
      method: 'DELETE',
      url: `/approvals/${id}`,
      headers: { authorization: `Bearer ${u3}` },
    });
    expect(del.statusCode).toBe(403);
    await app.close();
  });

  it('DELETE /approvals/:id → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'DELETE', url: '/approvals/x' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('PATCH /approvals/:id → title/amount 업데이트 200', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '원래 제목', approver: 'u2', amount: 10000 },
    });
    const { id } = post.json() as { id: string };

    const r = await app.inject({
      method: 'PATCH',
      url: `/approvals/${id}`,
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '수정된 제목', amount: 20000 },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ title: '수정된 제목', amount: 20000 });
    await app.close();
  });

  it('PATCH /approvals/:id → 빈 body → 400', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '빈 패치', approver: 'u2' },
    });
    const { id } = post.json() as { id: string };

    const r = await app.inject({
      method: 'PATCH',
      url: `/approvals/${id}`,
      headers: { authorization: `Bearer ${u1}` },
      payload: {},
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /approvals/:id → 없는 id → 404', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'PATCH',
      url: '/approvals/missing',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '제목' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('PATCH /approvals/:id → 이미 처리된 결재 → 400', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u2 = await makeJws('u2');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '처리될 결재', approver: 'u2' },
    });
    const { id } = post.json() as { id: string };
    await app.inject({
      method: 'POST',
      url: `/approvals/${id}/decision`,
      headers: { authorization: `Bearer ${u2}` },
      payload: { decision: 'approved' },
    });

    const r = await app.inject({
      method: 'PATCH',
      url: `/approvals/${id}`,
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '수정 시도' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /approvals/:id → 타인 수정 시도 → 403', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const u3 = await makeJws('u3');
    const post = await app.inject({
      method: 'POST',
      url: '/approvals',
      headers: { authorization: `Bearer ${u1}` },
      payload: { title: '타인 수정 불가', approver: 'u2' },
    });
    const { id } = post.json() as { id: string };

    const r = await app.inject({
      method: 'PATCH',
      url: `/approvals/${id}`,
      headers: { authorization: `Bearer ${u3}` },
      payload: { title: '무단 수정' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });
});
