# T-002 — Fastify 5 부트 + /health 엔드포인트 + Pino 로깅

> Phase: 0 | Owner: Backend-A | Status: done | Created: 2026-04-28 | Completed: 2026-04-28
> Acceptance: GET /health → 200 {status:ok, uptime, version}
> Dependencies: [T-001]

## Plan

- **목표**: Fastify 5 인스턴스를 부팅하고, `/health` liveness 엔드포인트를 노출하며, Pino 구조화 로깅을 적용한다.
- **범위**:
  - `src/app.ts` — Fastify 인스턴스 빌더 + 플러그인 등록 (sensible, healthRoutes)
  - `src/server.ts` — 부트 + listen + graceful shutdown
  - `src/modules/health/health.routes.ts` — `/health` 라우트
  - `src/version.ts` — VERSION 상수 분리
  - `pino-pretty` (dev only) + `pino` 기본 logger
- **결정**:
  - Fastify 옵션: `requestIdHeader: x-request-id`, `trustProxy: true` (게이트웨이 뒤 가정).
  - 로거: prod = 기본 JSON / dev = pino-pretty (가독성).
  - shutdown: SIGINT/SIGTERM → `app.close()` 호출 후 exit. K8s preStop hook 대비.
  - **app.ts와 server.ts 분리** — 통합 테스트(supertest)에서 listen 없이 inject 가능.
  - PORT 파싱은 별도 함수 (1~65535 범위 검증).
- **가정**:
  - T-003에서 zod env가 `process.env` 직접 접근을 대체한다. 지금은 임시 fallback (PORT=8080, HOST=0.0.0.0).
  - readiness 체크(/ready)는 T-101 이후 별도 분리 — DB/Redis 연결 검증 필요.
- **리스크**:
  - pino-pretty는 dev 전용 → prod 번들에 포함되면 안 됨. tsup external 목록에 미등록 상태이지만, pino가 dynamic import로 로드하므로 esbuild가 자동 분리.
  - `disableRequestLogging: false` → 프로덕션 트래픽에서 로그량 폭증 가능 → T-502 OTel 통합 시 샘플링 도입.

## Do

- 추가 파일:
  - `/data/allflow/project/all-flow-backend/src/app.ts`
  - `/data/allflow/project/all-flow-backend/src/version.ts`
  - `/data/allflow/project/all-flow-backend/src/modules/health/health.routes.ts`
- 수정 파일:
  - `/data/allflow/project/all-flow-backend/src/server.ts` (placeholder → 실제 boot)
  - `/data/allflow/project/all-flow-backend/package.json` (`dependencies` 에 fastify/sensible/pino/pino-pretty 추가)
- 추가 의존성 (production):
  - `fastify ^5.8.5`
  - `@fastify/sensible ^6.0.4` (httpErrors helper, 후속 에러 핸들러용)
  - `pino ^10.3.1`
  - `pino-pretty ^13.1.3` (dev 가독성)
- 핵심 코드 스냅샷:

  ```typescript
  // src/app.ts
  export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
    const app = Fastify({
      logger: options.logger ?? defaultLogger(),
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'reqId',
      trustProxy: true,
    });
    await app.register(sensible);
    await app.register(healthRoutes);
    return app;
  }
  ```

  ```typescript
  // src/modules/health/health.routes.ts
  app.get('/health', async () => ({
    status: 'ok' as const,
    uptime: Math.round(process.uptime()),
    version: VERSION,
  }));
  ```

## Check

- [x] `pnpm typecheck` 그린 — 8 files, 에러 0
- [x] `pnpm lint` 그린 — 8 files, 에러 0
- [x] **boot 검증** (PORT=18080):
  - `curl /health` → `{"status":"ok","uptime":3,"version":"0.1.0"}`
  - `curl -o /dev/null -w "%{http_code}"` → `HTTP 200`
- [x] **로그 검증**: pino-pretty로 색상화 출력, `reqId: "req-2"`, `responseTime: 0.36ms` 정상
- [x] **graceful shutdown**: SIGTERM 수신 후 `app.close()` 정상 종료 확인
- 수동 검증:
  - `process.uptime()` 실제 값(3초) 반영됨
  - VERSION 상수가 응답에 정확히 매핑됨

## Act

- 학습한 패턴:
  - **app.ts ↔ server.ts 분리** — 통합 테스트(supertest/light-my-request)에서 listen 없이 inject 가능. 모든 후속 모듈은 이 패턴 따름.
  - **Pino reqId** — Fastify가 자동으로 모든 요청 로그에 reqId를 부착 → T-502 OTel traceId와 매핑 시 유용.
  - **dynamic import via pino-pretty** — pino가 transport를 자식 워커로 로드 → 메인 스레드 블로킹 없음.
  - **uptime을 정수 초로 round** — JSON 직렬화 안정성 (e.g. 3.123456 → 3).
- 메모리에 저장:
  - 모든 라우트 모듈은 `async function xxxRoutes(app: FastifyInstance)` 시그니처 표준.
  - `httpErrors` helper는 sensible 플러그인에서 제공 → T-104 에러 핸들러에서 재활용.
  - graceful shutdown은 K8s 환경 필수 — preStop hook + terminationGracePeriodSeconds 30s 권장.
- 후속 태스크 영향:
  - **T-003 (zod env)**: `parsePort` / `process.env` 직접 접근을 검증된 config 객체로 교체.
  - **T-005 (CI)**: `pnpm build` 도 추가해 tsup 번들 검증 필요.
  - **T-101 (Prisma)**: `app.register(prismaPlugin)` 으로 `app.prisma` 접근자 추가.
  - **T-103 (JWT)**: `app.register(authPlugin)` — preHandler에서 req.user 주입.
  - **T-501 (rate-limit)**: `@fastify/rate-limit` 등록.
- 회고:
  - Fastify 5 부트가 단순했다 — 기본 옵션이 합리적이고 sensible 플러그인이 후속 에러 처리 부담 감소.
  - `disableRequestLogging: false` 결정은 dev 단계 한정 — prod 단계 진입 시 명시적으로 false로 두고 `customRequestLogging` 도입 고려.
  - PDCA 사이클 2회차에서 **scaffold 그린 → 실제 부팅 검증** 단계로 진전. 다음 사이클은 T-003 (zod env)이 자연스러운 진행.
