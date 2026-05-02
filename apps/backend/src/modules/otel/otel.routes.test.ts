import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';

describe('modules/otel/otel.routes', () => {
  beforeAll(() => resetEnvForTests());
  afterAll(() => resetEnvForTests());

  it('GET /api/v1/otel/health (enabled=true) → 200 with endpoint', async () => {
    resetEnvForTests();
    const app = await buildApp({
      logger: false,
      otelState: { enabled: true, serviceName: 'all-flow-backend', endpoint: 'http://otel:4318' },
    });
    const r = await app.inject({ method: 'GET', url: '/api/v1/otel/health' });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { enabled: boolean; serviceName: string; endpoint: string | null };
    expect(body.enabled).toBe(true);
    expect(body.serviceName).toBe('all-flow-backend');
    expect(body.endpoint).toBe('http://otel:4318');
    await app.close();
  });

  it('GET /api/v1/otel/health (enabled=false) → 200 with endpoint=null', async () => {
    resetEnvForTests();
    const app = await buildApp({
      logger: false,
      otelState: { enabled: false, serviceName: 'all-flow-backend', endpoint: null },
    });
    const r = await app.inject({ method: 'GET', url: '/api/v1/otel/health' });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { enabled: boolean; endpoint: null };
    expect(body.enabled).toBe(false);
    expect(body.endpoint).toBeNull();
    await app.close();
  });
});
