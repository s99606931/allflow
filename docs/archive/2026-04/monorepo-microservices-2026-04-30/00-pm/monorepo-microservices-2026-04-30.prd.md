# PRD — monorepo-microservices-2026-04-30

> **Generated**: 2026-04-30 by PM Agent Team (av-pm-coordinator orchestration)
> **Feature**: Monorepo (pnpm + Turborepo 2.x) 구조 도입 + 점진적 MSA 진화 기반 마련
> **Cycle Range**: PRD → Plan → Design → Do → Check → Act → Report (전체)
> **Upstream Constraints**: single-port-localhost-2026-04-30 회귀 0건 (절대 조건)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 3개 패키지(BE/FE/Infra)가 root `package.json`/`pnpm-workspace.yaml` 없이 독립 운영. 공유 타입(OpenAPI 3.1) 수동 mirror, 빌드 캐시 0%, 의존성 버전 드리프트 위험. 향후 MSA 분해 시 import 경로 대량 변경·CI 시간 폭증·dev parity 붕괴 리스크. |
| **Solution** | (1) **pnpm 10 workspaces + Turborepo 2.x** monorepo 골격 + Catalog로 버전 단일화. (2) **packages/{contracts, shared, config-*, ui-kit}** 추출로 중복 제거. (3) **Modular Monolith 유지** (BE 20 모듈은 그대로) + 측정 기반 부분 분리 후보(realtime / ai / search) 식별만. (4) OpenTelemetry 도입 준비 (실측 후 분해 판단 근거). |
| **Function UX Effect** | `pnpm i` 1회로 전체 설치, `turbo build` 캐시 hit ≥ 80% (재빌드 6분→45초), OpenAPI 변경 시 `packages/contracts` 한 곳만 수정 → BE/FE 자동 동기화. dev 환경(`http://localhost`)·prod 패리티는 변경 0. |
| **Core Value** | **"점진적 진화 기반 확보"** — 지금은 Modular Monolith로 빠르게 가되, 측정 데이터(OTel)가 분리 신호를 줄 때 1주 내에 1개 도메인을 service로 떼낼 수 있는 골격을 갖춘다. (CNCF 2026: 42% 조직이 MSA→Modular Monolith로 회귀. Amazon Prime Video 90% 비용 감소 사례.) |

**Recommended Phase**: **Phase 1 (Monorepo 골격 + packages 추출) — 본 사이클의 범위.** Phase 2(부분 분해)/Phase 3(풀 분해)는 별도 사이클. 근거 §5.

---

## 1. Problem (왜 지금 하는가)

### 1.1 현재 상태 (2026-04-30 실측)

```
/data/allflow/
├── project/
│   ├── all-flow-backend/   pnpm@10.33  Node 22  Fastify 5  Prisma 6  (51 .ts files in modules/, 20 modules)
│   ├── all-flow-frontend/  pnpm@10     Node 22  Next 16   next-auth 5β
│   └── all-flow-infra/     docker-compose dev/prod
├── docs/{00-pm,01-plan,02-design,03-analysis,04-report}/
└── (root) package.json ❌  pnpm-workspace.yaml ❌  turbo.json ❌
```

| 통증 (Pain) | 현재 비용 | 예상 임계점 |
|------------|----------|------------|
| **OpenAPI 수동 mirror** | FE `openapi.yaml` 1162 LOC ↔ BE Zod 수동 동기화. 직전 사이클에서 drift 가드 도입했으나 단일 출처(SOR) 부재. | 1개 도메인 분리 시 contract 3중 mirror 필요 |
| **빌드 캐시 0%** | CI에서 BE+FE 매번 풀빌드. `pnpm test:all` ~수 분. | 모듈 추가 시 선형 증가 |
| **버전 드리프트** | `zod ^4.3.6`(BE) vs `^4.1.0`(FE), `@types/node ^22.10.0` vs `^22.13.4`. | 메이저 충돌 시 디버깅 비용 |
| **분해 경로 봉쇄** | 신규 service 추가 시 `pnpm-workspace.yaml` 부재로 의존성 hoisting/공유 불가. | MSA 1개 분리에 ~2주 셋업 비용 |
| **공유 코드 중복** | UI 디자인 토큰, error envelope, Zod schema가 BE/FE에 각자 존재. | 변경 시 양쪽 동기화 필요 |

### 1.2 2026-04-30 업계 트렌드 (실사 검증)

> "**Architecture should follow maturity, not fashion.**" — 2026 컨센서스

