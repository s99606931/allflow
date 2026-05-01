import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { otelRoutes } from './otel.routes.js';

async function buildTestApp(enabled: boolean) {
  resetEnvForTests();
  const app = await buildApp({ logger: false });
  await app.register(otelRoutes, {
    state: { enabled, serviceName: 'all-flow-backend', endpoint: enabled ? 'http://otel:4318' : null },
  });
  return app;
}

describe('modules/otel/otel.routes', () => {
  beforeAll(() => resetEnvForTests());
  afterAll(() => resetEnvForTests());

  it('GET /otel/health (enabled=true) → 200 with endpoint', async () => {
    const app = await buildTestApp(true);
    const r = await app.inject({ method: 'GET', url: '/otel/health' });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { enabled: boolean; serviceName: string; endpoint: string | null };
    expect(body.enabled).toBe(true);
    expect(body.serviceName).toBe('all-flow-backend');
    expect(body.endpoint).toBe('http://otel:4318');
    await app.close();
  });

  it('GET /otel/health (enabled=false) → 200 with endpoint=null', async () => {
    const app = await buildTestApp(false);
    const r = await app.inject({ method: 'GET', url: '/otel/health' });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { enabled: boolean; endpoint: null };
    expect(body.enabled).toBe(false);
    expect(body.endpoint).toBeNull();
    await app.close();
  });
});
