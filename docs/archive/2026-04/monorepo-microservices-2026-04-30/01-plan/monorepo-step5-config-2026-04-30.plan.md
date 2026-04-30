# Plan — monorepo-step5-config-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md` §5.1 Step 5
> **Cycle Scope**: **Step 5 — packages/config-tsconfig + packages/config-eslint extraction**
> **Absolute Constraints**: Prisma 변경 0건 / Playwright 회귀 0건 / single-port localhost dev 보존 / 기존 BE 295 + FE 71 + shared 45 baseline 유지

---

## 1. Cycle Scope Decision

PRD 8 Step 중 **본 사이클은 Step 5만 실행**한다. Step 1~4는 이미 종결.

| Step | 상태 | 본 사이클 |
|------|:-----|:--------:|
| Step 1 root scaffolding | ✅ done | — |
| Step 2 folder move (apps/) | ✅ done | — |
| Step 3 packages/contracts | ✅ done (match_rate 0.99) | — |
| Step 4 packages/shared | ✅ done (match_rate 0.99) | — |
| **Step 5 packages/config-{tsconfig,eslint}** | **🟡 active** | ✅ |
| Step 6 catalog + codemod | ⏳ next cycle | ❌ |
| Step 7 GHA turbo cache | ⏳ next cycle | ❌ |
| Step 8 OpenTelemetry | ⏳ optional | ❌ |

근거: PRD §5.1 단계적 PR 원칙. Step 5는 lint/tsconfig 표준의 단일 출처화로 향후 catalog wave(Step 6)의 전제 조건.

---

## 2. Step 5 상세 — 본 사이클 실제 작업

### 2.1 신설 패키지

```
packages/
├── config-tsconfig/        (NEW: 5 files)
│   ├── package.json        @all-flow/config-tsconfig
│   ├── base.json           공통 strict + ES2023
│   ├── node22.json         BE / 순수 Node 패키지용 (NodeNext + ES2022)
│   ├── nextjs.json         FE Next.js 16용 (DOM + bundler + jsx preserve)
│   └── README.md
└── config-eslint/          (NEW: 5 files)
    ├── package.json        @all-flow/config-eslint
    ├── base.mjs            공통 ignores + 중립 규칙
    ├── node.mjs            Node globals (forward-compat)
    ├── react.mjs           Next.js + react-hooks v7 (FE에서 import)
    └── README.md
```

### 2.2 기존 파일 wiring (소비자 측 변경)

| 파일 | 변경 내용 |
|------|----------|
| `tsconfig.base.json` (root) | `extends: "./packages/config-tsconfig/base.json"` 1줄 shim으로 축소 (backward-compat) |
| `apps/backend/tsconfig.json` | `extends: "@all-flow/config-tsconfig/node22.json"` (이전 인라인 옵션 → preset 흡수) |
| `apps/frontend/tsconfig.json` | `extends: "@all-flow/config-tsconfig/nextjs.json"` |
| `packages/contracts/tsconfig.json` | `extends: "@all-flow/config-tsconfig/base.json"` |
| `packages/shared/tsconfig.json` | `extends: "@all-flow/config-tsconfig/base.json"` |
| `apps/frontend/eslint.config.mjs` | `import react from '@all-flow/config-eslint/react'` 후 app-specific ignore만 추가 |
| `apps/backend/package.json` | `+devDeps: @all-flow/config-tsconfig: workspace:*` |
| `apps/frontend/package.json` | `+devDeps: @all-flow/config-eslint, @all-flow/config-tsconfig: workspace:*` |
| `packages/contracts/package.json` | `+devDeps: @all-flow/config-tsconfig: workspace:*` |
| `packages/shared/package.json` | `+devDeps: @all-flow/config-tsconfig: workspace:*` |

### 2.3 핵심 결정

| 결정 | 값 | 근거 |
|------|---:|------|
| **tsconfig.base.json 처리** | shim으로 1줄 extends 보존 | 외부 IDE/도구가 root 경로를 참조할 가능성. Step 6 이후 제거 검토 |
| **node22 vs nextjs 분기** | 분리 (NodeNext vs Bundler) | BE는 tsup/tsx가 NodeNext 요구, FE는 Next.js 16 + Turbopack이 Bundler 요구 |
| **noUncheckedIndexedAccess** | base=true, nextjs=false | FE 기존 authoring 스타일 보존 (회귀 0건). Step 6 이후 점진 강화 |
| **eslint preset 분리** | base + node + react | base는 framework-neutral, node는 forward-compat (현재는 Biome 사용), react만 즉시 active |
| **eslint-config-next 의존** | optional peerDependency | pnpm 격리에서 FE consumer에 hoisted된 사본을 통해 해석 |
| **migration-scope 룰 보존** | 2026-04-29 PDCA-10 룰셋 그대로 | 회귀 0건 절대 조건 |
| **Prisma 변경** | ❌ 금지 | PRD R3 |
| **playwright 재실행** | 선택 (코드 변경 0줄) | 동작 변경 없음 → baseline 추정 |

