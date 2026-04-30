import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildApp } from '../app.js';
import { AuthError, NotFoundError, ValidationError } from '../shared/errors.js';

async function appUnderTest() {
  const app = await buildApp({ logger: false, env: { NODE_ENV: 'test', HOST: '0', PORT: 1 } });

  app.get('/__zod', async () => {
    z.object({ x: z.number() }).parse({ x: 'no' });
  });
  app.get('/__auth', async () => {
    throw new AuthError();
  });
  app.get('/__notfound', async () => {
    throw new NotFoundError('Project', 'p99');
  });
  app.get('/__validation', async () => {
    throw new ValidationError('잘못된 input', { field: 'x' });
  });
  app.get('/__crash', async () => {
    throw new Error('boom');
  });
  return app;
}

describe('plugins/error-handler', () => {
  it('ZodError → 400 VALIDATION_FAILED + 이슈 리스트', async () => {
    const app = await appUnderTest();
    const r = await app.inject({ method: 'GET', url: '/__zod' });
    expect(r.statusCode).toBe(400);
    const body = r.json() as { error: { code: string; details: unknown[]; traceId: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(typeof body.error.traceId).toBe('string');
    await app.close();
  });

  it('AuthError → 401', async () => {
    const app = await appUnderTest();
    const r = await app.inject({ method: 'GET', url: '/__auth' });
    expect(r.statusCode).toBe(401);
    expect((r.json() as { error: { code: string } }).error.code).toBe('AUTH_REQUIRED');
    await app.close();
  });

  it('NotFoundError → 404', async () => {
    const app = await appUnderTest();
    const r = await app.inject({ method: 'GET', url: '/__notfound' });
    expect(r.statusCode).toBe(404);
    expect((r.json() as { error: { code: string } }).error.code).toBe('NOT_FOUND');
    await app.close();
  });

  it('ValidationError(custom) → 400 + details 보존', async () => {
    const app = await appUnderTest();
    const r = await app.inject({ method: 'GET', url: '/__validation' });
    expect(r.statusCode).toBe(400);
    const body = r.json() as { error: { code: string; details: { field: string } } };
    expect(body.error.details.field).toBe('x');
    await app.close();
  });

  it('Unhandled error → 500 INTERNAL + traceId', async () => {
    const app = await appUnderTest();
    const r = await app.inject({ method: 'GET', url: '/__crash' });
    expect(r.statusCode).toBe(500);
    const body = r.json() as { error: { code: string; message: string; traceId: string } };
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('내부 서버 오류');
    expect(body.error.traceId).toBeDefined();
    await app.close();
  });

  it('Unknown route → 404 NOT_FOUND with method+url', async () => {
    const app = await appUnderTest();
    const r = await app.inject({ method: 'GET', url: '/no-such-route' });
    expect(r.statusCode).toBe(404);
    const body = r.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('/no-such-route');
    await app.close();
  });
});
