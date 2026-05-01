import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { navCountsRoutes } from './nav-counts.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface NavCountsMock {
  projectMember: { count: (args: AnyArgs) => Promise<number> };
  task: { count: (args: AnyArgs) => Promise<number> };
  issue: { count: (args: AnyArgs) => Promise<number> };
  approval: { count: (args: AnyArgs) => Promise<number> };
  client: { count: (args: AnyArgs) => Promise<number> };
  notification: { count: (args: AnyArgs) => Promise<number> };
}

function makeDefaultMock(overrides?: Partial<NavCountsMock>): NavCountsMock {
  return {
    projectMember: { count: async () => 3 },
    task: { count: async () => 7 },
    issue: { count: async () => 2 },
    approval: { count: async () => 5 },
    client: { count: async () => 12 },
    notification: { count: async () => 1 },
    ...overrides,
  };
}

async function buildTestApp(prismaMock: NavCountsMock = makeDefaultMock()) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  app.decorate('prisma', prismaMock as never);
  await app.register(authPlugin);
  await app.register(navCountsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/nav — GET /nav-counts', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/nav-counts' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('정상: 6개 집계 필드 모두 반환', async () => {
    const app = await buildTestApp(makeDefaultMock());
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/nav-counts',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Record<string, number>;
    expect(typeof body.projects).toBe('number');
    expect(typeof body.tasks).toBe('number');
    expect(typeof body.issues).toBe('number');
    expect(typeof body.approvals).toBe('number');
    expect(typeof body.clients).toBe('number');
    expect(typeof body.notifications).toBe('number');
    await app.close();
  });

  it('정상: mock 값과 일치하는 숫자 반환', async () => {
    const app = await buildTestApp(
      makeDefaultMock({
        projectMember: { count: async () => 3 },
        task: { count: async () => 7 },
        issue: { count: async () => 2 },
        approval: { count: async () => 5 },
        client: { count: async () => 12 },
        notification: { count: async () => 1 },
      }),
    );
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/nav-counts',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      projects: 3,
      tasks: 7,
      issues: 2,
      approvals: 5,
      clients: 12,
      notifications: 1,
    });
    await app.close();
  });

  it('모든 카운트가 0인 경우도 정상 응답', async () => {
    const app = await buildTestApp(
      makeDefaultMock({
        projectMember: { count: async () => 0 },
        task: { count: async () => 0 },
        issue: { count: async () => 0 },
        approval: { count: async () => 0 },
        client: { count: async () => 0 },
        notification: { count: async () => 0 },
      }),
    );
    const token = await makeJws('u-empty');
    const r = await app.inject({
      method: 'GET',
      url: '/nav-counts',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      projects: 0,
      tasks: 0,
      issues: 0,
      approvals: 0,
      clients: 0,
      notifications: 0,
    });
    await app.close();
  });

  it('projectMember.count에 userId가 전달되는지 확인', async () => {
    const capturedArgs: AnyArgs[] = [];
    const app = await buildTestApp(
      makeDefaultMock({
        projectMember: {
          count: async (args: AnyArgs) => {
            capturedArgs.push(args);
            return 1;
          },
        },
      }),
    );
    const token = await makeJws('u-check');
    await app.inject({
      method: 'GET',
      url: '/nav-counts',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(capturedArgs).toHaveLength(1);
    expect(capturedArgs[0]?.where?.userId).toBe('u-check');
    await app.close();
  });

  it('notification.count에 userId와 read:false 조건이 전달되는지 확인', async () => {
    const capturedArgs: AnyArgs[] = [];
    const app = await buildTestApp(
      makeDefaultMock({
        notification: {
          count: async (args: AnyArgs) => {
            capturedArgs.push(args);
            return 4;
          },
        },
      }),
    );
    const token = await makeJws('u-notif');
    await app.inject({
      method: 'GET',
      url: '/nav-counts',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(capturedArgs).toHaveLength(1);
    expect(capturedArgs[0]?.where?.userId).toBe('u-notif');
    expect(capturedArgs[0]?.where?.read).toBe(false);
    await app.close();
  });
});
