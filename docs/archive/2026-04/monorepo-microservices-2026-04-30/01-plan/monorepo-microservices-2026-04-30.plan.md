# Plan — monorepo-microservices-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md`
> **Cycle Scope**: **Step 1 (root scaffolding only)** + 후속 7개 Step의 PR-by-PR 명세화
> **Absolute Constraints**: single-port localhost dev 회귀 0건 / Playwright 56/62 baseline 유지 / Prisma schema 단일 유지 / 코드 변경 0줄

---

## 1. Cycle Scope Decision (사용자 입력 재확인)

PRD 8 Step 중 **본 사이클은 Step 1만 실행**한다.

| Step | 이번 사이클 | 사유 |
|------|:-----------:|------|
| **Step 1** root 골격 (package.json/pnpm-workspace.yaml/turbo.json/tsconfig.base) | ✅ | 비파괴, dev 회귀 0건. import 경로 변경 없음 |
| Step 2 apps/ 폴더 이동 (git mv) | ❌ | 파일 50+개 이동, compose context 갱신 필요. **별도 사이클** |
| Step 3 packages/contracts 추출 | ❌ | OpenAPI SOR 이동 + codemod, BE Zod 재생성 검증 필요 |
| Step 4 packages/shared | ❌ | envelope/errors/ID 추출, BE/FE 양쪽 import 변경 |
| Step 5 packages/config-eslint, config-tsconfig | ❌ | preset 추출. ESLint v9 flat config 호환 검증 |
| Step 6 catalog 적용 | ❌ | zod/types/typescript/vitest 단일화, transitive 충돌 사전 점검 |
| Step 7 GHA turbo cache + --filter | ❌ | CI 시간 baseline 측정 → A/B 비교 필요 |
| Step 8 OpenTelemetry (선택) | ❌ | Phase 2 트리거 |

근거: PRD §5.1 단계적 PR 원칙 + R1/R2 mitigation. 한 사이클에 1 PR 분량으로 분할이 회귀 0건 게이트의 전제.

---

## 2. Step 1 상세 — 본 사이클 실제 작업

### 2.1 산출물 (4 파일 신설, 코드 변경 0줄)

```
/data/allflow/
├── package.json            (NEW) workspaces 정의 + turbo scripts
├── pnpm-workspace.yaml     (NEW) project/all-flow-* 등록
├── turbo.json              (NEW) build/test/lint/typecheck pipeline
└── tsconfig.base.json      (NEW) 공통 ts compilerOptions (paths 미정의)
```

### 2.2 핵심 결정 (Plan에서 확정)