| 트렌드 | 출처 | 본 프로젝트 적용 |
|--------|------|----------------|
| **Modular Monolith 회귀** | CNCF Q1 2026: 42% 조직이 MSA→consolidate. Amazon Prime Video −90% cost | **현재 Modular Monolith 유지가 맞다** |
| **Monorepo as default** | Turborepo 2.0 task runner rewrite, watch mode | **pnpm + Turborepo 2.x 채택** |
| **pnpm Catalogs** | pnpm 10 GA, workspace 60-80% disk 감소 + 3-5x install | **catalog로 버전 단일화** |
| **Node 24 Active LTS** | Node 22 LTS는 2025-10-21 Active 종료, Maintenance만. Node 24가 현재 Active LTS (~2028-04 지원) | **Node 24로 이전 검토 (별도 risk gated)** |
| **OpenTelemetry 4 pillar** | 2026 Q1 continuous profiling RC. DB/messaging convention stable | **OTel 도입 준비 (측정 → 분해 판단 근거)** |
| **Contract-first** | OpenAPI 3.1 stable, gRPC/tRPC는 외부 API 노출 없는 내부에서만 | **OpenAPI 3.1 유지 + packages/contracts SOR화** |

### 1.3 사용자 요청 재해석

원문: *"모놀레포 환경으로 마이크로서비스 구성이 가능하도록 최신 기술 스택 적용. 단일 서비스를 마이크로서비스로 개발할 수 있는 리팩토링 구성 방안."*

**해석**: "지금 당장 MSA로 쪼개라"가 아니라 **"필요할 때 쪼갤 수 있는 구조"**를 만들어 달라. 2026 트렌드가 강하게 지지 (modular monolith → 측정 → 측정값이 분리 신호일 때 분리).

---

## 2. Solution (무엇을 만드는가)

### 2.1 Phase 1 범위 (본 사이클 — 권장)

```
/data/allflow/   ← root monorepo
├── package.json                  (NEW: workspaces 정의 + turbo scripts)
├── pnpm-workspace.yaml           (NEW: packages/* + apps/*)
├── turbo.json                    (NEW: build/test/lint/typecheck pipeline)
├── tsconfig.base.json            (NEW: 공통 ts 옵션)
├── apps/
│   ├── backend/    ← project/all-flow-backend 이동/링크
│   ├── frontend/   ← project/all-flow-frontend 이동/링크
│   └── infra/      ← project/all-flow-infra 이동/링크
├── packages/
│   ├── contracts/      OpenAPI 3.1 SOR + 생성 Zod/TS types  (FE openapi.yaml 이동)
│   ├── shared/         envelope, errors, IDs, time utils    (양쪽 중복 제거)
│   ├── config-eslint/  ESLint flat config preset            (FE/BE 통합)
│   ├── config-tsconfig/ tsconfig presets                    (base/node/next)
│   └── ui-kit/         Radix-based shared components        (선택, FE만 우선)
└── docs/  (변경 없음 — bkit PDCA 표준 유지)
```

**핵심 원칙**:
1. **코드 변경 최소화**: import 경로 변경은 codemod로 1-shot 처리
2. **dev 환경 보존**: `docker-compose -f .. -f docker-compose.dev.yml up` 명령은 그대로 동작 (compose context만 재지정)
3. **OpenAPI single source**: `packages/contracts` 한 곳에서 yaml → Zod (BE) + TS types (FE) 자동 생성
4. **catalog로 버전 잠금**: `zod`, `@types/node`, `typescript`, `vitest` 등 공통 dep은 catalog 단일화

### 2.2 Phase 2 후보 (별도 사이클 — 측정 후 결정)

본 사이클에서는 **"분리하지 않는다"**. 대신 분리 후보만 식별:

| 후보 도메인 | 분리 시 이점 | 분리 비용 | 우선순위 |
|------------|------------|----------|---------|
| **realtime** (WebSocket fanout, redis-fanout) | 메인 BE 재시작 시 연결 끊김 분리, 수평 확장 | Redis 공유 OK, JWT 공유 필요 | 🥇 1순위 |
| **ai** (extract-actions, ai-adapter) | 외부 LLM 호출 격리, 타임아웃/비용 분리 | 결과를 main BE에 push 필요 | 🥈 2순위 |
| **search** (search.service) | pgvector 부하 격리 | 인덱싱 동기화 복잡 | 🥉 3순위 |

