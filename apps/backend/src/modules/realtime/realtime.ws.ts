/**
 * WebSocket 엔드포인트 — `GET /realtime/ws`.
 *
 * 책임:
 *  - 프런트엔드 `useRealtime()` (native WebSocket) 호환.
 *  - 인증: `?token=<JWT>` query string (브라우저 WS API는 헤더 설정 불가).
 *  - 메시지 송신 형식: 단일 RealtimeEvent 를 JSON.stringify 한 텍스트 프레임.
 *  - 클라이언트 → 서버 메시지: 현재 ping/echo 외 미사용 (확장 여지).
 *
 * Redis Pub/Sub fan-out (T-303) 도입 시:
 *  - realtimeBus.publish 가 Redis 채널로 위임되면 멀티노드 자동 fan-out.
 *  - 본 라우트는 그대로 유지.
 *
 * 비고: 프런트엔드(`src/lib/realtime.ts`)가 socket.io 클라이언트가 아닌
 * 표준 WebSocket 을 쓰므로, socket.io 서버 대신 native WS 로 호환성 확보.
 * 이 결정은 PDCA T-302 문서에 기록.
 */
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { getEnv } from '../../config/env.js';
import { verifyToken } from '../../plugins/auth.js';
import { AuthError } from '../../shared/errors.js';
import { realtimeBus } from './realtime-bus.js';

const KEEPALIVE_INTERVAL_MS = 30_000;

interface WsQuery {
  token?: string;
}

export async function realtimeWsRoutes(app: FastifyInstance): Promise<void> {
  const env = getEnv();
  if (!env.AUTH_SECRET) {
    throw new Error('[realtime/ws] AUTH_SECRET 미설정');
  }
  const secret = env.AUTH_SECRET;
  const salt = process.env.AUTH_SALT ?? 'authjs.session-token';

  app.get<{ Querystring: WsQuery }>('/realtime/ws', { websocket: true }, async (socket, req) => {
    const ws = socket as unknown as WebSocket;
    const token = req.query?.token;
    if (!token) {
      ws.close(4401, 'token required');
      return;
    }
    let userId: string;
    try {
      const user = await verifyToken(token, { secret, salt });
      userId = user.id;
    } catch (err) {
      const reason = err instanceof AuthError ? err.message : 'invalid token';
      ws.close(4401, reason.slice(0, 120));
      return;
    }

    const unsubscribe = realtimeBus.subscribe(userId, (event) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });

    const keepAlive = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, KEEPALIVE_INTERVAL_MS);

    ws.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

    ws.on('message', (raw) => {
      // 프런트엔드 send()는 mock 외 사용처가 없으나, 서버는 echo/ping 만 받음.
      try {
        const text = typeof raw === 'string' ? raw : raw.toString('utf8');
        const parsed = JSON.parse(text) as { type?: string };
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
        }
      } catch {
        // 잘못된 페이로드는 무시(연결 유지).
      }
    });
  });
}
