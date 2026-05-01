import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { notificationsRoutes } from './notifications.routes.js';

const TEST_AUTH = 'e'.repeat(16) + 'f'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

type NotificationKind = 'mention' | 'sla' | 'ai' | 'system' | 'comment';

interface NotifRow {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  actor: string | null;
  href: string | null;
  read: boolean;
  createdAt: Date;
  readAt: Date | null;
}

function makeStore() {
  const rows = new Map<string, NotifRow>();
  let seq = 0;
  return {
    rows,
    seed(userId: string, partial: Partial<NotifRow> = {}): NotifRow {
      seq += 1;
      const row: NotifRow = {
        id: `notif-${seq}`,
        userId,
        kind: 'system',
        title: `알림 ${seq}`,
        body: null,
        actor: null,
        href: null,
        read: false,
        createdAt: new Date(Date.now() + seq),
        readAt: null,
        ...partial,
      };
      rows.set(row.id, row);
      return row;
    },
    findMany: async (args: AnyArgs) => {
      const userId = args?.where?.userId;
      const read = args?.where?.read;
      const take: number = args?.take ?? 100;
      let list = Array.from(rows.values());
      if (userId) list = list.filter((r) => r.userId === userId);
      if (typeof read === 'boolean') list = list.filter((r) => r.read === read);
      return list
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take);
    },
    findFirst: async (args: AnyArgs) => {
      const id = args?.where?.id;
      const userId = args?.where?.userId;
      const found = Array.from(rows.values()).find(
        (r) => r.id === id && r.userId === userId,
      );
      return found ?? null;
    },
    update: async (args: AnyArgs) => {
      const cur = rows.get(args.where.id);
      if (!cur) throw new Error('not found');
      const updated: NotifRow = { ...cur, ...args.data, readAt: args.data.readAt ?? cur.readAt };
      rows.set(cur.id, updated);
      return updated;
    },
    updateMany: async (args: AnyArgs) => {
      const userId = args?.where?.userId;
      const readFilter = args?.where?.read;
      let count = 0;
      for (const [id, row] of rows.entries()) {
        if (userId && row.userId !== userId) continue;
        if (typeof readFilter === 'boolean' && row.read !== readFilter) continue;
        rows.set(id, { ...row, ...args.data });
        count += 1;
      }
      return { count };
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  app.decorate('prisma', {
    notification: {
      findMany: store.findMany,
      findFirst: store.findFirst,
      update: store.update,
      updateMany: store.updateMany,
    },
    revokedToken: {
      findUnique: async () => null,
    },
    _store: store,
  } as never);
  await app.register(authPlugin);
  await app.register(notificationsRoutes);
  return { app, store };
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/notifications — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET /notifications)', async () => {
    const { app } = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/notifications' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST /notifications/:id/read)', async () => {
    const { app } = await buildTestApp();
    const r = await app.inject({ method: 'POST', url: '/notifications/some-id/read' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST /notifications/read-all)', async () => {
    const { app } = await buildTestApp();
    const r = await app.inject({ method: 'POST', url: '/notifications/read-all' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /notifications → 본인 알림 목록 반환', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');
    store.seed('u1', { kind: 'mention', title: '멘션 알림' });
    store.seed('u2', { kind: 'system', title: '다른 사용자 알림' });

    const r = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ id: string; title: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.title).toBe('멘션 알림');
    await app.close();
  });

  it('GET /notifications?unread=true → 미읽음만 반환', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');
    store.seed('u1', { read: false, title: '미읽음' });
    store.seed('u1', { read: true, title: '읽음' });

    const r = await app.inject({
      method: 'GET',
      url: '/notifications?unread=true',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ title: string; read: boolean }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.title).toBe('미읽음');
    await app.close();
  });

  it('GET /notifications → unread 파라미터 없으면 전체 반환', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');
    store.seed('u1', { read: false, title: '미읽음' });
    store.seed('u1', { read: true, title: '읽음' });

    const r = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ title: string; read: boolean }>;
    expect(list).toHaveLength(2);
    await app.close();
  });

  it('GET /notifications → wire 형식 검증 (time/kind/read 필드)', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');
    store.seed('u1', { kind: 'ai', title: 'AI 알림', body: '내용', actor: 'bot', href: '/ai' });

    const r = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: `Bearer ${token}` },
    });
    const list = r.json() as Array<{
      id: string;
      kind: string;
      title: string;
      read: boolean;
      time: string;
      body?: string;
      actor?: string;
      href?: string;
    }>;
    expect(list[0]).toMatchObject({
      kind: 'ai',
      title: 'AI 알림',
      read: false,
      body: '내용',
      actor: 'bot',
      href: '/ai',
    });
    expect(typeof list[0]?.time).toBe('string');
    await app.close();
  });

  it('POST /notifications/:id/read → 200 + read: true', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');
    const notif = store.seed('u1', { read: false, title: '읽기 전' });

    const r = await app.inject({
      method: 'POST',
      url: `/notifications/${notif.id}/read`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const updated = r.json();
    expect(updated.read).toBe(true);
    await app.close();
  });

  it('POST /notifications/:id/read → 다른 사용자 알림은 404', async () => {
    const { app, store } = await buildTestApp();
    const u1 = await makeJws('u1');
    const notif = store.seed('u2', { title: 'u2 소유 알림' });

    const r = await app.inject({
      method: 'POST',
      url: `/notifications/${notif.id}/read`,
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /notifications/:id/read → 존재하지 않는 id는 404', async () => {
    const { app } = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/notifications/non-existent-id/read',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /notifications/read-all → { updated: N } 반환', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');
    store.seed('u1', { read: false });
    store.seed('u1', { read: false });
    store.seed('u1', { read: true });
    store.seed('u2', { read: false });

    const r = await app.inject({
      method: 'POST',
      url: '/notifications/read-all',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ updated: 2 });
    await app.close();
  });

  it('POST /notifications/read-all → 미읽음 없으면 updated: 0', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');
    store.seed('u1', { read: true });

    const r = await app.inject({
      method: 'POST',
      url: '/notifications/read-all',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ updated: 0 });
    await app.close();
  });
});
