import { SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { __resetApprovalsForTests, approvalsRoutes } from './approvals.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
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

describe('modules/approvals — BE-N1', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });
  afterEach(() => {
    __resetApprovalsForTests();
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
});
