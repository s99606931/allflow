# Plan — monorepo-step3-contracts-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md` (Step 3)
> **Cycle Scope**: **Step 3 only** — `packages/contracts` 신설 + OpenAPI SOR 이동 + import 경로 codemod
> **Absolute Constraints**: Prisma schema 절대 미수정 / single-port localhost 회귀 0건 / Playwright 56/62 baseline 유지

---

## 1. Cycle Scope (PRD §5.1)

| Step | 이번 사이클 | 사유 |
|------|:-----------:|------|
| Step 1 root scaffolding | ✅ done | Step 1 cycle (match_rate 0.9625) |
| Step 2 apps/ folder move | ✅ done | Step 2 cycle (4 services healthy) |
| **Step 3 packages/contracts** | ✅ **본 사이클** | OpenAPI SOR 이동 + Zod/TS codegen 추출 |
| Step 4 packages/shared | ❌ next | envelope/errors/ID 추출 |
| Step 5 packages/config-* | ❌ later | preset 추출 |
| Step 6 catalog | ❌ later | zod/types/typescript 단일화 |
| Step 7 GHA cache | ❌ later | CI 시간 측정 |
| Step 8 OTel | ❌ later | Phase 2 트리거 |

---

## 2. Step 3 산출물

```
/data/allflow/
├── pnpm-workspace.yaml                        (EDIT) 'packages/contracts' 등록
├── packages/
│   └── contracts/                             (NEW)
│       ├── package.json                       name: @all-flow/contracts
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── openapi.yaml                       (← apps/frontend/openapi.yaml git mv)
│       ├── scripts/
│       │   ├── openapi-to-zod.mjs             ← apps/backend/scripts/openapi-to-zod.mjs 이동/적응
│       │   └── openapi-to-types.mjs           ← apps/frontend openapi:gen 캡슐화
│       ├── src/
│       │   ├── index.ts                       re-exports zod + types
│       │   ├── zod/index.ts                   (gitignore: generated)
│       │   └── types/index.ts                 (gitignore: generated)
│       └── README.md                          SOR 사용법
├── apps/backend/
│   ├── package.json                           (EDIT) deps: "@all-flow/contracts": "workspace:*"
│   │                                                  scripts: openapi:gen → contracts gen
│   │                                                  scripts: openapi:check → contracts drift
│   │                                                  scripts: openapi:contract → contracts paths check
│   ├── scripts/openapi-to-zod.mjs             (DELETE — moved to packages/contracts)
│   ├── scripts/openapi-drift.mjs              (EDIT) read packages/contracts/openapi.yaml
│   ├── scripts/openapi-contract-check.mjs     (EDIT) SPEC path
│   ├── tests/integration/frontend-contract-mirror.test.ts (EDIT) SPEC path
│   ├── src/shared/schemas/index.ts            (KEEP) re-exports api.generated.ts
│   ├── src/shared/schemas/api.generated.ts    (KEEP) — generation moves to packages/contracts but BE re-export untouched
│   └── src/modules/**.routes.ts               (EDIT comment-only) "frontend openapi.yaml" → "@all-flow/contracts"
└── apps/frontend/
    ├── package.json                           (EDIT) deps: "@all-flow/contracts": "workspace:*"
    │                                                  scripts: openapi:check / openapi:gen → packages/contracts/openapi.yaml
    └── openapi.yaml                           (DELETE — git mv to packages/contracts/openapi.yaml)
```

---

## 3. 핵심 결정 (Plan에서 확정)

| 결정 | 값 | 근거 |
|------|---:|------|
| **package name** | `@all-flow/contracts` | 사용자 지정 |
| **SOR 위치** | `packages/contracts/openapi.yaml` | PRD §2.5 |
| **빌드 도구** | tsup (BE와 동일) | 학습 곡선 0, dual ESM/CJS 가능 |
| **Zod 생성기** | 기존 `openapi-to-zod.mjs` 이동 (검증된 코드) | R2 mitigation — 새 라이브러리 도입 0 |
| **TS types 생성기** | `openapi-typescript` (FE 기존과 동일 npx 호출) | drift 위험 0 |
| **generated 코드 commit 정책** | **gitignore** (build 산출물) | PRD R5 — generated only 폴더는 .gitignore |
| **BE consumer 임팩트** | **0 코드 변경** — `src/shared/schemas/api.generated.ts` 위치 유지, 생성 스크립트만 packages/contracts로 이동 | R2/R5 mitigation — 보수적 codemod |
| **FE consumer 임팩트** | **0 코드 변경** — `src/lib/api-types.gen.ts` 위치 유지, 생성 명령만 변경 | 동일 |
| **catalog 적용** | ❌ Step 6에서 | 본 Step 범위 외 |
| **lockfile 갱신** | `pnpm install` 1회 (workspace dep 해석) | 회귀 0건 |
| **import 경로 codemod 범위** | scripts + tests + 주석만 (실제 import 경로는 변경 0) | "BE/FE의 openapi.yaml 참조를 @all-flow/contracts로 codemod" 요구사항 충족 |

### 3.1 보수적 codemod 전략 (R2 mitigation)

요구사항: "BE/FE의 openapi.yaml 참조를 @all-flow/contracts로 codemod"

