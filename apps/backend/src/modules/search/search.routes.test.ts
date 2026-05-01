import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { searchRoutes } from './search.routes.js';

// semanticSearch 는 OpenAI 외부 호출이므로 모듈 전체를 모킹
vi.mock('./search.service.js', () => ({
  semanticSearch: vi.fn().mockResolvedValue([
    { id: 'task-1', title: '샘플 태스크', kind: 'task', score: 0.95, projectId: 'proj-1' },
    { id: 'issue-1', title: '샘플 이슈', kind: 'issue', score: 0.88, projectId: 'proj-1' },
  ]),
}));

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock prisma 시그니처 신뢰.
type AnyArgs = any;

function makePrismaStub() {
  return {
    projectMember: {
      findFirst: async (_args: AnyArgs) => null,
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  app.decorate('prisma', makePrismaStub() as never);
  await app.register(authPlugin);
  await app.register(searchRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/search — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
    vi.restoreAllMocks();
  });

  it('인증 없으면 401 (POST /search/semantic)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/search/semantic',
      payload: { query: '태스크 검색' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /search/semantic → 200 + { data, query }', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/search/semantic',
      headers: { authorization: `Bearer ${token}` },
      payload: { query: '태스크 검색' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { data: unknown[]; query: string };
    expect(body.query).toBe('태스크 검색');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    await app.close();
  });

  it('빈 query → 400 (zod min(1) 검증)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/search/semantic',
      headers: { authorization: `Bearer ${token}` },
      payload: { query: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('query 없음 → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/search/semantic',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('query 500자 초과 → 400 (zod max(500) 검증)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/search/semantic',
      headers: { authorization: `Bearer ${token}` },
      payload: { query: 'a'.repeat(501) },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('projectId 지정 + 멤버 아닐 때 → 403', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    // makePrismaStub 은 findFirst → null (멤버 없음)
    const r = await app.inject({
      method: 'POST',
      url: '/search/semantic',
      headers: { authorization: `Bearer ${token}` },
      payload: { query: '검색어', projectId: 'proj-99' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('projectId 지정 + 멤버일 때 → 200', async () => {
    // 멤버로 응답하는 별도 앱 구축
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
    const app2 = await buildApp({ logger: false });
    app2.decorate('prisma', {
      projectMember: {
        findFirst: async (_args: unknown) => ({ userId: 'u2', projectId: 'proj-1' }),
      },
    } as never);
    await app2.register(authPlugin);
    await app2.register(searchRoutes);

    const token = await makeJws('u2');
    const r = await app2.inject({
      method: 'POST',
      url: '/search/semantic',
      headers: { authorization: `Bearer ${token}` },
      payload: { query: '검색어', projectId: 'proj-1' },
    });
    expect(r.statusCode).toBe(200);
    await app2.close();
  });

  it('limit 옵션 전달 → 200', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/search/semantic',
      headers: { authorization: `Bearer ${token}` },
      payload: { query: '검색', limit: 5, targets: ['tasks'] },
    });
    expect(r.statusCode).toBe(200);
    await app.close();
  });
});
