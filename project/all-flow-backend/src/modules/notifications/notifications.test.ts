/**
 * T-304 — notifications 모듈 통합 테스트.
 */
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { notificationsRoutes } from './notifications.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

interface NotificationFindManyArgs {
  where: { userId: string; read?: boolean };
  orderBy: { createdAt: 'desc' };
  take: number;
}
interface NotificationFindFirstArgs {
  where: { id: string; userId: string };
  select: { id: true };
}
interface NotificationUpdateArgs {
  where: { id: string };
  data: { read: true; readAt: Date };
}
interface NotificationUpdateManyArgs {
  where: { userId: string; read: false };
  data: { read: true; readAt: Date };
}

interface PrismaMock {
  notification: {
    findMany: (args: NotificationFindManyArgs) => Promise<unknown>;
    findFirst: (args: NotificationFindFirstArgs) => Promise<unknown>;
    update: (args: NotificationUpdateArgs) => Promise<unknown>;
    updateMany: (args: NotificationUpdateManyArgs) => Promise<unknown>;
  };
}

async function buildTestApp(prismaMock: PrismaMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  app.decorate('prisma', prismaMock as never);
  await app.register(authPlugin);
  await app.register(notificationsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

const sampleRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'n1',
  kind: 'mention',
  title: 'hi',
  body: null,
  actor: null,
  href: null,
  read: false,
  createdAt: new Date('2026-04-28T00:00:00Z'),
  ...over,
});

describe('modules/notifications', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp({
      notification: {
        findMany: async () => [],
        findFirst: async () => null,
        update: async () => sampleRow(),
        updateMany: async () => ({ count: 0 }),
      },
    });
    const r = await app.inject({ method: 'GET', url: '/notifications' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /notifications → 본인 알림 OpenAPI Notification 형태로 반환', async () => {
    const box: { captured?: NotificationFindManyArgs } = {};
    const app = await buildTestApp({
      notification: {
        findMany: async (args) => {
          box.captured = args;
          return [sampleRow({ id: 'n1', read: false }), sampleRow({ id: 'n2', read: true })];
        },
        findFirst: async () => null,
        update: async () => sampleRow(),
        updateMany: async () => ({ count: 0 }),
      },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{ id: string; time: string }>;
    expect(body).toHaveLength(2);
    expect(body[0]?.id).toBe('n1');
    expect(typeof body[0]?.time).toBe('string');
    expect(box.captured?.where.userId).toBe('u1');
    expect(box.captured?.where.read).toBeUndefined();
    await app.close();
  });

  it('GET /notifications?unread=true → where.read=false 적용', async () => {
    const box: { captured?: NotificationFindManyArgs } = {};
    const app = await buildTestApp({
      notification: {
        findMany: async (args) => {
          box.captured = args;
          return [sampleRow({ read: false })];
        },
        findFirst: async () => null,
        update: async () => sampleRow(),
        updateMany: async () => ({ count: 0 }),
      },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/notifications?unread=true',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(box.captured?.where.read).toBe(false);
    await app.close();
  });

  it('POST /notifications/:id/read → 본인 소유 아니면 404', async () => {
    const app = await buildTestApp({
      notification: {
        findMany: async () => [],
        findFirst: async () => null,
        update: async () => sampleRow(),
        updateMany: async () => ({ count: 0 }),
      },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/notifications/missing/read',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /notifications/:id/read → 본인 소유면 read=true', async () => {
    const box: { updated?: NotificationUpdateArgs } = {};
    const app = await buildTestApp({
      notification: {
        findMany: async () => [],
        findFirst: async () => ({ id: 'n1' }),
        update: async (args) => {
          box.updated = args;
          return sampleRow({ id: 'n1', read: true });
        },
        updateMany: async () => ({ count: 0 }),
      },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/notifications/n1/read',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { id: string; read: boolean };
    expect(body.id).toBe('n1');
    expect(body.read).toBe(true);
    expect(box.updated?.data.read).toBe(true);
    await app.close();
  });

  it('POST /notifications/read-all → 본인 미읽음 일괄 갱신', async () => {
    const box: { captured?: NotificationUpdateManyArgs } = {};
    const app = await buildTestApp({
      notification: {
        findMany: async () => [],
        findFirst: async () => null,
        update: async () => sampleRow(),
        updateMany: async (args) => {
          box.captured = args;
          return { count: 3 };
        },
      },
    });
    const token = await makeJws('u-batch');
    const r = await app.inject({
      method: 'POST',
      url: '/notifications/read-all',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { updated: number }).updated).toBe(3);
    expect(box.captured?.where.userId).toBe('u-batch');
    expect(box.captured?.where.read).toBe(false);
    await app.close();
  });
});
