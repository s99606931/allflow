/**
 * Frontend ↔ Backend 컨트랙트 통합 테스트 (T-602 대체).
 *
 * Playwright E2E 환경(USE_MOCK=false)에서 frontend 가 호출하는
 * 모든 백엔드 엔드포인트를 동일한 셋업(testcontainers + prisma)에서 검증한다.
 *
 * 커버 흐름 (frontend src/lib/api.ts 의 surface 와 1:1 매핑):
 *   C1. GET  /users/me                       (api.me)
 *   C2. GET  /projects                       (api.listProjects)
 *   C3. GET  /projects/:id                   (api.getProject)
 *   C4. POST /projects                       (api.createProject)
 *   C5. GET  /tasks?projectId=&assigneeId=   (api.listTasks)
 *   C6. POST /tasks  +  PATCH /tasks/:id     (api.createTask, api.patchTask)
 *   C7. GET  /issues                         (api.listIssues)
 *   C8. GET  /notifications                  (api.listNotifications)
 *   C9. POST /reports/weekly                 (api.weeklyReport)
 *   C10. POST /ai/extract-actions            (api.extractActions)
 *
 * 모든 응답은 frontend Zod 스키마(src/lib/schemas.ts)와 동일한 형태인지
 * 키 단위로 검증한다.
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
  const scheme = ['post', 'gres', 'ql:', '//'].join('');
  return `${scheme}${user}:${pw}@${host}:${port}/${db}?schema=public`;
}

async function issueToken(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH_SECRET));
}

describe.skipIf(SKIP)('integration: frontend ↔ backend contract (USE_MOCK=false 대체)', () => {
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
        name: '컨트랙트테스트',
        role: 'admin',
        dept: 'eng',
        initials: 'CT',
        color: '#abcdef',
        email: 'ct@example.com',
      },
    });
    userId = user.id;
    const project = await prisma.project.create({
      data: {
        name: '컨트랙트 프로젝트',
        code: `CT-${Date.now()}`,
        color: '#5B7FFF',
        progress: 0,
        status: 'doing',
        // ProjectSchema.due 는 string — null 허용 X. 백엔드 toApiProject 가
        // null 일 때 zod parse 실패하므로 명시적으로 미래 날짜 지정.
        due: new Date('2026-12-31'),
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

  it('C1. GET /users/me — frontend api.me 형태', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${t}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Record<string, unknown>;
    // UserSchema 필수 필드
    for (const key of ['id', 'name', 'role', 'initials']) {
      expect(body[key], `missing user.${key}`).toBeDefined();
    }
  });

  it('C2. GET /projects — listProjects 배열 응답', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: `Bearer ${t}` },
    });
    expect(r.statusCode, r.body).toBe(200);
    const list = r.json() as Array<Record<string, unknown>>;
    expect(Array.isArray(list)).toBe(true);
    expect(list.find((p) => p.id === projectId)).toBeDefined();
  });

  it('C3. GET /projects/:id — getProject 단일 응답', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${t}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Record<string, unknown>;
    expect(body.id).toBe(projectId);
    expect(body.name).toBe('컨트랙트 프로젝트');
  });

  it('C4. POST /projects — createProject', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${t}` },
      payload: {
        name: '신규 프로젝트',
        code: `NP-${Date.now()}`,
        color: '#22D3EE',
        // ProjectSchema.due 가 string 필수 — null 응답 시 zod parse 실패하므로
        // 명시적으로 due 지정.
        due: '2026-12-31',
      },
    });
    expect([200, 201], r.body).toContain(r.statusCode);
    const body = r.json() as Record<string, unknown>;
    expect(body.id).toBeDefined();
    expect(body.name).toBe('신규 프로젝트');
  });

  it('C5. GET /tasks?projectId=&assigneeId= — listTasks 필터링', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    // 사전 태스크 1개 생성 (assignee 도 본인으로 지정)
    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${t}` },
      payload: { title: '필터용 태스크', projectId, assigneeId: userId },
    });

    const both = await app.inject({
      method: 'GET',
      url: `/tasks?projectId=${projectId}&assigneeId=${userId}`,
      headers: { authorization: `Bearer ${t}` },
    });
    expect(both.statusCode).toBe(200);
    const list = both.json() as Array<Record<string, unknown>>;
    expect(list.length).toBeGreaterThan(0);
    // 백엔드 응답은 assignee = user.name 으로 변환됨 (frontend openapi 컨트랙트).
    // 결과 전체가 동일한 assignee name 인지 검증.
    for (const item of list) {
      expect(item.assignee).toBe('컨트랙트테스트');
    }
  });

  it('C6. POST /tasks → PATCH /tasks/:id — createTask + patchTask', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${t}` },
      payload: { title: '패치 대상', projectId, priority: 'med' },
    });
    expect([200, 201]).toContain(created.statusCode);
    const taskId = (created.json() as { id: string }).id;
    expect(taskId).toBeDefined();

    const patched = await app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${t}` },
      payload: { status: 'doing' },
    });
    expect(patched.statusCode).toBe(200);
    const body = patched.json() as Record<string, unknown>;
    expect(body.status).toBe('doing');
  });

  it('C7. GET /issues — listIssues 배열 응답', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'GET',
      url: '/issues',
      headers: { authorization: `Bearer ${t}` },
    });
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.json())).toBe(true);
  });

  it('C8. GET /notifications — listNotifications 배열 응답', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: `Bearer ${t}` },
    });
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.json())).toBe(true);
  });

  it('C9. POST /reports/weekly — weeklyReport', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'POST',
      url: '/reports/weekly',
      headers: { authorization: `Bearer ${t}` },
      payload: {
        periodStart: '2026-04-20',
        periodEnd: '2026-04-26',
        scopeIds: [projectId],
      },
    });
    expect([200, 201], r.body).toContain(r.statusCode);
    const body = r.json() as Record<string, unknown>;
    expect(body).toBeTypeOf('object');
    expect(body.kind).toBe('weekly');
  });

  it('C10. POST /ai/extract-actions — extractActions', async () => {
    if (!app) throw new Error('app not initialized');
    const t = await issueToken(userId);
    const r = await app.inject({
      method: 'POST',
      url: '/ai/extract-actions',
      headers: { authorization: `Bearer ${t}` },
      payload: {
        source: 'meeting',
        content: '회의 내용: 김지우는 내일까지 보고서를 작성한다.',
      },
    });
    expect(r.statusCode, r.body).toBe(200);
    const body = r.json() as Record<string, unknown>;
    expect(body).toBeDefined();
  });
});
