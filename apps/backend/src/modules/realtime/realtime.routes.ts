/**
 * SSE 엔드포인트 — `GET /realtime/sse`.
 *
 * 응답:
 *  - Content-Type: `text/event-stream`
 *  - 각 이벤트는 `data: <JSON>\n\n` 형식 (RealtimeEvent discriminated union).
 *  - keep-alive 주석(`: ping\n\n`) 30초마다 송신.
 *
 * 인증: 표준 Bearer 토큰. `req.user.id` 만 fan-out 대상.
 *
 * 후속:
 *  - WS(socket.io) 호환 어댑터: T-302
 *  - Redis Pub/Sub fan-out: T-303
 */
import type { FastifyInstance } from 'fastify';
import { realtimeBus } from './realtime-bus.js';

const KEEPALIVE_INTERVAL_MS = 30_000;

export async function realtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/realtime/sse', { preHandler: [app.authenticate] }, async (req, reply) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // 초기 hello — 클라이언트 연결 확인용.
    reply.raw.write(`: connected userId=${userId}\n\n`);

    const unsubscribe = realtimeBus.subscribe(userId, (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    const keepAlive = setInterval(() => {
      reply.raw.write(`: ping ${Date.now()}\n\n`);
    }, KEEPALIVE_INTERVAL_MS);

    req.raw.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
      reply.raw.end();
    });

    // Fastify 가 응답을 자동으로 닫지 않도록 hijack 모드.
    return reply;
  });
}
