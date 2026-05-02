import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { authRoutes } from './auth.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

function makeRevokedTokenStore() {
  const revoked = new Set<string>();
  return {
    findUnique: async (args: AnyArgs) => {
      const tokenId = args?.where?.tokenId as string;
      return revoked.has(tokenId) ? { tokenId } : null;
    },
    upsert: async (args: AnyArgs) => {
      const tokenId = args?.where?.tokenId as string;
      revoked.add(tokenId);
      return { tokenId };
    },
    has: (tokenId: string) => revoked.has(tokenId),
  };
}

interface SessionRow {
  id: string;
  userId: string;
  jti: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
}

function makeSessionStore() {
  const rows: SessionRow[] = [];
  let counter = 0;
  return {
    rows,
    create: async (args: AnyArgs) => {
      const data = args?.data ?? {};
      const row: SessionRow = {
        id: `sess-${++counter}`,
        userId: data.userId,
        jti: data.jti,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        createdAt: new Date(),
        expiresAt: data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt),
      };
      rows.push(row);
      return row;
    },
    findUnique: async (args: AnyArgs) => {
      const id = args?.where?.id as string;
      return rows.find((r) => r.id === id) ?? null;
    },
    findMany: async (args: AnyArgs) => {
      const where = args?.where ?? {};
      let out = rows.filter((r) => (where.userId ? r.userId === where.userId : true));
      if (where.expiresAt?.gt) out = out.filter((r) => r.expiresAt > where.expiresAt.gt);
      if (where.jti?.not) out = out.filter((r) => r.jti !== where.jti.not);
      if (args?.orderBy?.createdAt === 'desc') {
        out = [...out].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (args?.select) {
        return out.map((r) => {
          const picked: Record<string, unknown> = {};
          for (const key of Object.keys(args.select)) picked[key] = (r as AnyArgs)[key];
          return picked;
        });
      }
      return out;
    },
    delete: async (args: AnyArgs) => {
      const id = args?.where?.id as string;
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) {
        const [removed] = rows.splice(idx, 1);
        return removed;
      }
      return null;
    },
    deleteMany: async (args: AnyArgs) => {
      const ids = args?.where?.id?.in as string[] | undefined;
      if (!ids) return { count: 0 };
      let n = 0;
      for (const id of ids) {
        const idx = rows.findIndex((r) => r.id === id);
        if (idx >= 0) {
          rows.splice(idx, 1);
          n++;
        }
      }
      return { count: n };
    },
  };
}

interface TestStores {
  revoked: ReturnType<typeof makeRevokedTokenStore>;
  session: ReturnType<typeof makeSessionStore>;
  user?: { findUnique: (args: AnyArgs) => Promise<AnyArgs> };
}

async function buildTestApp(opts?: { user?: TestStores['user'] }) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const stores: TestStores = {
    revoked: makeRevokedTokenStore(),
    session: makeSessionStore(),
    ...(opts?.user ? { user: opts.user } : {}),
  };
  const prismaMock: AnyArgs = {
    revokedToken: {
      findUnique: stores.revoked.findUnique,
      upsert: stores.revoked.upsert,
    },
    session: {
      create: stores.session.create,
      findUnique: stores.session.findUnique,
      findMany: stores.session.findMany,
      delete: stores.session.delete,
      deleteMany: stores.session.deleteMany,
    },
    user: stores.user ?? { findUnique: async (_: AnyArgs) => null },
    auditLog: { create: async () => ({ id: 'log-1' }) },
    $transaction: async (ops: Promise<AnyArgs>[]) => Promise.all(ops),
  };
  app.decorate('prisma', prismaMock);
  await app.register(authPlugin);
  await app.register(authRoutes);
  // expose stores for assertions
  (app as AnyArgs).__stores = stores;
  return app;
}

