import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { aiRoutes, extractCitations } from './ai.routes.js';
import { AIAdapterRegistry, InMemoryAIAdapter } from './ai-adapter.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock
type AnyArgs = any;

function makePrismaStubPlugin() {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', {
        projectMember: { findUnique: async (_a: AnyArgs) => null },
      } as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(canned: Record<string, string> = {}) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const reg = new AIAdapterRegistry();
  reg.register(new InMemoryAIAdapter(canned), true);

  const app = await buildApp({ logger: false });
  await app.register(makePrismaStubPlugin());
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(aiRoutes, { registry: reg });
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/ai/ai.routes', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('POST /ai/complete (non-stream) → 200 + text + citations', async () => {
    const app = await buildTestApp({ Hello: 'Hi back, see [task:t1] and [doc:d2]' });
    const r = await app.inject({
      method: 'POST',
      url: '/ai/complete',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { prompt: 'Hello' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { text: string; citations: { kind: string; id: string }[] };
    expect(body.text).toContain('Hi back');
    expect(body.citations).toHaveLength(2);
    expect(body.citations[0]).toEqual({ kind: 'task', id: 't1' });
    expect(body.citations[1]).toEqual({ kind: 'doc', id: 'd2' });
    await app.close();
  });

  it('POST /ai/complete (stream) → SSE chunks + done', async () => {
    const app = await buildTestApp({ Stream: 'AB[task:tx]CD' });
    const r = await app.inject({
      method: 'POST',
      url: '/ai/complete',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { prompt: 'Stream', stream: true },
    });
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toContain('text/event-stream');
    const body = r.body;
    expect(body).toContain('"delta"');
    expect(body).toContain('"done":true');
    expect(body).toContain('"citations"');
    expect(body).toContain('"id":"tx"');
    await app.close();
  });

  it('POST /ai/complete → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/ai/complete',
      payload: { prompt: 'hi' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /ai/complete → 빈 prompt 400', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/ai/complete',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { prompt: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('extractCitations → 4 종류 모두 매칭', () => {
    const text = '[task:t1] [doc:d2] [message:m3] [issue:i4] not[Wrong:x]';
    const r = extractCitations(text);
    expect(r).toHaveLength(4);
    expect(r.map((c) => c.kind)).toEqual(['task', 'doc', 'message', 'issue']);
  });

  it('POST /ai/extract-actions → 200 + ExtractedAction 배열 (default threshold)', async () => {
    const cannedJson = JSON.stringify({
      actions: [
        {
          title: '디자인 검토',
          assignee: '박서연',
          due: '2026-04-30',
          priority: 'high',
          confidence: 0.92,
        },
        { title: '저신뢰', assignee: '김지우', confidence: 0.4 },
      ],
    });
    // canned key 는 user 메시지 본문 — extract-actions 의 buildPrompt 로 동일하게 생성
    const userPrompt =
      '소스 유형: meeting\n회의록입니다. 결정 사항(decision)/할 일(action item)/책임자(owner)/기한(due) 위주로 추출하세요.\n\n--- 본문 시작 ---\n회의 본문\n--- 본문 끝 ---\n\nJSON 만 출력:';
    const app = await buildTestApp({ [userPrompt]: cannedJson });
    const r = await app.inject({
      method: 'POST',
      url: '/ai/extract-actions',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { source: 'meeting', content: '회의 본문' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{ confidence: number }>;
    expect(body).toHaveLength(1);
    expect(body[0]?.confidence).toBeGreaterThanOrEqual(0.7);
    await app.close();
  });

  it('POST /ai/extract-actions → 잘못된 source 400', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/ai/extract-actions',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { source: 'invalid', content: 'x' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
