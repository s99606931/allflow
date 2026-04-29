import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { channelsRoutes } from './channels.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(authPlugin);
  await app.register(channelsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/channels — BE-N6', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401', async () => {
    const app = await buildTestApp();
    expect((await app.inject({ method: 'GET', url: '/channels' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/channels/ch-general/messages',
          payload: { text: 'hi' },
        })
      ).statusCode,
    ).toBe(401);
    await app.close();
  });

  it('GET → public 채널 + caller 가 멤버인 private/dm', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/channels',
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(r.statusCode).toBe(200);
    const ids = (r.json() as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain('ch-general');
    expect(ids).toContain('ch-design');
    expect(ids).toContain('dm-u1-u2');
    await app.close();
  });

  it('GET → 비멤버는 private/dm 제외', async () => {
    const app = await buildTestApp();
    const u9 = await makeJws('u9');
    const r = await app.inject({
      method: 'GET',
      url: '/channels',
      headers: { authorization: `Bearer ${u9}` },
    });
    const ids = (r.json() as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain('ch-general'); // public
    expect(ids).not.toContain('ch-design');
    expect(ids).not.toContain('dm-u1-u2');
    await app.close();
  });

  it('POST → 201 + 메시지 본문', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/channels/ch-general/messages',
      headers: { authorization: `Bearer ${u1}` },
      payload: { text: '안녕하세요' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({
      channelId: 'ch-general',
      authorId: 'u1',
      text: '안녕하세요',
    });
    await app.close();
  });

  it('POST → 비멤버 private 채널 403', async () => {
    const app = await buildTestApp();
    const u9 = await makeJws('u9');
    const r = await app.inject({
      method: 'POST',
      url: '/channels/ch-design/messages',
      headers: { authorization: `Bearer ${u9}` },
      payload: { text: 'hi' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('POST → 존재하지 않는 채널 400', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/channels/missing/messages',
      headers: { authorization: `Bearer ${u1}` },
      payload: { text: 'hi' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → 빈 text 400', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/channels/ch-general/messages',
      headers: { authorization: `Bearer ${u1}` },
      payload: { text: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
