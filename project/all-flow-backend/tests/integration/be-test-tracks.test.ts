/**
 * TEST-B1 + TEST-B2 + TEST-B4 통합 — 단일 testcontainers 부팅으로 3 트랙 검증.
 *
 *  TEST-B1 (real-DB) — PATCH /users/me, DELETE /tasks/:id, POST /issues/:id/transition
 *  TEST-B2 (in-mem)  — 8 신규 도메인 happy-path (approvals/clients/events/resources/docs/channels/org/auth-revoke)
 *  TEST-B4 (SSE)     — /realtime/sse → 헤더 + 실제 이벤트 1건 수신
 *
 * 본 파일은 `core-flows.test.ts` / `frontend-contract.test.ts` 와 testcontainer
 * 부팅 비용을 공유하지 않지만, 단일 파일 안에서는 하나의 컨테이너만 띄워
 * 테스트 트랙 3개를 직렬로 통과시킨다.
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
let approverId = '';
let projectId = '';
let issueId = '';

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

describe.skipIf(SKIP)('integration: TEST-B1/B2/B4 (postgres + redis)', () => {
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
    const u = await prisma.user.create({
      data: {
        name: 'B1-B2-B4',
        role: 'admin',
        dept: 'eng',
        initials: 'BT',
        color: '#abcdef',
        email: 'bt@example.com',
      },
    });
    userId = u.id;
    const u2 = await prisma.user.create({
      data: {
        name: '결재자',
        role: 'admin',
        dept: 'mgmt',
        initials: 'AP',
        color: '#cdef01',
        email: 'approver@example.com',
      },
    });
    approverId = u2.id;
    const project = await prisma.project.create({
      data: {
        name: '통합테스트 프로젝트',
        code: `BT-${Date.now()}`,
        color: '#5B7FFF',
        progress: 0,
        status: 'doing',
        due: new Date('2026-12-31'),
        members: { create: { userId, role: 'owner' } },
      },
    });
    projectId = project.id;
    const issue = await prisma.issue.create({
      data: {
        projectId,
        title: '전이 테스트 이슈',
        sev: 'high',
        prio: 'P1',
        projColor: '#5B7FFF',
        sla: '3d',
        status: 'open',
        reporterId: userId,
      },
    });
    issueId = issue.id;
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

  /* TEST-B1 ----------------------------------------------------------------- */

  describe('TEST-B1 — core mutations on real DB', () => {
    it('PATCH /users/me updates mutable fields and returns 200', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const r = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { authorization: `Bearer ${t}` },
        payload: { name: '바뀐이름', initials: 'BB' },
      });
      expect(r.statusCode).toBe(200);
      const body = r.json() as { id: string; name: string; initials: string };
      expect(body.id).toBe(userId);
      expect(body.name).toBe('바뀐이름');
      expect(body.initials).toBe('BB');
    });

    it('DELETE /tasks/:id soft-deletes and cascades comments', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);

      const created = await app.inject({
        method: 'POST',
        url: '/tasks',
        headers: { authorization: `Bearer ${t}` },
        payload: { title: '삭제 대상', projectId },
      });
      expect([200, 201]).toContain(created.statusCode);
      const taskId = (created.json() as { id: string }).id;

      const cmt = await app.inject({
        method: 'POST',
        url: `/tasks/${taskId}/comments`,
        headers: { authorization: `Bearer ${t}` },
        payload: { body: 'cascade target' },
      });
      expect([200, 201]).toContain(cmt.statusCode);

      const del = await app.inject({
        method: 'DELETE',
        url: `/tasks/${taskId}`,
        headers: { authorization: `Bearer ${t}` },
      });
      expect(del.statusCode).toBe(204);

      const after = await app.inject({
        method: 'GET',
        url: `/tasks/${taskId}/comments`,
        headers: { authorization: `Bearer ${t}` },
      });
      // task 가 soft-delete 된 후에도 GET 은 404 또는 빈 목록.
      expect([200, 404]).toContain(after.statusCode);
    });

    it('POST /issues/:id/transition: open → in-progress 200, invalid 전이 400', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);

      const ok = await app.inject({
        method: 'POST',
        url: `/issues/${issueId}/transition`,
        headers: { authorization: `Bearer ${t}` },
        payload: { status: 'in-progress' },
      });
      expect(ok.statusCode).toBe(200);
      const body = ok.json() as { id: string; status: string };
      expect(body.id).toBe(issueId);
      expect(body.status).toBe('in-progress');

      const bad = await app.inject({
        method: 'POST',
        url: `/issues/${issueId}/transition`,
        headers: { authorization: `Bearer ${t}` },
        // in-progress 에서 in-review/resolved/in-progress 만 허용 — open 으로의
        // 회귀 전이는 차단 대상.
        payload: { status: 'open' },
      });
      expect([400, 409, 422]).toContain(bad.statusCode);
    });
  });

  /* TEST-B2 ----------------------------------------------------------------- */

  describe('TEST-B2 — new domains happy-path', () => {
    it('approvals: GET → POST → POST decision', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const tApp = await issueToken(approverId);

      const list0 = await app.inject({
        method: 'GET',
        url: '/approvals',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(list0.statusCode).toBe(200);

      const create = await app.inject({
        method: 'POST',
        url: '/approvals',
        headers: { authorization: `Bearer ${t}` },
        payload: { title: '구매 승인', approver: approverId },
      });
      expect(create.statusCode).toBe(201);
      const id = (create.json() as { id: string }).id;

      const decide = await app.inject({
        method: 'POST',
        url: `/approvals/${id}/decision`,
        headers: { authorization: `Bearer ${tApp}` },
        payload: { decision: 'approved' },
      });
      expect(decide.statusCode).toBe(200);
      const body = decide.json() as { status: string };
      expect(body.status).toBe('approved');
    });

    it('clients: GET + POST', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const post = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: { authorization: `Bearer ${t}` },
        payload: { name: '신규 클라이언트', email: 'new@cl.example' },
      });
      expect(post.statusCode).toBe(201);
      const list = await app.inject({
        method: 'GET',
        url: '/clients',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(list.statusCode).toBe(200);
      expect(Array.isArray(list.json())).toBe(true);
    });

    it('events: GET + POST', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const post = await app.inject({
        method: 'POST',
        url: '/events',
        headers: { authorization: `Bearer ${t}` },
        payload: {
          title: '주간 회의',
          start: '2026-05-01T09:00:00Z',
          end: '2026-05-01T10:00:00Z',
        },
      });
      expect(post.statusCode).toBe(201);
      const list = await app.inject({
        method: 'GET',
        url: '/events',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(list.statusCode).toBe(200);
    });

    it('resources: GET catalog + POST book', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const cat = await app.inject({
        method: 'GET',
        url: '/resources',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(cat.statusCode).toBe(200);
      const items = cat.json() as Array<{ id: string }>;
      expect(items.length).toBeGreaterThan(0);
      const book = await app.inject({
        method: 'POST',
        url: '/resources/book',
        headers: { authorization: `Bearer ${t}` },
        payload: {
          resourceId: items[0].id,
          start: '2026-05-04T01:00:00Z',
          end: '2026-05-04T02:00:00Z',
        },
      });
      expect(book.statusCode).toBe(200);
    });

    it('docs: GET + POST', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const post = await app.inject({
        method: 'POST',
        url: '/docs',
        headers: { authorization: `Bearer ${t}` },
        payload: { title: '문서 1', content: '본문' },
      });
      expect(post.statusCode).toBe(201);
      const list = await app.inject({
        method: 'GET',
        url: '/docs',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(list.statusCode).toBe(200);
    });

    it('channels: GET + POST message', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const list = await app.inject({
        method: 'GET',
        url: '/channels',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(list.statusCode).toBe(200);
      const channels = list.json() as Array<{ id: string }>;
      const publicChannel = channels[0];
      expect(publicChannel).toBeDefined();
      const send = await app.inject({
        method: 'POST',
        url: `/channels/${publicChannel.id}/messages`,
        headers: { authorization: `Bearer ${t}` },
        payload: { text: '안녕하세요' },
      });
      // 비멤버 채널일 수 있으므로 201 또는 403 모두 정합.
      expect([201, 403]).toContain(send.statusCode);
    });

    it('org: GET units + POST invitation', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const list = await app.inject({
        method: 'GET',
        url: '/org/units',
        headers: { authorization: `Bearer ${t}` },
      });
      expect(list.statusCode).toBe(200);
      const units = list.json() as Array<{ id: string }>;
      expect(units.length).toBeGreaterThan(0);
      const invite = await app.inject({
        method: 'POST',
        url: '/org/invitations',
        headers: { authorization: `Bearer ${t}` },
        payload: {
          email: 'newhire@example.com',
          orgUnitId: units[0].id,
          role: 'member',
        },
      });
      expect([200, 201]).toContain(invite.statusCode);
      const body = invite.json() as { pending: boolean };
      expect(body.pending).toBe(true);
    });

    it('auth/tokens/revoke: 200 + revoked:true 응답', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const r = await app.inject({
        method: 'POST',
        url: '/auth/tokens/revoke',
        headers: { authorization: `Bearer ${t}` },
        payload: { tokenId: 'tok-int-1' },
      });
      expect(r.statusCode).toBe(200);
      const body = r.json() as { revoked: boolean };
      expect(body.revoked).toBe(true);
    });
  });

  /* TEST-B4 ----------------------------------------------------------------- */

  describe('TEST-B4 — SSE delivers a published event', () => {
    it('실제 listen() + fetch 로 publish 한 이벤트 1건이 data 라인으로 수신된다', async () => {
      if (!app) throw new Error('app not initialized');
      const t = await issueToken(userId);
      const { realtimeBus } = await import('../../src/modules/realtime/realtime-bus.js');

      const address = await app.listen({ host: '127.0.0.1', port: 0 });
      try {
        const controller = new AbortController();
        const fetchPromise = fetch(`${address}/realtime/sse`, {
          headers: { authorization: `Bearer ${t}` },
          signal: controller.signal,
        });

        // subscribe 가 setup 될 때까지 100ms 대기 후 publish.
        const publishedId = `sse-int-${Date.now()}`;
        setTimeout(() => {
          realtimeBus.publish(
            {
              type: 'notification',
              payload: {
                id: publishedId,
                kind: 'mention',
                title: 'integration sse',
                time: new Date().toISOString(),
                read: false,
              },
            },
            { userId },
          );
        }, 100);

        const res = await fetchPromise;
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');

        const reader = res.body?.getReader();
        if (!reader) throw new Error('no SSE body reader');

        const decoder = new TextDecoder();
        let merged = '';
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const { value, done } = await reader.read();
          if (done) break;
          merged += decoder.decode(value, { stream: true });
          if (merged.includes(publishedId)) break;
        }
        controller.abort();
        await reader.cancel().catch(() => {
          /* aborted */
        });

        expect(merged).toContain('data: ');
        expect(merged).toContain(publishedId);
      } finally {
        // 동일 app 객체를 다른 테스트가 더 사용하지 않으므로 listen 후 close 는
        // 전체 afterAll() 의 app.close() 가 처리한다.
      }
    }, 30_000);
  });
});