**분리 트리거 (측정 기반)**:
- realtime: WS 연결이 1k 동시접속 초과 OR BE 재배포로 인한 단절이 사용자 통증 입증 시
- ai: LLM 호출 평균 지연 > 2s OR 비용 모니터링 필요 시
- search: pgvector 쿼리가 메인 DB CPU > 30% 점유 시

→ OpenTelemetry 도입(Phase 1 후반)이 이 측정의 전제. 측정 없는 분리는 금지.

### 2.3 Phase 3 (풀 분해) — 비추천

20개 모듈 모두 service 분리 시:
- 인프라 비용 ~10x (서비스당 컨테이너 + DB 풀 + 네트워킹)
- 로컬 dev 무결성 붕괴 (현재 single-port localhost 1줄 가동 → 20개 컨테이너 + service mesh)
- 분산 트랜잭션 복잡도 (현재 Prisma 단일 트랜잭션 → SAGA/Outbox 패턴 강제)
- **결정**: 추천 안 함. 2026 컨센서스(modulith first) 위배.

### 2.4 Turborepo 2.x 채택 근거 (사용자 사전 결정 — 정리만)

| 비교축 | Turborepo 2.x | (참고) Nx | (참고) Moon |
|--------|--------------|-----------|------------|
| 학습 곡선 | 낮음 (turbo.json 단일) | 높음 (plugins) | 중간 |
| Watch mode | 2.0+ 내장 | 내장 | 내장 |
| Remote cache | Vercel 무료 + self-host | Nx Cloud | 자체 |
| 기존 pnpm 워크플로우 | 그대로 | 강하게 통합 | 그대로 |
| **결정** | **채택** (사용자 확정) | — | — |

근거: 본 프로젝트는 **단순한 6 패키지 + 3 앱** 규모로 Turborepo 2.x의 cache hit + watch만으로 충분. Nx의 generator/plugin 생태계 가치는 본 규모에서 ROI 낮음.

### 2.5 OpenAPI single-source 전략

```
Before:  FE/openapi.yaml (1162 LOC, SOR) → BE Zod 수동 mirror → drift 가드 스크립트
After:   packages/contracts/openapi.yaml (SOR)
           ├─ pnpm contracts:gen:zod  → packages/contracts/src/zod/   (BE 사용)
           └─ pnpm contracts:gen:ts   → packages/contracts/src/types/ (FE 사용)
         BE: import { TaskSchema } from '@all-flow/contracts/zod'
         FE: import type { Task } from '@all-flow/contracts/types'
```

drift 검증은 turbo task로 격상: `turbo run contracts:check` (PR gate).

---

## 3. Personas

### 3.1 Primary — "메인테이너 본인" (single-developer team)

| 항목 | 내용 |
|------|------|
| **JTBD** | "When I add a new feature touching both BE/FE, I want shared types to update automatically, so I don't fix the same bug twice in two repos." |
| **현재 통증** | OpenAPI 변경 → FE yaml 수정 → BE Zod 수동 동기화 → drift 스크립트로 사후 발견 → 2번 일함 |
| **Phase 1 효과** | `packages/contracts/openapi.yaml` 한 곳 수정 → `turbo gen` → BE+FE 동시 반영 |
| **측정** | "1 OpenAPI 변경"의 wall-clock 시간 측정 (현재 ~10분 → 목표 < 2분) |

### 3.2 Secondary — "미래의 협업 메인테이너" (OSS contributor)

| 항목 | 내용 |
|------|------|
| **JTBD** | "When I clone the repo, I want one command to install everything and start dev, so I can submit my first PR same-day." |
| **현재 통증** | 3개 폴더 각각 `pnpm i`, .env 3개 복사, 실행 순서 가이드 부재 |
| **Phase 1 효과** | `pnpm i && pnpm dev` 한 줄로 전체 스택 가동 (single-port localhost 그대로) |
| **측정** | CONTRIBUTING.md "first run" 단계 수 (현재 8단계 → 목표 3단계) |

### 3.3 Tertiary — "관찰자/CI" (GitHub Actions)

| 항목 | 내용 |
|------|------|
| **JTBD** | "When PR opens, I want to skip rebuilding what didn't change, so feedback comes back in <2 minutes." |
| **현재 통증** | 문서만 변경한 PR도 BE+FE 풀빌드 |
| **Phase 1 효과** | turbo `--filter` + remote cache로 영향 그래프만 빌드 |
| **측정** | CI 평균 시간 (목표: cache hit ≥ 80% 달성 시 6min → 45-90s) |

---

## 4. Beachhead Segment (4-criteria scoring)