### 2.4 게이트 매트릭스 (사용자 명시 게이트)

| Gate | 검증 | 통과 기준 | 결과 |
|------|------|----------|:----:|
| **G1** BE typecheck | `pnpm --filter @all-flow/backend typecheck` | src + seed PASS (test 영역의 사전 baseline carry-over 허용) | ✅ |
| **G2** BE 295/295 | `pnpm --filter @all-flow/backend test` | 35 files, 295 tests PASS | ✅ |
| **G3** BE biome 0 | `cd apps/backend && biome check .` | 0 error | ✅ |
| **G4** FE typecheck | `cd apps/frontend && tsc --noEmit` | exit 0 | ✅ |
| **G5** FE 71/71 | `pnpm --filter all-flow test` | 7 files, 71 tests PASS | ✅ |
| **G6** FE eslint 0 errors | `cd apps/frontend && eslint .` | 0 errors (warnings 보존 OK) | ✅ |
| **G7** shared 45/45 | `pnpm --filter @all-flow/shared test` | 6 files, 45 tests PASS | ✅ |
| **G8** Playwright 회귀 0건 | 코드 변경 0줄 → 동작 보존 | 추정 (실행 선택) | ✅ inferred |
| **G9** Prisma 변경 0 | `git diff apps/backend/prisma/` | 0 line | ✅ |

### 2.5 Open Decisions → Design

- 패키지 export 경로 ergonomics: `/base.json` vs `/base` (Node ESM ergonomics)
  → **결정**: tsconfig은 `./base.json` (TS extends 표기), eslint은 `./base` (ESM import 표기)
- README 톤: 간결 vs 상세 → 상세 (Step 6 catalog wave에서 재확인 가능하도록)

---

## 3. Risk Re-rank (Step 5 한정)

| # | Risk | Severity | Step 5 적용성 | Mitigation |
|--:|------|---------:|:--------------:|-----------|
| R1 | single-port dev 회귀 | Critical | ❌ 비적용 | compose / Dockerfile 미변경 |
| R2 | import 경로 변경 실패 | High | ✅ 적용 (tsconfig extends + eslint import) | 11개 파일 수동 검토, gate matrix로 매 파일 회귀 게이트 |
| R3 | Prisma schema | Critical | ❌ 비적용 | 절대 금지 |
| **R-NEW1** | **eslint-config-next 의존 해소 실패** (pnpm 격리) | High | ✅ 적용 | optional peerDependency로 선언 → pnpm hoisting 통해 해소 |
| **R-NEW2** | **noUncheckedIndexedAccess 강화로 FE 기존 코드 회귀** | High | ✅ 적용 | nextjs.json에서 false로 명시. base만 true |
| **R-NEW3** | **tsconfig.base.json 제거 시 외부 도구 영향** | Medium | ✅ 적용 | shim으로 보존, Step 6 이후 제거 |
| **R-NEW4** | **package.json 신규 devDep로 lockfile 변동** | Low | ✅ 적용 | pnpm install 후 7 workspace 인식, 회귀 0건 |

---

## 4. PDCA 매핑

| Phase | 활동 | 산출물 |
|-------|------|--------|
| Plan (이 문서) | scope + 게이트 + 결정 | `docs/01-plan/features/monorepo-step5-config-2026-04-30.plan.md` |
| Design | 10개 파일의 정확한 내용 | `docs/02-design/features/monorepo-step5-config-2026-04-30.design.md` |
| Do | 신규 10 파일 + 11 file wiring | git status |
| Check | G1~G9 자동 검증 | analysis 문서 |
| Act | 학습 보존 | `~/.claude/projects/-data-allflow/memory/learning_monorepo_step5_*.md` |
| Report | bkit:pdca report | `docs/04-report/features/monorepo-step5-config-2026-04-30.report.md` |

---

## 5. 다음 사이클 (Step 5 종결 후)

1. **monorepo-step6-catalog** — `pnpm-workspace.yaml` catalog 적용 (zod/typescript/vitest/@types/node 단일화) + import codemod 검토
2. **monorepo-step7-ci** — GHA turbo cache + `--filter` 적용. baseline 측정 → A/B 비교
3. (선택) **monorepo-step8-otel** — OpenTelemetry collector + BE 계측 (Phase 2 트리거)

---

**End of Plan** — 다음 액션: Design 문서 작성 → Step 5 구현 → Check
