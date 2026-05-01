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
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeRevokedTokenStore();
  app.decorate('prisma', {
    revokedToken: {
      findUnique: store.findUnique,
      upsert: store.upsert,
    },
    // biome-ignore lint/suspicious/noExplicitAny: 테스트 mock stub
    user: { findUnique: async (_: AnyArgs) => null },
  } as AnyArgs);
  await app.register(authPlugin);
  await app.register(authRoutes);
  return app;
}

async function makeJws(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
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