> Geoffrey Moore 기준: 첫 번째로 "확실히 가치를 받는" 1명을 정의 → 그 1명에게만 최적화.

| 후보 | Pain Severity | Reachability | Time-to-Value | Reference Strength | 합계 |
|------|--------------:|-------------:|--------------:|-------------------:|----:|
| **Primary 메인테이너 본인** | 9 | 10 | 9 | 10 | **38** ⭐ |
| Secondary OSS contributor | 6 | 5 | 7 | 8 | 26 |
| Tertiary CI 시간 단축 | 7 | 9 | 6 | 5 | 27 |

**Beachhead = "메인테이너 본인의 1-OpenAPI 변경 시간 단축 + 1-cmd dev 부팅 보존"**

→ 본 사이클의 모든 결정은 이 1인의 **로컬 dev workflow를 깨지 않는 것**을 최우선으로 한다.

---

## 5. GTM (도입 전략) — 점진적 마이그레이션

### 5.1 채널/순서 (단일 git 저장소 내 단계적 PR)

```
Step 1 (1 PR):  root 골격 - package.json/pnpm-workspace.yaml/turbo.json + tsconfig.base
Step 2 (1 PR):  apps/{backend,frontend,infra} 폴더 이동 + git mv (history 보존)
                + docker-compose context 경로만 갱신
                + dev 회귀 게이트: Playwright 56/62 PASS 유지
Step 3 (1 PR):  packages/contracts 추출 + openapi.yaml 이동 + 생성 스크립트
                + BE/FE import 경로 codemod 적용
Step 4 (1 PR):  packages/shared 추출 (envelope/errors/ID 유틸)
Step 5 (1 PR):  packages/config-eslint, config-tsconfig
Step 6 (1 PR):  catalog 적용 (zod/types/typescript/vitest 통합)
Step 7 (1 PR):  GitHub Actions에 turbo cache + --filter 적용
Step 8 (선택):  OpenTelemetry collector + BE 계측 (Phase 2 트리거 기반)
```

### 5.2 Success Metrics (측정 가능)

| 지표 | Baseline (2026-04-30) | Target (사이클 완료) | 측정 방법 |
|------|----------------------:|--------------------:|----------|
| `pnpm i` 단일 명령으로 전체 설치 | ❌ (3회 필요) | ✅ | shell 명령 1개 |
| `pnpm dev` 단일 명령으로 dev 가동 | ❌ | ✅ (compose 호출) | 부팅 후 `curl http://localhost/health` 200 |
| OpenAPI 1회 변경 → BE+FE 반영 시간 | ~10min (수동) | < 2min (자동 gen) | 측정 스크립트 |
| Turbo build cache hit (warm) | 0% | ≥ 80% | `turbo run build --summarize` |
| dev 환경 회귀 (single-port localhost) | — | **0건** | Playwright 56/62 유지 |
| Prisma schema 분리 위험 | — | **0** (분리 안 함) | schema.prisma 단일 유지 |
| CI 시간 (warm cache) | ~6min | ≤ 90s | GHA workflow 측정 |
| 공유 dep 버전 중복 | 4건+ | 0건 | catalog audit |
| `bkit:gap-detector` match_rate | — | ≥ 0.90 | gap-detector |
| `bkit:code-analyzer` score | 100 (현재) | 100 유지 | code-analyzer |

### 5.3 Battlecard (FAQ)

| 질문 | 답변 |
|------|------|
| "왜 Nx가 아닌 Turborepo?" | 6 패키지 규모에서 Nx generator/plugin ROI 낮음. 사용자 사전 결정. |
| "왜 지금 MSA 분해 안 하나?" | 2026 CNCF: 42% MSA→consolidate, Amazon Prime Video 90% cost↓. 측정 없는 분리 금지. |
| "Node 22 → 24 지금 올려야?" | 별도 risk-gated 결정. 본 사이클 범위 외. (Plan 단계에서 결정) |
| "single-port dev 깨질까?" | 절대 조건. compose context 경로만 변경, 환경변수/포트 동일. Step 2 PR에서 Playwright 56/62 게이트. |
| "OpenAPI 위치 이동 시 FE drift script 깨지지?" | Step 3 PR에서 script 경로도 함께 갱신. drift 가드 0 회귀가 PR merge 게이트. |

---

## 6. Risks & Mitigations (Top 5)

