import { SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { __resetResourcesForTests, resourcesRoutes } from './resources.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(authPlugin);
  await app.register(resourcesRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/resources — BE-N4', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });
  afterEach(() => {
    __resetResourcesForTests();
  });

  it('인증 없으면 401 (GET, POST /book)', async () => {
    const app = await buildTestApp();
    expect((await app.inject({ method: 'GET', url: '/resources' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/resources/book',
          payload: {
            resourceId: 'room-101',
            start: '2026-05-04T01:00:00Z',
            end: '2026-05-04T02:00:00Z',
          },
        })
      ).statusCode,
    ).toBe(401);
    await app.close();
  });

  it('GET /resources → 시드 카탈로그 반환', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/resources',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ id: string; kind: string }>;
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((x) => x.kind === 'room')).toBe(true);
    await app.close();
  });

  it('POST /resources/book → 200 + booking', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      resourceId: 'room-101',
      start: '2026-05-04T01:00:00Z',
      end: '2026-05-04T02:00:00Z',
      bookedBy: 'u1',
    });
    await app.close();
  });

  it('POST → 충돌 시 409', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const ok = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(ok.statusCode).toBe(200);
    const dup = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:30:00Z',
        end: '2026-05-04T02:30:00Z',
      },
    });
    expect(dup.statusCode).toBe(409);
    await app.close();
  });

  it('POST → boundary touch 허용', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    const adj = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T02:00:00Z',
        end: '2026-05-04T03:00:00Z',
      },
    });
    expect(adj.statusCode).toBe(200);
    await app.close();
  });

  it('POST → 다른 resourceId 는 충돌 아님', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    const other = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-102',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(other.statusCode).toBe(200);
    await app.close();
  });

  it('POST → 존재하지 않는 resourceId 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-999',
        start: '2026-05-04T01:00:00Z',
        end: '2026-05-04T02:00:00Z',
      },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → end<=start 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/resources/book',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resourceId: 'room-101',
        start: '2026-05-04T02:00:00Z',
        end: '2026-05-04T01:00:00Z',
      },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
