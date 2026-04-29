import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { identityRoutes } from './identity.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

interface PrismaUserMock {
  user: {
    findFirst: (args: { where: { id: string; deletedAt: null } }) => Promise<unknown>;
    update?: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
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

async function makeJws(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/identity — GET /users/me', () => {
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
    const r = await app.inject({ method: 'GET', url: '/users/me' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('정상: User 스키마로 응답 (email 없으면 필드 제거)', async () => {
    const app = await buildTestApp({
      user: {
        findFirst: async () => ({
          id: 'u1',
          name: '박서연',
          role: 'PM',
          dept: '플랫폼',
          initials: '박',
          color: '#5B7FFF',
          email: null,
        }),
      },
    });
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Record<string, unknown>;
    expect(body.id).toBe('u1');
    expect(body.name).toBe('박서연');
    expect('email' in body).toBe(false);
    await app.close();
  });

  it('email 있으면 포함', async () => {
    const app = await buildTestApp({
      user: {
        findFirst: async () => ({
          id: 'u2',
          name: '김지우',
          role: 'BE',
          dept: '백엔드',
          initials: '김',
          color: '#21C077',
          email: 'jw@example.com',
        }),
      },
    });
    const token = await makeJws({ sub: 'u2' });
    const r = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { email: string }).email).toBe('jw@example.com');
    await app.close();
  });

  it('DB에 사용자가 없으면 404', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => null },
    });
    const token = await makeJws({ sub: 'u-missing' });
    const r = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    expect((r.json() as { error: { code: string } }).error.code).toBe('NOT_FOUND');
    await app.close();
  });
});

describe('modules/identity — PATCH /users/me', () => {
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
    const r = await app.inject({ method: 'PATCH', url: '/users/me', payload: { name: 'x' } });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('정상: name + dept 갱신 후 갱신본 응답', async () => {
    const updateCalls: { where: unknown; data: unknown }[] = [];
    const app = await buildTestApp({
      user: {
        findFirst: async () => ({ id: 'u1' }),
        update: async (args) => {
          updateCalls.push(args);
          return {
            id: 'u1',
            name: '박서연-NEW',
            role: 'PM',
            dept: '플랫폼-NEW',
            initials: '박',
            color: '#5B7FFF',
            email: null,
          };
        },
      },
    });
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '박서연-NEW', dept: '플랫폼-NEW' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Record<string, unknown>;
    expect(body.name).toBe('박서연-NEW');
    expect(body.dept).toBe('플랫폼-NEW');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      where: { id: 'u1' },
      data: { name: '박서연-NEW', dept: '플랫폼-NEW' },
    });
    await app.close();
  });

  it('빈 객체는 no-op로 통과 (update 호출은 발생하나 data는 빈 객체)', async () => {
    const app = await buildTestApp({
      user: {
        findFirst: async () => ({ id: 'u1' }),
        update: async () => ({
          id: 'u1',
          name: '박서연',
          role: 'PM',
          dept: '플랫폼',
          initials: '박',
          color: '#5B7FFF',
          email: null,
        }),
      },
    });
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(r.statusCode).toBe(200);
    await app.close();
  });

  it('잘못된 color (hex 아님) → 400', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => ({ id: 'u1' }) },
    });
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { color: 'not-a-hex' },
    });
    expect(r.statusCode).toBe(400);
    expect((r.json() as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
    await app.close();
  });

  it('알 수 없는 필드 (strict) → 400', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => ({ id: 'u1' }) },
    });
    const token = await makeJws({ sub: 'u1' });
    const r = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { id: 'spoof' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('사용자 없으면 404', async () => {
    const app = await buildTestApp({
      user: { findFirst: async () => null },
    });
    const token = await makeJws({ sub: 'u-missing' });
    const r = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'x' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });
});
