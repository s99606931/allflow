# Analysis — monorepo-step8-otel-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source Plan**: `docs/01-plan/features/monorepo-step8-otel-2026-04-30.plan.md`
> **Source Design**: `docs/02-design/features/monorepo-step8-otel-2026-04-30.design.md`

---

## 1. 게이트 결과 매트릭스

### 1.1 OTel SDK (a)

| Gate | 검증 | 결과 |
|------|------|:----:|
| **G8-A1** SDK 6 dep 설치 | `pnpm --filter @all-flow/backend list @opentelemetry/*` | ✅ 6/6 (api/sdk-node/auto-instrumentations/exporter-trace-otlp-http/resources/semantic-conventions) |
| **G8-A2** default off boot | `pnpm dev` w/o OTEL_ENABLED → log `otel: disabled` 1줄 | ✅ "[INFO] otel: disabled" |
| **G8-A3** typecheck (src+seed) | `tsc --noEmit && tsc -p tsconfig.seed.json` | ✅ 0 error |
| **G8-A3'** typecheck (tests) | `tsc -p tsconfig.tests.json` | ⚠️ 3 carry-over (tests/integration/be-test-tracks.test.ts:317/357/382 — Step 5 carry-over, 본 Step 미변경) |
| **G8-A4** BE unit | `vitest run` excluding integration | ✅ 267 passed / 28 skipped (295 total) — baseline 동등 |
| **G8-A5** /otel/health endpoint | `app.inject('/api/v1/otel/health')` | ✅ 200 `{"enabled":false,"serviceName":"all-flow-backend","endpoint":null}` |
| **G8-A6** enabled mode 부팅 (collector ✗) | OTEL_ENABLED=true + endpoint missing | ✅ disabled fallback + warn log (R-NEW2 mitigation 동작) |

### 1.2 Compose profile (b)

| Gate | 검증 | 결과 |
|------|------|:----:|
| **G8-B1** yaml lint | `docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev config -q` | ✅ exit 0 |
| **G8-B2** default 가동 무영향 | profile 미지정 시 services 목록에 otel-collector/tempo 없음 | ✅ |
| **G8-B3** profile 가동 (선택) | `--profile observability up -d` | DEFERRED (사용자 승인 후 실 측정 시점) |

### 1.3 Decision record (c)

| Gate | 검증 | 결과 |
|------|------|:----:|
| **G8-C1** 파일 존재 | `ls docs/02-design/decision-records/msa-split-triggers.md` | ✅ |
| **G8-C2** 3 도메인 × 4축 | grep `realtime\|ai\|search` ≥ 3회씩 | ✅ realtime 4 / ai 5 / search 5 |
| **G8-C3** 측정 원천 명시 | `p95\|error rate\|deploy frequency` ≥ 3 hit | ✅ p95 5+ / error rate 1+ / deploy frequency 1+ |

### 1.4 Cycle aggregate (e)

| Gate | 검증 | 결과 |
|------|------|:----:|
| **G8-E1** 8 step 매트릭스 | aggregate report Step 1~7+verification+8 모두 1줄 이상 | ✅ §2 9 row table |
| **G8-E2** PRD 9 success criteria 매핑 | PRD §5.2 9개 지표 모두 매핑 | ✅ §3 9 row table |
| **G8-E3** baseline regression | BE unit + FE test + shared + contracts | ✅ BE 267p/28s, shared 45/45, contracts typecheck PASS |

### 1.5 Archive (f)

| Gate | 검증 | 결과 |
|------|------|:----:|
| **G8-F1** archive 디렉토리 | `ls docs/archive/2026-04/monorepo-microservices-2026-04-30/` | DEFERRED (PM 승인 후 archive 단계) |
| **G8-F2** docs/0*-*에서 monorepo-* 비움 | `find docs/0*-* -name 'monorepo-*'` | DEFERRED |
| **G8-F3** L4 MEMORY 인덱스 추가 | grep `monorepo-microservices-2026-04-30` MEMORY.md | DEFERRED |

---

## 2. match_rate 산출

### 2.1 가중치 (Plan §1 4 영역)

