# Plan — monorepo-step8-otel-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md` §5.1 Step 8 + §2.5 (OTel 도입은 Phase 2 트리거)
> **Cycle Scope**: **Step 8 of 8 — 사이클 클로저** — OpenTelemetry minimal SDK + MSA 분리 트리거 결정문서 + 사이클 통합 PDCA Report + archive
> **Absolute Constraints**: BE 295+ / FE 71 / shared 45 / contracts PASS / Playwright 회귀 0 / OTEL_ENABLED=false 디폴트로 dev 무영향 / Prisma 0 / 코드 변경 최소 (server.ts boot 1 hook + plugin 1)

---

## 1. Cycle Scope (사용자 입력 재확인)

PRD §5.1 8 Step 중 본 사이클은 **Step 8 (선택)**: "OpenTelemetry collector + BE 계측 (Phase 2 트리거 기반)"을 **최소 도입(default off)** 으로 안착시키고, **사이클 전체(Step 1~7) 통합 보고서 + archive** 를 함께 수행한다.

| 작업 | 본 사이클 | 사유 |
|------|:---:|------|
| (a) BE OTel SDK minimal (default off) | ✅ | PRD §5.1 #8 Phase 2 트리거. 기본 off로 dev parity 보장 |
| (b) compose `observability` profile (otel-collector + tempo) | ✅ | optional profile — default 가동 시 무영향 |
| (c) `docs/02-design/decision-records/msa-split-triggers.md` | ✅ | PRD §2.2 분리 트리거 정량화 — 분해 결정 사전 합의 |
| (d) Step 8 PDCA 4 docs (Plan/Design/Analysis/Report) | ✅ | bkit:pdca 표준 |
| (e) **사이클 aggregate report** (Step 1~7+verification 통합) | ✅ | 사용자 명시 요청 |
| (f) `/bkit:pdca archive` → `docs/archive/2026-04/` 이동 + L4 MEMORY.md 인덱스 | ✅ | 사이클 종결 표준 |
| Phase 2 실 분리 (realtime/ai/search) | ❌ | 측정 데이터 없이 분리 금지 (PRD §2.2) |
| OTel collector 운영 채널(Tempo/Jaeger backend) 결정 | ⚠️ | Tempo 우선, Jaeger 대체 OK — Design §3.4 |

### 1.1 사용자 요청 1줄 요약

> "OTEL_ENABLED=false 디폴트로 dev 무영향 + 분리 트리거 측정 가이드 문서 + 사이클 전체 클로저"

---

## 2. Step 8 상세 — 4 영역

### 2.1 (a) BE OpenTelemetry minimal 도입

**원칙**: SDK는 설치하되 **default off** (OTEL_ENABLED=true 일 때만 init).

| 결정 | 값 | 근거 |
|------|---:|------|
| **SDK 패키지** | `@opentelemetry/api` ^1.9.0, `@opentelemetry/sdk-node` ^0.54.0, `@opentelemetry/auto-instrumentations-node` ^0.54.0 | 2026-04 stable. fastify/http/pg/redis 자동 계측 포함 |
| **활성화 신호** | `OTEL_ENABLED=true` (env) | 기본 off → dev/CI 무영향 |
| **Resource service.name** | `all-flow-backend` (env로 override 가능) | OTel resource convention |
| **Exporter endpoint** | `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. `http://otel-collector:4318`) | OTLP HTTP 표준. http/grpc 둘 다 OK, http 우선(방화벽 친화) |
| **Init 위치** | `apps/backend/src/server.ts` boot 시점 (Fastify 인스턴스 생성 **이전**) | sdk-node가 require 시점 hook 필요 — `app.ts` 내부에서는 늦음 |
| **/otel/health endpoint** | 신규 `otel.routes.ts` — `{enabled: bool, serviceName: string, endpoint: string|null}` | 진단용. health.routes.ts와 분리 (책임 분리) |
| **W3C tracecontext propagation** | 기존 `tracingPlugin` (재사용) | 본 cycle에서 추가 작업 0. SDK가 켜지면 OTel Context API와 자동 호환 |
| **Shutdown** | `app.addHook('onClose', () => sdk.shutdown())` | graceful drain |

**금지**:
- OTel 메트릭/로그 export (본 사이클은 traces only — 분리 결정에 필요)
- BE 비즈니스 코드에 직접 span 생성 (auto-instrumentations가 충분)
- Prisma 변경 (R3)

### 2.2 (b) Optional `observability` compose profile

```yaml
# apps/infra/docker-compose.dev.yml — profiles.observability
services:
  otel-collector:
    profiles: ["observability"]
    image: otel/opentelemetry-collector-contrib:0.121.0
    # ...
  tempo:
    profiles: ["observability"]
    image: grafana/tempo:2.7.0
    # ...
```

