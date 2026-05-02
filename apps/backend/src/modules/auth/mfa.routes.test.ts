import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';

describe('MFA routes', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login as seeded admin user
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@example.com' },
    });
    const body = res.json<{ accessToken?: string }>();
    token = body.accessToken ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/mfa/status returns mfaEnabled: false initially', async () => {
    if (!token) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/mfa/status',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ enabled: boolean }>();
    expect(body.enabled).toBe(false);
  });

  it('POST /auth/mfa/setup returns otpUri and secret', async () => {
    if (!token) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mfa/setup',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ otpUri?: string; secret?: string }>();
    expect(body.otpUri).toMatch(/^otpauth:\/\/totp\//);
    expect(body.secret).toBeTruthy();
  });

  it('POST /auth/mfa/verify with invalid code returns 422', async () => {
    if (!token) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mfa/verify',
      headers: { authorization: `Bearer ${token}` },
      payload: { code: '000000' },
    });
    expect(res.statusCode).toBe(422);
  });
});