| # | Risk | Severity | Likelihood | Mitigation |
|--:|------|---------:|-----------:|-----------|
| **R1** | **single-port localhost dev 환경 회귀** (직전 사이클 안정화 깨짐) | 🔴 Critical | M | Step 2 PR 머지 전 `Playwright 56/62 + curl http://localhost` Gate. 실패 시 즉시 rollback. compose volume bind 경로 명시 변경만 허용. |
| **R2** | **import 경로 대량 변경 실패** | 🟠 High | H | jscodeshift codemod 1-shot + dry-run + git diff 검토. 단계 PR로 분할 (1단계 = 1패키지 추출). 각 PR마다 `tsc --noEmit` + `vitest` PASS 게이트. |
| **R3** | **Prisma schema 분리 시도로 데이터 무결성 위험** | 🔴 Critical | L (안 할 것) | **본 사이클은 schema 분리 금지** PRD에 명문화. Phase 2/3에서만 별도 검토. |
| **R4** | **CI 시간 오히려 증가** (turbo 셋업 미숙) | 🟡 Medium | M | Step 7 PR 전후 CI 시간 측정 + 비교. cache miss 시 baseline 대비 +20% 이내 허용. |
| **R5** | **OpenAPI 생성 코드와 수동 코드 충돌** | 🟠 High | M | `packages/contracts/src/{zod,types}` 폴더는 generated only, `.gitignore` 또는 commit 정책 결정 (Plan에서). drift 가드 PR gate 유지. |
| R6 | catalog 적용 시 transitive dep 충돌 | 🟡 Medium | L | Step 6 PR에서 `pnpm install --frozen-lockfile` PASS + integration test 게이트 |
| R7 | docker-compose context 경로 변경 누락 | 🟠 High | M | `make` 타겟으로 추상화. dev/prod 모두 검증 |
| R8 | OSS DCO 훅과 monorepo 구조 충돌 | 🟢 Low | L | 훅은 root에서 동작. 영향 없음 사전 확인 (.githooks/ 그대로) |

### Mitigation 공통 원칙

- **모든 PR은 `pnpm build && pnpm test:all && pnpm e2e` PASS 게이트**
- **Playwright 56/62 baseline 회귀 0건이 머지 절대 조건**
- **rollback plan**: 각 단계 PR은 단일 revert로 직전 상태 복귀 가능 (git mv는 history 보존)

---

## 7. Pre-mortem (실패 시나리오 5개)

> "이 사이클이 실패한다면 어떤 시나리오인가? 미리 막을 수 있는 것은?"

### Scenario A — "Step 2 폴더 이동 후 docker-compose가 부팅 안 됨"

- **원인**: compose context `../all-flow-backend` → `./apps/backend` 경로 변경 누락. `volumes: - ../all-flow-backend:/app` 라인이 절반만 갱신됨.
- **결과**: dev 환경 붕괴 → 전체 사이클 중단
- **Prevention**: Step 2 PR을 머지 전 `make dev` 100% 회귀 + Playwright 게이트. compose 파일 grep -E 'all-flow-(backend|frontend|infra)' 결과 0건 검증.

### Scenario B — "OpenAPI 이동 후 FE 빌드 실패 (24개 라우트 import 깨짐)"

- **원인**: FE `openapi.yaml` → `packages/contracts/openapi.yaml` 이동 시 `next.config.ts`, generation 스크립트 경로 미갱신.
- **결과**: `next build` 실패 → FE 회귀
- **Prevention**: Step 3 PR에서 `grep -r openapi.yaml apps/frontend` 0 hit 검증 + `pnpm --filter frontend build` PASS 게이트.

### Scenario C — "Prisma client 경로 깨짐 (`@all-flow/backend/node_modules/.prisma`)"

- **원인**: pnpm hoisting 변경으로 Prisma generated client가 hoist root로 이동, BE의 `import { PrismaClient } from '@prisma/client'` 해석 실패.
- **결과**: BE 부팅 실패, 38/38 integration test 0 PASS
- **Prevention**: `apps/backend/package.json`에 `"prisma": { "schema": "./prisma/schema.prisma" }` 명시 + `.npmrc`의 `node-linker=isolated` 또는 `public-hoist-pattern[]=*prisma*` 사전 검증. Step 1 PR에서 `pnpm prisma generate` PASS 필수.

### Scenario D — "catalog 적용 후 zod 메이저 충돌"

- **원인**: BE `zod ^4.3.6`, FE `^4.1.0`을 `catalog: ^4.3.6`으로 강제 통합 → FE 의존성 중 zod ^4.1 강제하는 transitive dep과 충돌.
- **결과**: pnpm install 실패 또는 런타임 schema validation 깨짐
- **Prevention**: Step 6 PR 전 `pnpm why zod` 양쪽 실행 → conflict 사전 식별. catalog 적용은 `zod`부터 한 패키지씩 점진. CI matrix에 양쪽 buildable 게이트.

