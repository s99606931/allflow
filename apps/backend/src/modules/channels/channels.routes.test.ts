import type { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { channelsRoutes } from './channels.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

const MOCK_CHANNELS = [
  { id: 'ch-general', name: '일반', kind: 'public', createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-eng', name: 'engineering', kind: 'public', createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-design', name: 'design', kind: 'private', createdAt: new Date(), updatedAt: new Date() },
  { id: 'dm-u1-u2', name: '김민수 ↔ 이서연', kind: 'dm', createdAt: new Date(), updatedAt: new Date() },
];

function makeMockPrisma() {
  return {
    channel: {
      count: async () => MOCK_CHANNELS.length,
      findMany: async () => MOCK_CHANNELS,
      findUnique: async ({ where }: { where: { id: string } }) =>
        MOCK_CHANNELS.find((c) => c.id === where.id) ?? null,
      createMany: async () => ({ count: 0 }),
    },
    message: {
      create: async ({ data }: { data: { content: string; channelId: string; authorId: string } }) => ({
        id: 'msg-test-1',
        content: data.content,
        channelId: data.channelId,
        authorId: data.authorId,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: data.authorId, name: 'Test User', initials: 'TU', color: '#5b6cff' },
      }),
      findMany: async () => [],
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  await app.register(authPlugin);
  if (!app.hasDecorator('prisma')) {
    app.decorate('prisma', makeMockPrisma() as unknown as PrismaClient);
  }
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

  it('GET → 인증된 사용자에게 모든 채널 반환', async () => {
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

  it('POST → 201 + 메시지 본문 (content 필드)', async () => {
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
      content: '안녕하세요',
    });
    await app.close();
  });

  it('POST → DM 채널 403 (미지원)', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/channels/dm-u1-u2/messages',
      headers: { authorization: `Bearer ${u1}` },
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

  it('GET /channels/:id/messages → 200 + 메시지 배열', async () => {
    const app = await buildTestApp();
    const u1 = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/channels/ch-general/messages',
      headers: { authorization: `Bearer ${u1}` },
    });
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.json())).toBe(true);
    await app.close();
  });
});
