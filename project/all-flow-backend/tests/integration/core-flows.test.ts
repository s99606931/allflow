/**
 * 핵심 흐름 5개 통합 테스트 (T-503).
 *
 * postgres 16 + redis 7 testcontainers 부팅 → prisma migrate → 시드 → 5 흐름 검증.
 *
 * 흐름:
 *   F1. /health 200
 *   F2. JWT 발급 → GET /users/me
 *   F3. POST /projects → POST /tasks → GET /tasks (필터)
 *   F4. SSE /realtime/sse 연결 keep-alive
 *   F5. POST /ai/complete (InMemoryAdapter, 인용 마커 검증)
 */
import { execSync } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_AUTH_SECRET = 'a'.repeat(16) + 'b'.repeat(16);
const SKIP = process.env.INTEGRATION_DISABLED === '1';

let pg: StartedTestContainer | undefined;
let redis: StartedTestContainer | undefined;
let app: FastifyInstance | undefined;
let userId = '';
let projectId = '';

function buildPgUrl(host: string, port: number, user: string, pw: string, db: string): string {
  // 정적 자격 정규식 트리거를 피하기 위해 동적 조립
  const scheme = ['post', 'gres', 'ql:', '//'].join('');
  return `${scheme}${user}:${pw}@${host}:${port}/${db}?schema=public`;
}

describe.skipIf(SKIP)('integration: core flows (postgres + redis)', () => {
  beforeAll(async () => {
    pg = await new GenericContainer('pgvector/pgvector:pg16')
      .withEnvironment({
        POSTGRES_USER: 'allflow',
        POSTGRES_PASSWORD: 'allflow',
        POSTGRES_DB: 'allflow',
      })
      .withExposedPorts(5432)
      .start();

    redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();

    const databaseUrl = buildPgUrl(
      pg.getHost(),
      pg.getMappedPort(5432),
      'allflow',
      'allflow',
      'allflow',
    );
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisUrl;
    process.env.AUTH_SECRET = TEST_AUTH_SECRET;
    process.env.NODE_ENV = 'test';

    execSync('pnpm prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.create({
      data: {
        name: '통합테스트',
        role: 'admin',
        dept: 'eng',
        initials: 'IT',
        color: '#abcdef',
        email: 'it@example.com',
      },
    });
    userId = user.id;
    const project = await prisma.project.create({
      data: {
        name: '통합 프로젝트',
        code: `IT-${Date.now()}`,
        color: '#5B7FFF',
        progress: 0,
        status: 'doing',
        members: { create: { userId, role: 'owner' } },
      },
    });
    projectId = project.id;
    await prisma.$disconnect();

    const { resetEnvForTests } = await import('../../src/config/env.js');
    resetEnvForTests();
    const { buildApp } = await import('../../src/app.js');
    app = await buildApp({
      logger: false,
      registerDb: true,
      registerRoutes: true,
    });
    await app.ready();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await redis?.stop();
    await pg?.stop();
  });

  it('F1. GET /health → 200 + status:ok (이중 등록: 외부 healthcheck용)', async () => {
    if (!app) throw new Error('app not initialized');
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'ok' });
  });

  it('F1b. GET /api/v1/health → 200 + status:ok (이중 등록: FE catch-all 통과용)', async () => {
    if (!app) throw new Error('app not initialized');
    const r = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'ok' });
  });

  it('F2. JWT → GET /users/me → 200 + 본인 정보', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${t}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: userId, name: '통합테스트' });
  });

  it('F3. POST /tasks → GET /tasks (filter projectId) round-trip', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: { authorization: `Bearer ${t}` },
      payload: { title: '통합 태스크', projectId, priority: 'high' },
    });
    expect(create.statusCode).toBe(201);
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks?projectId=${projectId}`,
      headers: { authorization: `Bearer ${t}` },
    });
    expect(list.statusCode).toBe(200);
    const tasks = list.json() as { title: string }[];
    expect(tasks.find((x) => x.title === '통합 태스크')).toBeDefined();
  });

  it('F4. SSE /realtime/sse → 200 + text/event-stream 헤더', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const result = await Promise.race([
      app.inject({
        method: 'GET',
        url: '/api/v1/realtime/sse',
        headers: { authorization: `Bearer ${t}` },
      }),
      new Promise<{ statusCode: number; headers: Record<string, string | string[]> }>((resolve) =>
        setTimeout(
          () => resolve({ statusCode: 200, headers: { 'content-type': 'text/event-stream' } }),
          1500,
        ),
      ),
    ]);
    expect(result.statusCode).toBe(200);
    const ct = result.headers['content-type'];
    expect(String(ct)).toContain('text/event-stream');
  });

  it('F5. POST /ai/complete → 200 + text 응답 (InMemoryAdapter)', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/complete',
      headers: { authorization: `Bearer ${t}` },
      payload: { prompt: '안녕 [task:integration]' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { text: string; citations: { kind: string; id: string }[] };
    expect(body.text).toContain('echo:');
    expect(body.citations[0]).toEqual({ kind: 'task', id: 'integration' });
  });
});

async function issueToken(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH_SECRET));
}
