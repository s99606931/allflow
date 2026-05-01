import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { identityRoutes } from './identity.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface UserRow {
  id: string;
  name: string;
  role: string;
  dept: string;
  initials: string;
  color: string;
  email: string | null;
}

const SAMPLE_USERS: UserRow[] = [
  { id: 'u1', name: '김지우', role: 'BE', dept: '백엔드', initials: '김', color: '#21C077', email: 'jw@example.com' },
  { id: 'u2', name: '박서연', role: 'PM', dept: '플랫폼', initials: '박', color: '#5B7FFF', email: null },
];

interface PrismaUserMock {
  user: {
    findMany?: (args: AnyArgs) => Promise<UserRow[]>;
    findFirst?: (args: AnyArgs) => Promise<UserRow | { id: string } | null>;
    update?: (args: AnyArgs) => Promise<UserRow>;
  };
}

async function buildTestApp(prismaMock: PrismaUserMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  app.decorate('prisma', prismaMock as never);
  await app.register(authPlugin);
  await app.register(identityRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/identity — GET /users', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp({
      user: { findMany: async () => [] },
    });
    const r = await app.inject({ method: 'GET', url: '/users' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('정상: 사용자 목록 배열 반환', async () => {
    const app = await buildTestApp({
      user: { findMany: async () => SAMPLE_USERS },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as UserRow[];
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(2);
    await app.close();
  });

  it('정상: User 스키마 형태로 직렬화 (email null이면 필드 제거)', async () => {
    const app = await buildTestApp({
      user: { findMany: async () => SAMPLE_USERS },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${token}` },
    });
    const list = r.json() as Array<Record<string, unknown>>;
    const withEmail = list.find((u) => u.id === 'u1');
    const withoutEmail = list.find((u) => u.id === 'u2');
    expect(withEmail?.email).toBe('jw@example.com');
    expect('email' in (withoutEmail ?? {})).toBe(false);
    await app.close();
  });

  it('정상: 빈 목록도 배열로 반환', async () => {
    const app = await buildTestApp({
      user: { findMany: async () => [] },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
    await app.close();
  });

  it('findMany에 deletedAt:null 조건이 전달되는지 확인', async () => {
    const capturedArgs: AnyArgs[] = [];
    const app = await buildTestApp({
      user: {
        findMany: async (args: AnyArgs) => {
          capturedArgs.push(args);
          return [];
        },
      },
    });
    const token = await makeJws('u1');
    await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(capturedArgs).toHaveLength(1);
    expect(capturedArgs[0]?.where?.deletedAt).toBeNull();
    await app.close();
  });
});

describe('modules/identity — POST /users/invite', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/users/invite',
      payload: { email: 'new@example.com' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('정상: 새 이메일 초대 성공 → 200 + message + email', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => null },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/users/invite',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'new@example.com' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { message: string; email: string };
    expect(typeof body.message).toBe('string');
    expect(body.email).toBe('new@example.com');
    await app.close();
  });

  it('이미 등록된 이메일 → 400 VALIDATION_FAILED', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => ({ id: 'u-existing' } as { id: string }) },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/users/invite',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'existing@example.com' },
    });
    expect(r.statusCode).toBe(400);
    const body = r.json() as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
    await app.close();
  });

  it('잘못된 이메일 형식 → 400', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => null },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/users/invite',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'not-an-email' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('email 필드 누락 → 400', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => null },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/users/invite',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('알 수 없는 필드 (strict) → 400', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => null },
    });
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/users/invite',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'valid@example.com', role: 'admin' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