| 결정 | 값 | 근거 |
|------|---:|------|
| **활성화 방법** | `docker compose --profile observability up` | profile 미지정 시 default 가동 무영향 |
| **Backend 선택** | Grafana Tempo (1순위) | 단일 컨테이너, S3 호환 backend, OTLP receiver 내장. Jaeger는 옵션으로 README 링크. |
| **포트** | collector 4318(http)/4317(grpc), tempo 3200(query) | 기본값 표준 |
| **로컬 only** | UI(Grafana)는 본 사이클 미포함 | 측정 트리거 발생 시 Step 9에서 Grafana 추가 |

### 2.3 (c) MSA 분리 트리거 결정문서

**경로**: `docs/02-design/decision-records/msa-split-triggers.md`

**구조** (Plan에서 결정):

1. **결정 요약 표** — realtime / ai / search 3 도메인 × (분리 신호 / 임계치 / 측정원천 / 대안)
2. **메트릭 정의** — p95 latency / error rate / deploy frequency divergence / DB CPU share / WS concurrent connections
3. **분리 의사결정 트리** — 측정값 → 분리 / 유지 / 추가 측정 분기
4. **실 측정 가이드** — OTel collector 가동 시 Tempo Query에서 추출하는 PromQL/TraceQL 예시
5. **반례** — 분리하지 말아야 할 트리거 (CPU 일시 spike 등)

본 사이클은 문서만 — 실제 임계치 도달 모니터링은 별도.

### 2.4 (d)+(e) PDCA 4 docs + 사이클 aggregate report

| 문서 | 경로 | 책임 |
|------|------|------|
| Plan | `docs/01-plan/features/monorepo-step8-otel-2026-04-30.plan.md` | 본 문서 |
| Design | `docs/02-design/features/monorepo-step8-otel-2026-04-30.design.md` | 신설 |
| Analysis | `docs/03-analysis/features/monorepo-step8-otel-2026-04-30.analysis.md` | 신설 (게이트 결과) |
| Report (Step 8) | `docs/04-report/features/monorepo-step8-otel-2026-04-30.report.md` | 신설 |
| **Cycle Aggregate Report** | `docs/04-report/features/monorepo-microservices-2026-04-30.report.md` | **신설 — Step 1~7+verification+8 통합** |

**Aggregate report 구조** (사용자 요청):
- Step별 매트릭 표 (산출물 / 게이트 / match_rate)
- PRD success criteria 매핑 (turbo cache hit, dev parity, 회귀 0, …)
- 8단계 누적 학습 인덱스
- 다음 사이클 후보(Phase 2/3) 식별

### 2.5 (f) Archive + Memory

| 작업 | 명령 |
|------|------|
| Archive | `/bkit:pdca archive monorepo-microservices-2026-04-30` → `docs/archive/2026-04/monorepo-microservices-2026-04-30/` |
| L4 MEMORY 인덱스 | `~/.claude/projects/-data-allflow/memory/MEMORY.md` 신규 줄 1개 + 학습 파일 1개 |
| pdca-status.json | next cycle 후보 목록 갱신 |

---

## 3. 게이트 매트릭스 (Step 8 머지 조건)

### 3.1 OTel SDK (a)

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G8-A1 SDK 설치** | `pnpm --filter @all-flow/backend list @opentelemetry/sdk-node` | 1 hit |
| **G8-A2 default off** | `OTEL_ENABLED 미설정 + pnpm --filter @all-flow/backend dev` 부팅 → log에 OTel init 메시지 없음 | "otel: disabled" 1줄만 |
| **G8-A3 typecheck** | `pnpm --filter @all-flow/backend typecheck` | 0 error |
| **G8-A4 BE unit/int 회귀** | `pnpm --filter @all-flow/backend test && test:int` | 295+ unit / 38+ int PASS |
| **G8-A5 /otel/health endpoint** | `curl http://localhost:8080/api/v1/otel/health` | `{"enabled":false,...}` JSON |
| **G8-A6 enabled 모드 부팅** | `OTEL_ENABLED=true OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 dev` | "otel: enabled" log + crash 없음 |

### 3.2 Compose profile (b)

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G8-B1 yaml lint** | `docker compose -f docker-compose.yml -f docker-compose.dev.yml config -q` | exit 0 |
| **G8-B2 default 가동 무영향** | `docker compose -f .. -f docker-compose.dev.yml up -d` | 4 service healthy (postgres/redis/backend/frontend) — observability 미가동 |
| **G8-B3 profile 가동** | `docker compose --profile observability up -d` | otel-collector + tempo healthy |

### 3.3 Decision record (c)

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G8-C1 파일 존재** | `ls docs/02-design/decision-records/msa-split-triggers.md` | 1 hit |
| **G8-C2 3 도메인 × 4축** | grep `realtime\|ai\|search` count | 각 도메인 ≥ 3회 언급 |
| **G8-C3 측정원천 명시** | `grep -i 'p95\|error rate\|deploy frequency'` | ≥ 3 hit |