**해석**:
- **파일 시스템 참조** (scripts, tests, package.json paths) → packages/contracts/openapi.yaml로 갱신
- **주석/문자열 참조** ("frontend openapi.yaml" 같은 doc string) → "@all-flow/contracts" 표기 갱신
- **소스 코드 import 경로** (api.generated.ts, api-types.gen.ts) → **건드리지 않음** (별도 사이클 — Step 4와 합치거나 Step 3.5로 분리)

근거: 한 PR에서 "SOR 이동 + 생성 파이프라인 신설 + 모든 consumer 코드 import 경로 변경"을 동시 진행하면 회귀 면적 폭증. 본 Step의 핵심 가치(SOR 단일화)는 **생성 파이프라인 이동**으로 100% 달성된다. consumer side는 generated 파일을 읽으므로 import 경로 변경이 SOR 단일화와 직교한다.

---

## 4. 게이트 매트릭스 (Step 3 머지 조건)

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G1. packages/contracts 골격 정상** | `ls packages/contracts/{package.json,openapi.yaml,tsconfig.json,tsup.config.ts}` | 4 hits |
| **G2. workspace 등록** | `pnpm install` (root) | 0 error, lockfile 갱신 정상 |
| **G3. Zod 재생성 동등성** | `pnpm --filter @all-flow/backend openapi:gen` 후 `git diff src/shared/schemas/api.generated.ts` | 0 diff |
| **G4. Zod drift PASS** | `pnpm --filter @all-flow/backend openapi:check` | exit 0 |
| **G5. BE typecheck + 295/295** | `pnpm --filter @all-flow/backend typecheck && pnpm --filter @all-flow/backend test && pnpm --filter @all-flow/backend test:int` | 295/295 PASS |
| **G6. FE typecheck + 71/71** | `pnpm --filter all-flow typecheck && pnpm --filter all-flow test` | 71/71 PASS |
| **G7. openapi:contract:strict** | `pnpm --filter @all-flow/backend openapi:contract:strict` | exit 0 |
| **G8. Playwright regression** | `pnpm --filter all-flow e2e` | ≥ 56/62 (baseline 회귀 0) |
| **G9. Prisma schema 미수정** | `git diff apps/backend/prisma/` | 0 line changed |
| **G10. single-port dev healthy** | (이미 Step 2에서 검증됨) | 본 Step은 dev infra 미수정이므로 회귀 면적 0 |

---

## 5. 위험 / 완화 (Top 5)

| # | Risk | Sev | Like | Mitigation |
|--:|------|----:|-----:|-----------|
| R1 | BE openapi:gen이 새 경로에서 빈 파일 산출 | 🔴 Crit | M | G3 (zero-diff regenerate) 통과 전까지 머지 금지 |
| R2 | pnpm workspace dep 해석 실패 → BE/FE build broken | 🟠 High | M | G2 + G5 + G6 게이트, lockfile 변경 git diff 검토 |
| R3 | openapi.yaml git mv 실패 → 파일 history 손실 | 🟡 Med | L | `git mv` 사용 + `git log --follow packages/contracts/openapi.yaml` 검증 |
| R4 | BE drift 가드의 hash file 위치 변경 누락 | 🟠 High | M | scripts에서 GEN/HASH 경로는 변경 없음 (BE 내부 유지). SRC 경로만 외부화 |
| R5 | Step 4(shared) 진입 시 충돌 | 🟢 Low | L | Step 3는 contracts만. shared는 별도 PR |

---

## 6. 작업 순서 (1 PR)

```
1. Plan/Design docs (이 파일 + design)
2. packages/contracts 골격 생성 (package.json, tsconfig.json, tsup.config.ts, README, .gitignore)
3. git mv apps/frontend/openapi.yaml → packages/contracts/openapi.yaml
4. apps/backend/scripts/openapi-to-zod.mjs → packages/contracts/scripts/ (이동 + SRC/OUT 경로 갱신)
5. apps/backend/scripts/{openapi-drift.mjs, openapi-contract-check.mjs} (SRC 경로만 갱신)
6. apps/backend/tests/integration/frontend-contract-mirror.test.ts (SPEC 경로 갱신)
7. apps/backend/package.json (deps + scripts 갱신)
8. apps/frontend/package.json (deps + scripts 갱신)
9. apps/backend src/modules/**.routes.ts + src/shared/schemas/{index.ts, api.generated.ts banner} (주석 갱신)
10. pnpm-workspace.yaml에 packages/contracts 등록
11. pnpm install (root) — lockfile 갱신
12. G1~G9 게이트 실행
13. Analysis + bkit gap-detector
14. Commit + memory keeper
```

---

## 7. Out of Scope (이 사이클 명시 제외)

- BE/FE 소스 코드 import 경로 변경 (`@all-flow/contracts/zod` 직접 import) — Step 3.5 또는 Step 4 합치기 후보
- packages/shared 추출 — Step 4
- catalog 적용 — Step 6
- Prisma schema 변경 (PRD R3 절대 금지)
- single-port dev compose 파일 수정 (Step 2에서 안정화됨, 변경 0)
- Node 24 이전

---

**End of Plan** — 다음: Design 문서 작성 후 Do 단계 진입.
