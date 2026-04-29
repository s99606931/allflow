import { hkdf } from 'node:crypto';
import { promisify } from 'node:util';
import { EncryptJWT, SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { resetEnvForTests } from '../config/env.js';
import { authPlugin } from './auth.js';

const hkdfAsync = promisify(hkdf);

// 테스트 전용 더미 시크릿 (32+ chars). production 시크릿과 무관.
const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);
const SALT = 'authjs.session-token';

async function deriveKey(s: string, salt: string): Promise<Uint8Array> {
  const info = `Auth.js Generated Encryption Key (${salt})`;
  const buf = await hkdfAsync('sha256', s, salt, info, 32);
  return new Uint8Array(buf);
}

async function makeJws(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

async function makeJwe(payload: Record<string, unknown>): Promise<string> {
  const key = await deriveKey(TEST_AUTH, SALT);
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .encrypt(key);
}

async function appUnderTest() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(authPlugin);
  app.get('/__me', { preHandler: [app.authenticate] }, async (req) => req.user);
  return app;
}

describe('plugins/auth', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('Authorization 헤더 없으면 401', async () => {
    const app = await appUnderTest();
    const r = await app.inject({ method: 'GET', url: '/__me' });
    expect(r.statusCode).toBe(401);
    const body = r.json() as { error: { code: string } };
    expect(body.error.code).toBe('AUTH_REQUIRED');
    await app.close();
  });

  it('Bearer 형식 위반 시 401', async () => {
    const app = await appUnderTest();
    const r = await app.inject({
      method: 'GET',
      url: '/__me',
      headers: { authorization: 'Token xyz' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('잘못된 JWS 토큰 → 401', async () => {
    const app = await appUnderTest();
    const r = await app.inject({
      method: 'GET',
      url: '/__me',
      headers: { authorization: 'Bearer not.a.valid.token' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('유효한 JWS 토큰 → 200 + req.user 주입', async () => {
    const app = await appUnderTest();
    const token = await makeJws({ sub: 'u1', name: '박서연', email: 'sy@example.com' });
    const r = await app.inject({
      method: 'GET',
      url: '/__me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { id: string; name: string; email: string };
    expect(body.id).toBe('u1');
    expect(body.name).toBe('박서연');
    await app.close();
  });

  it('next-auth v5 JWE 토큰 → 200 (HKDF + dir/A256GCM)', async () => {
    const app = await appUnderTest();
    const token = await makeJwe({ sub: 'me', name: '김지우' });
    const r = await app.inject({
      method: 'GET',
      url: '/__me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { id: string }).id).toBe('me');
    await app.close();
  });

  it('payload에 sub 없으면 401', async () => {
    const app = await appUnderTest();
    const token = await makeJws({ name: 'noid' });
    const r = await app.inject({
      method: 'GET',
      url: '/__me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });
});
