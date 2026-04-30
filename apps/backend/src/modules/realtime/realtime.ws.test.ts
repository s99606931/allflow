import sensible from '@fastify/sensible';
/**
 * T-302 — WebSocket 라우트 통합 테스트.
 *
 * 검증 항목:
 *  - token 미지정 시 4401 close.
 *  - 잘못된 token 시 4401 close.
 *  - 정상 토큰 → 연결 성립 + realtimeBus.publish 이벤트 수신.
 *  - per-user fan-out: 다른 userId 의 publish 는 수신하지 않음.
 */
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { resetEnvForTests } from '../../config/env.js';
import type { RealtimeEvent } from '../../shared/schemas/index.js';
import { realtimeWsRoutes } from './realtime.ws.js';
import { realtimeBus } from './realtime-bus.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

async function buildWsApp(): Promise<FastifyInstance> {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = Fastify({ logger: false });
  await app.register(sensible);
  await app.register(websocket);
  await app.register(realtimeWsRoutes);
  await app.listen({ port: 0, host: '127.0.0.1' });
  return app;
}

function getWsUrl(app: FastifyInstance, query = ''): string {
  const addr = app.server.address();
  if (!addr || typeof addr === 'string') throw new Error('no address');
  return `ws://127.0.0.1:${addr.port}/realtime/ws${query}`;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

function waitClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once('close', (code, reason) => resolve({ code, reason: reason.toString() }));
  });
}

function waitMessage(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('message timeout')), 2000);
    ws.once('message', (raw) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(raw.toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const SAMPLE_EVENT: RealtimeEvent = {
  type: 'notification',
  payload: {
    id: 'n1',
    kind: 'mention',
    title: 'hello',
    time: new Date().toISOString(),
    read: false,
  },
};

describe('modules/realtime — GET /realtime/ws', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildWsApp();
  });

  afterAll(async () => {
    await app.close();
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('token 미지정 → 4401 close', async () => {
    const ws = new WebSocket(getWsUrl(app));
    const { code } = await waitClose(ws);
    expect(code).toBe(4401);
  });

  it('잘못된 token → 4401 close', async () => {
    const ws = new WebSocket(`${getWsUrl(app)}?token=not-a-jwt`);
    const { code } = await waitClose(ws);
    expect(code).toBe(4401);
  });

  it('정상 토큰 → 연결 후 publish 수신', async () => {
    const token = await makeJws('u-alpha');
    const ws = new WebSocket(`${getWsUrl(app)}?token=${token}`);
    await new Promise<void>((res) => ws.once('open', () => res()));

    // bus가 구독자를 인지할 때까지 잠깐 대기 (subscribe 는 동기지만, 연결 직후 race 방지)
    await new Promise((r) => setTimeout(r, 30));

    const received = waitMessage(ws);
    realtimeBus.publish(SAMPLE_EVENT, { userId: 'u-alpha' });
    const msg = (await received) as RealtimeEvent;
    expect(msg.type).toBe('notification');
    ws.close();
    await waitClose(ws);
  });

  it('다른 userId publish 는 수신하지 않음', async () => {
    const token = await makeJws('u-beta');
    const ws = new WebSocket(`${getWsUrl(app)}?token=${token}`);
    await new Promise<void>((res) => ws.once('open', () => res()));
    await new Promise((r) => setTimeout(r, 30));

    let received = false;
    ws.on('message', () => {
      received = true;
    });
    realtimeBus.publish(SAMPLE_EVENT, { userId: 'u-other' });
    await new Promise((r) => setTimeout(r, 100));
    expect(received).toBe(false);
    ws.close();
    await waitClose(ws);
  });

  it('client ping → server pong', async () => {
    const token = await makeJws('u-ping');
    const ws = new WebSocket(`${getWsUrl(app)}?token=${token}`);
    await new Promise<void>((res) => ws.once('open', () => res()));

    const reply = waitMessage(ws);
    ws.send(JSON.stringify({ type: 'ping' }));
    const pong = (await reply) as { type: string };
    expect(pong.type).toBe('pong');
    ws.close();
    await waitClose(ws);
  });
});