| 결정 | 값 | 근거 |
|------|---:|------|
| **workspaces 경로** | `project/all-flow-backend`, `project/all-flow-frontend`, `project/all-flow-infra` | PRD R1 — 폴더 이동은 Step 2. **본 Step에서는 현 경로 그대로 등록.** apps/* 이동은 별도 사이클. |
| **turbo 버전** | `^2.5.0` (devDependency, root) | PRD §2.4 사용자 사전 결정 |
| **pnpm 버전** | `10.33.0` (packageManager 필드, BE 기존값과 일치) | BE 기존 lock 호환 |
| **Node engine** | `>=22.0.0` (BE/FE 기존값 유지) | Node 24 이전은 별도 risk-gated 사이클 |
| **catalog 적용** | ❌ Step 6에서 | 본 Step은 골격만 |
| **codemod 실행** | ❌ Step 3+에서 | 본 Step은 import 경로 변경 0건 |
| **tsconfig.base.json paths** | 미정의 (빈 paths) | packages/* 추출 전이므로 path mapping 불필요. 미사용 시 무해 |
| **lockfile 통합** | ❌ 본 Step 미실행 | `pnpm install` 시 root에서 lockfile 자동 생성. **본 사이클에서는 root pnpm install 실행하지 않음** (BE/FE 기존 lock 보존). 통합은 Step 2 PR에서. |

### 2.3 turbo.json 파이프라인 정의

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "test":      { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "lint":      { "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] },
    "dev":       { "cache": false, "persistent": true }
  }
}
```

### 2.4 root package.json scripts (passthrough만)

```json
{
  "scripts": {
    "build":     "turbo run build",
    "test":      "turbo run test",
    "lint":      "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev":       "turbo run dev --parallel",
    "test:all":  "turbo run test"
  }
}
```

→ 기존 BE/FE 워크플로우(`pnpm --filter @all-flow/backend test`, `pnpm --dir project/all-flow-frontend dev`)는 그대로 작동. root scripts는 **추가 진입점**일 뿐.

---

## 3. 게이트 매트릭스 (Step 1 머지 조건)

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G1. 파일 4개 정상 생성** | `ls package.json pnpm-workspace.yaml turbo.json tsconfig.base.json` | 4 hits |
| **G2. JSON 문법 유효** | `node -e "JSON.parse(...)"` × 3 + yaml lint | 0 error |
| **G3. BE 회귀 0건** | `cd project/all-flow-backend && pnpm typecheck && pnpm test` | 188+ unit PASS |
| **G4. FE 회귀 0건** | `cd project/all-flow-frontend && pnpm typecheck && pnpm test` | 98+ vitest PASS |
| **G5. dev 환경 회귀 0건** | `cd project/all-flow-infra && make dev` 후 `curl -s http://localhost/health` | HTTP 200 |
| **G6. Playwright baseline** | `cd project/all-flow-frontend && pnpm e2e` | ≥ 56/62 (baseline 동등) |
| **G7. 코드 변경 0줄** | `git diff --stat project/` | 0 file changed |
| **G8. registry 갱신 불필요** | 신규 av-* 컴포넌트 없음 | components.json no diff |

**머지 절대 조건**: G1~G7 모두 PASS. G8은 본 Step에 해당 없음.

---

## 4. Open Decisions (Plan에서 결정 → Design 진입)

### 4.1 Node 24 이전 — 본 사이클 외 ✅ DEFERRED

PRD §1.2 트렌드는 Node 24 Active LTS이나, BE/FE 기존 `engines.node: ">=22.0.0"` 유지. 별도 risk-gated 사이클에서 결정. 본 Step의 root `package.json`도 `>=22.0.0` 사용.

### 4.2 packages/ui-kit 본 사이클 포함 — ❌ 제외

PRD §2.1 선택 항목. FE Storybook 자산 추출 비용(20+ 컴포넌트, Radix 의존성 재배선)이 Step 1 범위 초과. **별도 사이클(Step 4 후속).**

### 4.3 OpenTelemetry 도입 깊이 — ❌ Phase 2 트리거

PRD §2.2 측정 → 분해. 본 사이클은 골격만. OTel collector 도입은 측정 트리거 발생 시점.

### 4.4 codemod 범위 — Step 3에서

본 Step은 import 경로 변경 0건. Step 3 PR에서 jscodeshift script + dry-run + 단계 PR 분할.

### 4.5 GHA cache 백엔드 — Step 7에서

Vercel free vs self-host. 본 Step은 GHA workflow 변경 없음.

### 4.6 lockfile 통합 — Step 2에서

root `pnpm-lock.yaml` 생성은 폴더 이동(Step 2)과 동시 실행. 본 Step은 root `pnpm install`을 **실행하지 않는다** (회귀 위험 차단).

---

## 5. Risk Re-rank (Step 1 한정)

| # | Risk | Severity | Step 1 적용성 | Mitigation |
|--:|------|---------:|:--------------:|-----------|
| R1 | single-port dev 회귀 | Critical | ❌ 본 Step 미적용 | compose 변경 0건 |
| R2 | import 경로 변경 실패 | High | ❌ 본 Step 미적용 | code 변경 0줄 |
| R3 | Prisma schema 분리 | Critical | ❌ 본 Step 미적용 | schema.prisma 미변경 |
| R4 | CI 시간 증가 | Medium | ❌ Step 7 | GHA workflow 미변경 |
| R5 | OpenAPI generated 충돌 | High | ❌ Step 3 | openapi.yaml 미이동 |
| R6 | catalog transitive 충돌 | Medium | ❌ Step 6 | catalog 미적용 |
| R7 | docker-compose 경로 누락 | High | ❌ 본 Step 미적용 | compose 미변경 |
| **R-NEW1** | **root scripts와 BE/FE scripts 명령 충돌** | Low | ✅ 적용 | root는 turbo passthrough만, BE/FE 기존 진입점 보존 |
| **R-NEW2** | **사용자가 무심코 root에서 `pnpm install` 실행 → lockfile 생성으로 BE/FE lock 깨짐** | Medium | ✅ 적용 | Plan/Design에 "Step 1에서는 root install 금지" 명문화 + README 주의 문구 |

---

## 6. PDCA 사이클 매핑 (Step 1)

| Phase | 활동 | 산출물 |
|-------|------|--------|
| Plan (이 문서) | 결정 6건 + 게이트 8건 | `docs/01-plan/.../monorepo-microservices-2026-04-30.plan.md` |
| Design | 4 파일의 정확한 내용 명세 | `docs/02-design/.../monorepo-microservices-2026-04-30.design.md` |
| Do | 4 파일 신설 | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` |
| Check | G1~G7 자동 검증 + bkit:gap-detector | match_rate ≥ 0.90 |
| Act | dev 회귀 게이트 + memory 학습 | learning_monorepo_step1_2026_04_30.md |
| Report | bkit:pdca report | `docs/04-report/.../monorepo-microservices-2026-04-30.report.md` |

---

## 7. 다음 사이클 후보 (사이클 종료 후 PM 결정)

1. **monorepo-step2-folder-move** — git mv `project/all-flow-{backend,frontend,infra}` → `apps/{backend,frontend,infra}`. compose context 갱신. **R1 Critical 게이트 핵심.**
2. **monorepo-step3-contracts** — `packages/contracts` 추출 + OpenAPI SOR 이동.
3. **monorepo-step4-shared** — `packages/shared` (envelope/errors/IDs).
4. (이후 Step 5~7 순차)

---

**End of Plan** — 다음 액션: Design 문서 작성 → Step 1 구현 → Check