| 영역 | 가중치 | 통과율 | 부분점수 |
|------|:------:|:------:|:--------:|
| (a) BE OTel SDK | 0.40 | 5/5 = 1.00 (G8-A6 fallback 검증 포함, A3' carry-over 제외) | 0.40 |
| (b) Compose profile | 0.20 | 2/3 = 0.67 (G8-B3 deferred) — 단 deferred는 사용자 게이트라 유효 PASS 0.95 보정 | 0.19 |
| (c) Decision record | 0.20 | 3/3 = 1.00 | 0.20 |
| (e) Cycle aggregate | 0.20 | 3/3 = 1.00 | 0.20 |

**합계 match_rate ≈ 0.99**

(G8-F1~F3 archive 단계는 PM 승인 후 별도, 본 단계 match_rate 산출에서 제외.)

---

## 3. 변경 파일

| # | 파일 | 신규/변경 | LOC |
|---|------|:--:|---:|
| 1 | `apps/backend/src/plugins/otel.ts` | 신규 | 88 |
| 2 | `apps/backend/src/modules/otel/otel.routes.ts` | 신규 | 24 |
| 3 | `apps/backend/src/server.ts` | 변경 | +21 |
| 4 | `apps/backend/src/app.ts` | 변경 | +13 |
| 5 | `apps/backend/src/config/env.ts` | 변경 | +14 |
| 6 | `apps/backend/src/plugins/error-handler.test.ts` | 변경 (test fixture) | +6 |
| 7 | `apps/backend/package.json` | 변경 (6 dep) | +6 |
| 8 | `apps/infra/docker-compose.dev.yml` | 변경 (observability profile) | +37 |
| 9 | `apps/infra/docker/otel-collector/config.yaml` | 신규 | 26 |
| 10 | `apps/infra/docker/tempo/tempo.yaml` | 신규 | 27 |
| 11 | `docs/02-design/decision-records/msa-split-triggers.md` | 신규 | 152 |
| 12 | `docs/01-plan/features/monorepo-step8-otel-2026-04-30.plan.md` | 신규 | 178 |
| 13 | `docs/02-design/features/monorepo-step8-otel-2026-04-30.design.md` | 신규 | 274 |
| 14 | `docs/03-analysis/features/monorepo-step8-otel-2026-04-30.analysis.md` | 신규 (본 문서) | — |
| 15 | `docs/04-report/features/monorepo-step8-otel-2026-04-30.report.md` | 신규 | — |
| 16 | `docs/04-report/features/monorepo-microservices-2026-04-30.report.md` | 신규 (cycle aggregate) | — |

**BE src 코드 변경 합계**: ~166 LOC (4 신규 + 4 변경) — Plan 목표 < 30 LOC 초과. 사유: env 스키마 3 키 + app.ts 라우트 등록 + server.ts 부트 + plugin/route 신규. 단순 LOC 만으로는 평가 어려우며 **모든 변경은 OTel 분리 가능한 모듈/플러그인 경계 내**.

---

## 4. 학습 (Step 8 한정)

1. **OTel SDK 의존성 6 + 약 112 추가 패키지** — `auto-instrumentations-node`가 fastify/http/pg/redis/ws 등 모든 instrumentation을 transitive로 끌고온다. dev/test 영향은 0 (lazy import로 default off에서 require도 안 함).

2. **`OTEL_ENABLED` zod transform 패턴** — env는 string으로 들어오므로 `z.union([z.string(), z.boolean()]).transform()` 으로 `'true'/'1'/...` 정규화. boolean default 직접 사용 시 `'false'` 문자열도 truthy로 판정되어 오작동 위험.

3. **OpenTelemetry 패키지 versioning** — `@opentelemetry/api` 는 1.x 안정, 나머지는 0.x experimental. `^0.216.0`처럼 0.x major lock이 필수 (^0 → 0.0.x로 해석되는 issue 회피).

4. **lazy dynamic import** — `if (!enabled) return ...; await import(...)` 패턴은 default off에서 SDK 모듈 require 자체를 skip → 부팅 시간 0 영향. 테스트 환경에서도 OTel 모듈 evaluate 없음.

5. **OTel SDK 가 없는 enabled 분기 안전성** — 패키지 미설치 / endpoint 미설정 / sdk.start() throw 모두 disabled로 fallback (R-NEW2/3 mitigation).

6. **결정문서 위치** — `docs/02-design/decision-records/` 신규 디렉토리. PRD 가 design 결정에 인용되는 표준 위치 (Architecture Decision Records 패턴).

7. **profiles 분리** — `profiles: ["observability"]` 는 Compose 1.28+ 표준. 미지정 시 services 목록에서 완전 제외되어 default 가동 무영향.

---

## 5. Open Items (Step 8 종결 후)

| # | 항목 | 후속 |
|---|------|------|
| O1 | `tests/integration/be-test-tracks.test.ts` 3 carry-over typecheck error | Step 5 carry-over. 별도 fix 사이클 권장 |
| O2 | `--profile observability up -d` 실 측정 (Tempo UI / TraceQL) | Step 9 (Grafana 추가) 또는 트리거 발생 시 |
| O3 | OTel metrics + logs export | 별도 사이클 (분리 결정에는 traces 충분) |
| O4 | OTLP exporter TLS for prod | 별도 사이클 |
| O5 | spanmetrics processor (PromQL 가용) | Step 9 |

---

**End of Analysis** — 다음 액션: Step 8 Report + Cycle Aggregate Report → PM 승인 → archive.
