# T-301 — SSE: GET /realtime/sse + 4종 fan-out

> Phase: 3 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: notification/activity/presence/chat 4종 이벤트 SSE fan-out
> Dependencies: [T-201]

## Plan

- 목표: 단일 노드에서 SSE 스트림으로 4종 이벤트 fan-out.
- 결정/가정:
  - 단계적 도입: T-301(in-memory bus + SSE) → T-302(WebSocket) → T-303(Redis Pub/Sub).
  - publish() 인터페이스를 고정하여 redis 스왑이 라우트 변경 없이 가능하도록 설계.
  - SSE keep-alive: 30초 주석(`: ping`).
  - 인증: 표준 Bearer 토큰 (preHandler 재사용).

## Do

- 추가 파일:
  - `src/modules/realtime/realtime-bus.ts` — `RealtimeBus` 클래스 + 글로벌 싱글턴.
  - `src/modules/realtime/realtime.routes.ts` — `GET /realtime/sse`.
  - `src/modules/realtime/realtime-bus.test.ts` — 4 invariant 테스트.
- 수정 파일: `src/app.ts` (realtimeRoutes 등록).
- 추가 의존성: 없음.

## Check

- 단위 테스트(4): 글로벌 fan-out / per-user / unsubscribe / 멀티 디바이스.
- typecheck/lint: 그린.

## Act

- 학습한 패턴: SSE 는 `reply.raw.writeHead/write` + `req.raw.on('close')` 만 있으면 Fastify hijack 으로 충분.
- 후속:
  - T-302 socket.io 어댑터: `realtimeBus.subscribe` 를 socket emit 으로 연결.
  - T-303 redis: `publish` 를 `redis.publish` 로 위임 + 로컬 subscriber 가 redis.subscribe.