async function makeJws(payload: Record<string, unknown>): Promise<string> {
  const { jti, ...rest } = payload as { jti?: string } & Record<string, unknown>;
  let signer = new SignJWT(rest)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h');
  if (typeof jti === 'string') signer = signer.setJti(jti);
  return signer.sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/auth — POST /auth/tokens/revoke', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      payload: { tokenId: 'tok-abc' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('정상: tokenId만 → 200 + { revoked, tokenId }', async () => {
    const app = await buildTestApp();
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: 'tok-abc' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ revoked: true, tokenId: 'tok-abc' });
    await app.close();
  });

  it('reason 포함 → 200', async () => {
    const app = await buildTestApp();
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: 'tok-abc', reason: '의심스러운 활동' },
    });
    expect(r.statusCode).toBe(200);
    await app.close();
  });

  it('tokenId 누락 → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'no token' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('tokenId 빈 문자열 → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('알 수 없는 필드 (strict) → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: 'tok-abc', extra: 'nope' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('멱등: 동일 tokenId 두 번 호출도 200', async () => {
    const app = await buildTestApp();
    const token = await makeJws({ sub: 'u1' });
    const r1 = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: 'tok-idempotent' },
    });
    const r2 = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: 'tok-idempotent' },
    });
    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    await app.close();
  });

  it('revoke된 tokenId(jti)로 만든 토큰은 이후 인증 시 401', async () => {
    const app = await buildTestApp();
    const jti = 'jti-to-revoke';
    const token = await makeJws({ sub: 'u1', jti });

    // revoke 호출
    const rRevoke = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: jti },
    });
    expect(rRevoke.statusCode).toBe(200);

    // 이후 동일 jti 토큰으로 인증 시도 → 401
    const rProtected = await app.inject({
      method: 'POST',
      url: '/auth/tokens/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokenId: 'another-tok' },
    });
    expect(rProtected.statusCode).toBe(401);
    await app.close();
  });
});

describe('modules/auth — POST /auth/login (jti issuance)', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('정상: 로그인 시 Session 행 생성 + JWT.jti 임베드', async () => {
    const app = await buildTestApp({
      user: {
        findUnique: async (_: AnyArgs) => ({
          id: 'u1',
          email: 'user@example.com',
          name: 'User',
          deletedAt: null,
        }),
      },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh)' },
      payload: { email: 'user@example.com' },
    });
    expect(r.statusCode).toBe(200);
    const stores = (app as AnyArgs).__stores as TestStores;
    expect(stores.session.rows).toHaveLength(1);
    const created = stores.session.rows[0];
    expect(created?.userId).toBe('u1');
    expect(created?.userAgent).toBe('Mozilla/5.0 (Macintosh)');
    // jti must match the JWT payload — decode without verification by splitting.
    const body = r.json() as { accessToken: string };
    const segments = body.accessToken.split('.');
    expect(segments).toHaveLength(3);
    const payloadSegment = segments[1] as string;
    const jwtPayload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString()) as {
      jti?: string;
    };
    expect(jwtPayload.jti).toBe(created?.jti);
    await app.close();
  });

  it('production 환경에서는 404', async () => {
    process.env.NODE_ENV = 'production';
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@example.com' },
    });
    expect(r.statusCode).toBe(404);
    process.env.NODE_ENV = 'test';
    await app.close();
  });
});

describe('modules/auth — GET /auth/sessions', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/auth/sessions' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('만료되지 않은 본인 세션만 반환 + 현재 토큰은 current:true', async () => {
    const app = await buildTestApp();
    const stores = (app as AnyArgs).__stores as TestStores;
    const now = Date.now();
    stores.session.rows.push(
      {
        id: 'sess-active-1',
        userId: 'u1',
        jti: 'jti-current',
        userAgent: 'Macintosh',
        ipAddress: '127.0.0.1',
        createdAt: new Date(now - 60_000),
        expiresAt: new Date(now + 3_600_000),
      },
      {
        id: 'sess-active-2',
        userId: 'u1',
        jti: 'jti-other',
        userAgent: 'iPhone OS',
        ipAddress: '10.0.0.1',
        createdAt: new Date(now - 120_000),
        expiresAt: new Date(now + 3_600_000),
      },
      {
        id: 'sess-expired',
        userId: 'u1',
        jti: 'jti-expired',
        userAgent: 'Linux',
        ipAddress: '10.0.0.2',
        createdAt: new Date(now - 7_200_000),
        expiresAt: new Date(now - 3_600_000),
      },
      {
        id: 'sess-other-user',
        userId: 'u2',
        jti: 'jti-other-user',
        userAgent: 'Windows',
        ipAddress: '10.0.0.3',
        createdAt: new Date(now - 60_000),
        expiresAt: new Date(now + 3_600_000),
      },
    );
    const token = await makeJws({ sub: 'u1', jti: 'jti-current' });
    const r = await app.inject({
      method: 'GET',
      url: '/auth/sessions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { items: { id: string; jti: string; current: boolean; device: string }[] };
    expect(body.items).toHaveLength(2);
    const cur = body.items.find((s) => s.jti === 'jti-current');
    const other = body.items.find((s) => s.jti === 'jti-other');
    expect(cur?.current).toBe(true);
    expect(other?.current).toBe(false);
    expect(cur?.device).toContain('Mac');
    expect(other?.device).toContain('iPhone');
    await app.close();
  });
});

