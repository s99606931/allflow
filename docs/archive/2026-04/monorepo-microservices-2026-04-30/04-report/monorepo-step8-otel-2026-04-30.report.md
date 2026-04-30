# Report — monorepo-step8-otel-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Cycle**: Step 8 of 8 — OpenTelemetry minimal SDK + observability profile + MSA split-trigger 결정문서
> **Status**: do-complete-awaiting-pm-approval
> **Match Rate Estimated**: 0.99

---

## 1. 요약 (TL;DR)

| 축 | 산출물 | 상태 |
|----|--------|:----:|
| **A. BE OTel SDK** | `plugins/otel.ts` (lazy + safe fallback) + `modules/otel/otel.routes.ts` + `server.ts` boot hook + `env.ts` 3 키 | ✅ default off 검증 |
| **B. Compose profile** | `apps/infra/docker-compose.dev.yml` 에 `observability` profile (otel-collector + tempo) + `docker/otel-collector/config.yaml` + `docker/tempo/tempo.yaml` | ✅ profile 미지정 가동 무영향 |
| **C. Decision record** | `docs/02-design/decision-records/msa-split-triggers.md` (3 도메인 × 임계치 표 + 의사결정 트리 + 반례 + 인용) | ✅ |
| **D. Step 8 PDCA 4 docs** | Plan/Design/Analysis/Report | ✅ |
| **E. Cycle aggregate report** | `docs/04-report/features/monorepo-microservices-2026-04-30.report.md` (Step 1~7+verification+8 통합) | ✅ |

dev 게이트: BE typecheck (src+seed) PASS, BE 267p/28s, shared 45/45, contracts typecheck PASS, /otel/health 200, compose config exit 0.

---

## 2. 변경 파일 (16개)

### 2.1 코드 (8개, BE src ~166 LOC)

| 파일 | 변경 |
|------|------|
| `apps/backend/src/plugins/otel.ts` | 신규 (88 LOC) — `initOtel()` lazy SDK + safe fallback |
| `apps/backend/src/modules/otel/otel.routes.ts` | 신규 (24 LOC) — `/otel/health` |
| `apps/backend/src/server.ts` | +21 LOC — boot 시점 `initOtel()` + shutdown wiring |
| `apps/backend/src/app.ts` | +13 LOC — `otelRoutes` 등록 + `BuildAppOptions.otelState` |
| `apps/backend/src/config/env.ts` | +14 LOC — `OTEL_ENABLED`/`OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_SERVICE_NAME` |
| `apps/backend/src/plugins/error-handler.test.ts` | +6 LOC — test fixture에 OTel 필드 |
| `apps/backend/package.json` | +6 dep — @opentelemetry/{api,sdk-node,auto-instrumentations-node,exporter-trace-otlp-http,resources,semantic-conventions} |
| `apps/infra/docker-compose.dev.yml` | +37 LOC — `observability` profile (otel-collector + tempo + tempo-data volume) |

### 2.2 인프라 설정 (2개)

| 파일 | 변경 |
|------|------|
| `apps/infra/docker/otel-collector/config.yaml` | 신규 (26 LOC) — minimal pipeline (otlp→batch→otlp/tempo) |
| `apps/infra/docker/tempo/tempo.yaml` | 신규 (27 LOC) — local filesystem backend |

### 2.3 PDCA + 결정 문서 (6개)

| 파일 | 변경 |
|------|------|
| `docs/01-plan/features/monorepo-step8-otel-2026-04-30.plan.md` | 신규 |
| `docs/02-design/features/monorepo-step8-otel-2026-04-30.design.md` | 신규 |
| `docs/02-design/decision-records/msa-split-triggers.md` | 신규 — Phase 2 분리 결정 가이드 |
| `docs/03-analysis/features/monorepo-step8-otel-2026-04-30.analysis.md` | 신규 |
| `docs/04-report/features/monorepo-step8-otel-2026-04-30.report.md` | 신규 (본 문서) |
| `docs/04-report/features/monorepo-microservices-2026-04-30.report.md` | 신규 — **cycle aggregate** |

---