### 3.4 Cycle aggregate (e)

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G8-E1 8 step 매트릭스** | aggregate report에 Step 1~7+verification+8 모두 1줄 이상 | 9 row table |
| **G8-E2 PRD 9 success criteria 매핑** | PRD §5.2 9개 지표 모두 표에 매핑 | 9 hit |
| **G8-E3 baseline regression** | `pnpm --filter @all-flow/backend test` + `pnpm --filter @all-flow/frontend test` + `pnpm --filter @all-flow/shared test` + `pnpm --filter @all-flow/contracts typecheck` | 모두 PASS |

### 3.5 Archive (f)

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G8-F1 archive 디렉토리** | `ls docs/archive/2026-04/monorepo-microservices-2026-04-30/` | hit |
| **G8-F2 docs/{00-pm,01-plan,02-design,03-analysis,04-report}에서 monorepo-* 비움** | `find docs/0*-* -name 'monorepo-*'` | 0 hit (archive로 이동) |
| **G8-F3 L4 MEMORY 인덱스 추가** | grep `monorepo-microservices-2026-04-30` `~/.claude/projects/-data-allflow/memory/MEMORY.md` | 1 hit |

**머지 절대 조건**: G8-A1~G8-A4, G8-B1, G8-B2, G8-C1, G8-E1~G8-E3 PASS. G8-A6/B3/F1~F3 는 사용자 승인 후 단계.

---

## 4. Open Decisions (Plan에서 확정)

| # | 결정 | 값 | 근거 |
|---|------|---:|------|
| D1 | OTel 메트릭/로그 export | ❌ traces only | 분리 결정에 필요한 신호 = trace latency. 메트릭은 prometheus exporter 별도 사이클 |
| D2 | Auto-instrumentation 범위 | http+pg+redis+ioredis+ws | fastify는 http로 충분, prisma는 pg로 충분 |
| D3 | Sampling | parent-based + 1.0 (default off이므로 의미 없음) | enabled 시점에 env로 조정 |
| D4 | Tempo vs Jaeger | Tempo 1순위 | 단일 컨테이너 + Grafana 후속 호환 |
| D5 | OpenTelemetry collector config | `otel-collector-contrib` minimal pipeline (otlp receiver → batch → otlp exporter to tempo) | minimal — Step 9에서 확장 |
| D6 | BE 코드 변경량 | server.ts 부트 1 hook + 1 plugin + 1 route | 30 LOC 미만 목표 |
| D7 | OTel SDK 설치 시 prod docker 영향 | 0 — package.json dependency만 | dev compose 무관, prod 컨테이너 build 시점 dependency 추가만 |

---

## 5. Risk Re-rank (Step 8 한정)

| # | Risk | Severity | 적용성 | Mitigation |
|--:|------|---------:|:------:|-----------|
| R1 | single-port dev 회귀 | Critical | ✅ | OTel default off + profile 분리. G8-B2 4 service healthy gate |
| R2 | import 경로 변경 | High | ❌ | 본 Step 적용 외 |
| R3 | Prisma 변경 | Critical | ❌ | schema 미변경 |
| **R-NEW1** | **`@opentelemetry/sdk-node` require 부수효과로 부팅 시간 증가** | Medium | ✅ | OTEL_ENABLED 미설정 시 sdk-node 모듈 require 자체를 skip (dynamic import) |
| **R-NEW2** | **enabled 시 missing endpoint로 throw → BE crash** | High | ✅ | OTEL_ENABLED=true && endpoint missing 시 disabled로 fallback + warn log |
| **R-NEW3** | **OTel SDK가 잡지 못한 unhandled rejection으로 server 종료** | Medium | ✅ | server.ts 부트 SDK init은 try/catch 감싸서 실패 시 disabled 모드 부팅 |
| **R-NEW4** | **observability profile compose 가동이 default를 무심코 영향** | Medium | ✅ | `profiles: [observability]` 명시 — 미지정 시 절대 가동 안 됨 |
| **R-NEW5** | **분리 트리거 임계치가 자의적** | Medium | ✅ | 결정문서에 외부 출처(SRE handbook, Google 4 Golden Signals) 인용 |

---

## 6. PDCA 매핑 (Step 8)

| Phase | 활동 | 산출물 |
|-------|------|--------|
| Plan (이 문서) | scope/gate/decisions | `docs/01-plan/features/monorepo-step8-otel-2026-04-30.plan.md` |
| Design | OTel plugin 모듈 시그니처 + compose YAML + 결정문서 골격 | `docs/02-design/features/monorepo-step8-otel-2026-04-30.design.md` |
| Do | (1) OTel plugin (2) /otel/health route (3) server.ts boot hook (4) compose profile (5) decision-record (6) aggregate report | 신규 6 파일 + 변경 1 파일 (server.ts) + package.json 3 dep |
| Check | G8-A1~G8-F3 + bkit:gap-detector | match_rate ≥ 0.90 |
| Act | regression sweep + memory 학습 1개 | learning 파일 |
| Report | Step 8 + cycle aggregate | 2 report 파일 |

---

**End of Plan** — 다음 액션: Design → Do → Check → Act → Report → Archive.