### Scenario E — "Turborepo task 정의 누락으로 cache 무효"

- **원인**: `turbo.json`의 `outputs: ["dist/**"]`가 Next.js `.next/**` 또는 Prisma `node_modules/.prisma/**` 미포함 → 항상 cache miss.
- **결과**: cache hit 0% → 사용자 가치 0
- **Prevention**: Step 1 PR에서 `turbo run build --summarize` 후 hit/miss 명시 측정. baseline 측정 후 ≥ 80% 달성 못 하면 Step 7 머지 보류.

---

## 8. Stakeholders & RACI

| Stakeholder | Role | Responsibility |
|-------------|------|----------------|
| 메인테이너 (사용자) | A (Accountable) | PRD/Plan/Design 승인, 최종 머지 |
| av-pm-coordinator | C | PRD 작성, 요구사항 도출 (이 문서) |
| av-do-orchestrator | R (Plan/Design) | Plan/Design 작성, Agent Team 스폰 |
| av-base-* + av-oss-dev-lead | R (Do) | 8단계 PR 구현 |
| bkit:gap-detector | R (Check) | match_rate 측정 |
| bkit:pdca-iterator | R (Act) | < 90% 시 자동 개선 |
| Playwright E2E 56/62 | I (게이트) | Step 2 머지 절대 조건 |
| GHA CI | I | turbo cache 측정 보고 |
| OSS 6트랙 (`av-oss-*`) | C | Step 7 (CI), Step 8 (보안/시크릿 스캔) |

---

## Appendix A — Decision Record Chain

| Decision | Owner | Rationale |
|----------|-------|-----------|
| pnpm + Turborepo 2.x 채택 | 사용자 | 사전 결정. 6패키지 규모 적합. |
| **Modular Monolith 유지** (Phase 1만) | PM | 2026 CNCF 42%, Amazon Prime Video 사례. 측정 없는 분리 금지. |
| Prisma schema 단일 유지 | PM | R3 mitigation. 분리 비용 >> 이익. |
| OpenAPI 3.1 + packages/contracts SOR | PM | 직전 사이클 drift 가드 강화 + 단일 출처화 |
| Node 24 이전은 별도 사이클 | PM | 현재 22 안정. 본 사이클 범위 분리. |
| 8단계 점진 PR | PM | R1/R2 mitigation. 각 단계 회귀 0건 게이트. |
| OpenTelemetry는 Phase 2 트리거 | PM | 측정 → 분해 판단. Phase 1에서 도입만 (운영은 Phase 2). |

---

## Appendix B — 다음 단계

```bash
/bkit:pdca plan monorepo-microservices-2026-04-30
# Plan 단계에서 결정할 것:
# - Node 24 이전 여부 (별도 risk gate)
# - packages/ui-kit 본 사이클 포함 여부 (FE 통합 비용)
# - OpenTelemetry 도입 깊이 (collector만 vs BE 계측까지)
# - codemod 범위 (자동 vs 수동 검토)
# - GHA cache 백엔드 (Vercel free vs self-host)
```

---

## Sources (2026-04-30 실사 검증)

- [Turborepo 2.0: Remote Caching, Task Pipelines, and What Actually Speeds Up CI](https://dev.to/whoffagents/turborepo-20-remote-caching-task-pipelines-and-what-actually-speeds-up-ci-52if)
- [Turborepo Configuration Reference](https://turborepo.dev/docs/reference/configuration)
- [pnpm Catalogs](https://pnpm.io/catalogs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Node.js Releases (24.15 LTS — April 2026)](https://nodejs.org/en/about/previous-releases)
- [Node.js Evolving the Release Schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)
- [Rethinking Microservices in 2026: When Modular Monolith Wins](https://enqcode.com/blog/rethinking-microservices-in-2026-when-modular-monolith-architecture-actually-win)
- [Microservices vs Modular Monolith in 2026 (CNCF Q1 2026)](https://www.ancient.global/en/blogs-ancient/microservices-vs-modular-monolith-2026)
- [OpenTelemetry 2026: The Unified Observability Standard](https://techbytes.app/posts/opentelemetry-2026-unified-observability-standard/)

---

**End of PRD** — 다음 액션: `/bkit:pdca plan monorepo-microservices-2026-04-30`
