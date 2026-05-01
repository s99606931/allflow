import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';

async function buildTestApp() {
  resetEnvForTests();
  const app = await buildApp({ logger: false });
  return app;
}

describe('modules/health', () => {
  beforeAll(() => {
    resetEnvForTests();
  });
  afterAll(() => {
    resetEnvForTests();
  });

  it('GET /health → 200 + status ok', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.version).toBe('string');
    await app.close();
  });

  it('GET /api/v1/health → 200 (이중 등록 확인)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.status).toBe('ok');
    await app.close();
  });

  it('GET /health 는 인증 없이 접근 가능 (no 401)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).not.toBe(401);
    await app.close();
  });
});