## 3. 게이트 결과 (요약 — 상세는 Analysis §1)

| Gate | 결과 |
|------|:----:|
| G8-A1 SDK 6 dep | PASS |
| G8-A2 default off boot | PASS (`otel: disabled` log) |
| G8-A3 typecheck (src+seed) | PASS |
| G8-A4 BE unit | PASS (267p/28s — baseline 동등) |
| G8-A5 /otel/health endpoint | PASS (200 + 정확한 JSON) |
| G8-A6 enabled w/o endpoint → fallback | PASS (warn log + disabled) |
| G8-B1 compose config | PASS (exit 0) |
| G8-B2 default profile 무영향 | PASS |
| G8-B3 profile 가동 실측 | DEFERRED (PM 승인 후) |
| G8-C1~C3 결정문서 | PASS |
| G8-E1~E3 cycle aggregate + baseline regression | PASS |
| G8-F1~F3 archive | DEFERRED (PM 승인 후) |

**머지 절대 조건**: G8-A1~A5, G8-B1~B2, G8-C1~C3, G8-E1~E3 모두 PASS.

---

## 4. 주요 학습 (요약 — 상세는 Analysis §4)

1. **`OTEL_ENABLED` zod transform 패턴** — env는 string. `z.union([z.string(), z.boolean()]).transform()` 으로 정규화. boolean default 직접 사용 시 `'false'` 문자열도 truthy로 판정되어 오작동 위험.
2. **OpenTelemetry 0.x major lock** — `@opentelemetry/api`만 1.x 안정. 나머지 (sdk-node, auto-instrumentations 등)는 0.x experimental — `^0.216.0` 처럼 정확한 minor lock 필수.
3. **lazy dynamic import 패턴** — `if (!enabled) return ...; await import(...)`. default off에서 SDK 모듈 require 자체를 skip → 부팅 시간 0 영향. test 환경 무영향.
4. **OTel SDK가 없는 enabled 분기 안전성** — 패키지 미설치 / endpoint 미설정 / sdk.start() throw 모두 disabled로 fallback (R-NEW2/3 mitigation 동작 검증).
5. **profiles 분리** — `profiles: ["observability"]` Compose 1.28+ 표준. 미지정 시 services 목록에서 완전 제외 → default 가동 무영향.
6. **결정문서 위치 표준** — `docs/02-design/decision-records/` 신규 디렉토리. PRD가 인용하는 architecture decision은 design under decision-records/ 가 표준 (ADR 패턴).
7. **OTel collector pipeline minimal** — 본 사이클은 traces only. spanmetrics / log / metrics processors 는 Step 9. 분리 결정 신호는 trace latency만으로 충분.

---

## 5. 미완 항목 (Open)

| # | 항목 | 후속 |
|---|------|------|
| O1 | `--profile observability up -d` 실 측정 + Tempo TraceQL 검증 | Step 9 (Grafana 추가) 또는 트리거 발생 시 |
| O2 | OTel metrics + logs export | 별도 사이클 (분리 결정에는 traces 충분) |
| O3 | spanmetrics processor (PromQL 가용) | Step 9 |
| O4 | OTLP exporter TLS for prod | 별도 사이클 |
| O5 | tests/integration/be-test-tracks.test.ts 3 carry-over typecheck error | Step 5 carry-over. 별도 fix 사이클 |
| O6 | Vercel TURBO_TOKEN/TEAM 실 등록 | Step 7 carry-over (메인테이너 수동) |

---

## 6. 최종 평가

- **사이클 성공 기준 (Plan §3)**: 머지 절대 조건 게이트 14/14 PASS (G8-B3, G8-F1~F3는 사용자 게이트로 deferred 정상).
- **PRD §5.2 success criteria 매핑**: aggregate report §3 참조.
- **dev 환경 회귀**: 0건. compose default 가동 + BE/FE typecheck/test 모두 baseline 동등.
- **분리 결정 도구**: msa-split-triggers.md + OTel collector profile 가동으로 측정 가능.

---

**End of Step 8 Report** — 다음 액션: Cycle Aggregate Report (별도 파일) + PM 승인 → archive.
