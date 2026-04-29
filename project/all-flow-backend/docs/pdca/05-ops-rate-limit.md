# T-501 — Rate-limit (per-IP + per-user) + helmet/cors

> Phase: 5 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 한도 초과 시 429 + Retry-After + 보안/CORS 헤더 부착
> Dependencies: [T-103]

## Plan

- 목표: 단일 플러그인으로 rate-limit + 보안 헤더 + CORS 적용.
- 범위:
  - per-IP, per-user 토큰 버킷 (`MemoryRateLimiter`)
  - 한도 초과 시 `RateLimitError` (429, traceId 포함)
  - 보안 헤더: nosniff/X-Frame/Referrer/HSTS/X-DNS-Prefetch
  - CORS: `*` 또는 명시적 origin allow
  - OPTIONS 프리플라이트 즉시 204 응답
  - skipPathPrefixes 로 `/health` 등 모니터링 경로 면제
- 결정/가정:
  - 외부 의존성(@fastify/rate-limit, @fastify/helmet, @fastify/cors) 추가하지 않고 onRequest/onSend 훅으로 구현 → 의존성 표면 최소화.
  - 분산 환경(T-503)에서 redis 어댑터로 교체 가능하도록 limiter 를 별도 클래스로 분리.
- 리스크:
  - 단일 프로세스 메모리 기반 → 다중 인스턴스에서는 정확하지 않음. T-503 에서 redis 기반 교체 명시.

## Do

- 추가 파일: `src/plugins/rate-limit.ts`, `src/plugins/rate-limit.test.ts`.
- 수정 파일: `src/app.ts` (rateLimitPlugin 등록).
- 추가 의존성: 없음.

## Check

- 단위 테스트 (6):
  - MemoryRateLimiter: 한도/만료/key 격리
  - Fastify 통합: 429 + Retry-After / 보안 헤더 / OPTIONS 204 / /health 면제
- typecheck/lint/build: 모두 그린.

## Act

- 학습한 패턴:
  - rate-limit 핵심 자료구조(MemoryRateLimiter) 를 클래스로 분리하면 단위 테스트가 시간 의존 없이 결정론적.
  - 보안 헤더는 onSend 훅에서 일괄 부착 — 각 라우트가 신경 쓸 필요 없음.
- 메모리에 저장: 외부 의존성 없는 rate-limit + 보안 헤더 + CORS 통합 플러그인 패턴.
- 후속: T-503 통합테스트에서 redis 기반 분산 limiter 로 교체.