describe('modules/auth — DELETE /auth/sessions/:id', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('본인 세션 종료 → 200 + RevokedToken 등록 + Session 삭제', async () => {
    const app = await buildTestApp();
    const stores = (app as AnyArgs).__stores as TestStores;
    const now = Date.now();
    stores.session.rows.push({
      id: 'sess-to-end',
      userId: 'u1',
      jti: 'jti-to-end',
      userAgent: 'Macintosh',
      ipAddress: '127.0.0.1',
      createdAt: new Date(now),
      expiresAt: new Date(now + 3_600_000),
    });
    const token = await makeJws({ sub: 'u1', jti: 'jti-current' });
    const r = await app.inject({
      method: 'DELETE',
      url: '/auth/sessions/sess-to-end',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ revoked: true, id: 'sess-to-end' });
    expect(stores.session.rows.find((s) => s.id === 'sess-to-end')).toBeUndefined();
    expect(stores.revoked.has('jti-to-end')).toBe(true);
    await app.close();
  });

  it('타인 세션 종료 시도 → 404', async () => {
    const app = await buildTestApp();
    const stores = (app as AnyArgs).__stores as TestStores;
    const now = Date.now();
    stores.session.rows.push({
      id: 'sess-other-user',
      userId: 'u-other',
      jti: 'jti-other',
      userAgent: 'Windows',
      ipAddress: '10.0.0.1',
      createdAt: new Date(now),
      expiresAt: new Date(now + 3_600_000),
    });
    const token = await makeJws({ sub: 'u1', jti: 'jti-current' });
    const r = await app.inject({
      method: 'DELETE',
      url: '/auth/sessions/sess-other-user',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('존재하지 않는 세션 → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws({ sub: 'u1', jti: 'jti-current' });
    const r = await app.inject({
      method: 'DELETE',
      url: '/auth/sessions/sess-missing',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});

describe('modules/auth — DELETE /auth/sessions (others)', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('현재 jti 외 모든 세션 종료 → revoked count', async () => {
    const app = await buildTestApp();
    const stores = (app as AnyArgs).__stores as TestStores;
    const now = Date.now();
    stores.session.rows.push(
      {
        id: 'sess-current',
        userId: 'u1',
        jti: 'jti-current',
        userAgent: 'Macintosh',
        ipAddress: '127.0.0.1',
        createdAt: new Date(now),
        expiresAt: new Date(now + 3_600_000),
      },
      {
        id: 'sess-other-1',
        userId: 'u1',
        jti: 'jti-other-1',
        userAgent: 'iPhone',
        ipAddress: '10.0.0.1',
        createdAt: new Date(now),
        expiresAt: new Date(now + 3_600_000),
      },
      {
        id: 'sess-other-2',
        userId: 'u1',
        jti: 'jti-other-2',
        userAgent: 'iPad',
        ipAddress: '10.0.0.2',
        createdAt: new Date(now),
        expiresAt: new Date(now + 3_600_000),
      },
    );
    const token = await makeJws({ sub: 'u1', jti: 'jti-current' });
    const r = await app.inject({
      method: 'DELETE',
      url: '/auth/sessions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ revoked: 2 });
    expect(stores.session.rows.map((s) => s.id)).toEqual(['sess-current']);
    expect(stores.revoked.has('jti-other-1')).toBe(true);
    expect(stores.revoked.has('jti-other-2')).toBe(true);
    expect(stores.revoked.has('jti-current')).toBe(false);
    await app.close();
  });

  it('다른 세션이 없으면 revoked: 0', async () => {
    const app = await buildTestApp();
    const stores = (app as AnyArgs).__stores as TestStores;
    const now = Date.now();
    stores.session.rows.push({
      id: 'sess-only',
      userId: 'u1',
      jti: 'jti-current',
      userAgent: 'Macintosh',
      ipAddress: '127.0.0.1',
      createdAt: new Date(now),
      expiresAt: new Date(now + 3_600_000),
    });
    const token = await makeJws({ sub: 'u1', jti: 'jti-current' });
    const r = await app.inject({
      method: 'DELETE',
      url: '/auth/sessions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ revoked: 0 });
    expect(stores.session.rows).toHaveLength(1);
    await app.close();
  });
});
