import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { auditLogRoutes } from './audit-log.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock prisma 시그니처 신뢰.
type AnyArgs = any;

interface AuditLogRow {
  id: string;
  action: string;
  actorId: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actor?: { id: string; name: string; initials: string | null; color: string | null };
}

interface UserRow {
  id: string;
  name: string;
  initials: string | null;
  color: string | null;
}

function makeStore() {
  const logs = new Map<string, AuditLogRow>();
  const users = new Map<string, UserRow>();
  let seq = 0;

  users.set('u1', { id: 'u1', name: '테스트 유저', initials: 'T', color: '#aaa' });

  return {
    auditLog: {
      findMany: async (args: AnyArgs) => {
        const take = args?.take ?? 50;
        const skip = args?.skip ?? 0;
        const items = Array.from(logs.values())
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(skip, skip + take)
          .map((row) => ({
            ...row,
            actor: users.get(row.actorId) ?? null,
          }));
        return items;
      },
      count: async () => logs.size,
      createMany: async (args: AnyArgs) => {
        for (const data of args.data) {
          seq += 1;
          const row: AuditLogRow = {
            id: `log-${seq}`,
            action: data.action,
            actorId: data.actorId,
            targetType: data.targetType,
            targetId: data.targetId ?? null,
            metadata: data.metadata ?? null,
            createdAt: new Date(Date.now() + seq),
          };
          logs.set(row.id, row);
        }
        return { count: args.data.length };
      },
    },
    user: {
      findFirst: async () => users.get('u1') ?? null,
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  app.decorate('prisma', store as never);
  await app.register(authPlugin);
  await app.register(auditLogRoutes);
  return { app, store };
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/audit-log — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET /audit-log)', async () => {
    const { app } = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/audit-log' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /audit-log → 200 + { items, total, page, limit }', async () => {
    const { app } = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/audit-log',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(Array.isArray(body.items)).toBe(true);
    await app.close();
  });

  it('빈 DB일 때 빈 배열 반환 (자동 시드 없음)', async () => {
    const { app } = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/audit-log',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.total).toBe(0);
    expect(body.items).toHaveLength(0);
    await app.close();
  });

  it('page=1&limit=2 쿼리 파라미터 반영', async () => {
    const { app } = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/audit-log?page=1&limit=2',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
    await app.close();
  });

  it('데이터 있을 때 정상 목록 반환', async () => {
    const { app, store } = await buildTestApp();
    const token = await makeJws('u1');

    // 직접 시드
    await store.auditLog.createMany({
      data: [
        { action: 'user.login', actorId: 'u1', targetType: 'User', targetId: 'u1' },
        { action: 'project.created', actorId: 'u1', targetType: 'Project', metadata: { name: '테스트' } },
      ],
    });

    const r = await app.inject({
      method: 'GET',
      url: '/audit-log',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.total).toBeGreaterThan(0);
    await app.close();
  });
});
