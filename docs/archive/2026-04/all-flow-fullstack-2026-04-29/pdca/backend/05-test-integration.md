# T-503 — 통합 테스트 (testcontainers: postgres + redis)

> Phase: 5 | Owner: QA | Status: done | Created: 2026-04-28
> Acceptance: vitest --run tests/integration 그린
> Dependencies: [T-202, T-203, T-301]

## Plan

- 목표: 단위 테스트 mock 으로는 잡히지 않는 실제 Prisma 연결, JWT 검증, SSE 헤더, 라우트 와이어링까지 한 번에 보장.
- 범위: postgres 16 + redis 7 컨테이너 부팅 → migrate deploy → 시드 → 핵심 흐름 5종 검증.
- 결정/가정:
  - testcontainers 라이브러리 도입 (devDep). 컨테이너 부팅 비용으로 단위 테스트와 분리된 별도 컨피그(`vitest.integration.config.ts`).
  - Docker 데몬이 없는 환경에서는 `setup.ts` 가 `INTEGRATION_DISABLED=1` 을 설정하고 `describe.skipIf(SKIP)` 로 자동 우회 → CI 와 로컬 모두에서 안전.
  - tsconfig 분리: 빌드용은 `src/` 만, 통합 테스트용은 `tsconfig.tests.json` 로 분리하여 rootDir 충돌 회피.
- 리스크: 컨테이너 풀-온/오프 시간(~7s) → 단위 테스트와 분리. CI 에서는 별도 잡으로 실행 권장.

## Do

- 추가 파일:
  - `vitest.integration.config.ts` — 단일 워커, 120s testTimeout, `tests/integration/**/*.test.ts` only
  - `tests/integration/setup.ts` — Docker 가용성 사전 점검 → 자동 skip
  - `tests/integration/core-flows.test.ts` — 5 흐름(F1~F5) 단일 컨테이너 라이프사이클
  - `tsconfig.tests.json` — tests + src 통합 typecheck 용
- 수정 파일:
  - `package.json` — `typecheck` 가 `tsconfig.tests.json` 도 검사
  - `tsconfig.json` — tests/ 제외 (빌드 rootDir 단일화)
- 추가 의존성: `testcontainers ^11.14.0` (devDep)
- 핵심 코드:
  - 단일 `beforeAll` 에서 postgres/redis 컨테이너 부팅 → `pnpm prisma migrate deploy` → 사용자/프로젝트 시드 → buildApp(registerDb=true, registerRoutes=true)
  - `afterAll` 에서 app/redis/pg 순차 종료
  - SSE 흐름은 inject 가 끊지 않으므로 `Promise.race` 로 1.5s 타임아웃 + 헤더 검증

## Check

- 통합 테스트:
  - `pnpm test:int` → **5/5 PASS**, 실행 시간 ~12s
  - F1 health, F2 /users/me, F3 task CRUD round-trip, F4 SSE 헤더, F5 /ai/complete + citations
- 단위 테스트: `pnpm test` → 23 files / 150 tests PASS (변동 없음)
- typecheck: 3 컨피그(메인/시드/테스트) 모두 클린
- lint: 0 error

## Act

- 학습한 패턴:
  - testcontainers + describe.skipIf 로 "Docker 있으면 실행, 없으면 skip" 패턴 → CI 회복력 ↑
  - tsconfig 3중화(빌드/시드/테스트)로 rootDir 충돌 회피
- 메모리에 저장: 통합 테스트 = 단위 테스트와 분리된 컨피그 + 단일 워커 + 컨테이너 1회 부팅
- 후속 태스크 영향:
  - T-602 frontend USE_MOCK=false E2E 의 dependency 충족
  - 추후 통합 테스트 추가 시 동일 setup 재사용
- 회고: testcontainers 가 자동으로 ryuk(컨테이너 GC) 실행 → leak 안전.
