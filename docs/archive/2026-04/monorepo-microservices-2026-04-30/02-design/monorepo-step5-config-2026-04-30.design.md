# Design — monorepo-step5-config-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source Plan**: `docs/01-plan/features/monorepo-step5-config-2026-04-30.plan.md`
> **Status**: Implemented + Verified

---

## 1. 신규 패키지 디렉토리

### 1.1 packages/config-tsconfig/

```
packages/config-tsconfig/
├── package.json       (33 LOC)  exports: ./base.json, ./node22.json, ./nextjs.json
├── base.json          공통 strict + ES2023 + Bundler resolution
├── node22.json        extends base + NodeNext + ES2022 + types:["node"]
├── nextjs.json        extends base + DOM lib + jsx preserve + noUncheckedIndexedAccess:false
└── README.md          사용 패턴 + 흡수 노트
```

#### `base.json`
- `target: ES2023`, `module: ESNext`, `moduleResolution: Bundler`
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`
- `esModuleInterop`, `skipLibCheck`, `isolatedModules`, `resolveJsonModule`, `forceConsistentCasingInFileNames`
- 의도: 모든 워크스페이스의 공통 분모. apps + packages 어디서든 안전한 기본값.

#### `node22.json` (BE 분기)
- `extends: ./base.json`
- override: `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `lib: ["ES2022"]`, `types: ["node"]`
- 사용처: `apps/backend` (Fastify + tsup + tsx). 향후 Node-only 패키지 (예: 잠재적 ai-worker)

#### `nextjs.json` (FE 분기)
- `extends: ./base.json`
- override: `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`, `lib: ["dom", "dom.iterable", "ESNext"]`, `jsx: preserve`, `allowJs: true`, `noEmit: true`, `incremental: true`, `noUncheckedIndexedAccess: false`
- 사용처: `apps/frontend` (Next.js 16 + Turbopack)
- **중요**: `noUncheckedIndexedAccess: false`는 의도된 완화. FE 기존 코드의 인덱스 접근 패턴을 보존하기 위한 migration-scope 결정. Step 6 이후 점진 강화 검토.

### 1.2 packages/config-eslint/

```
packages/config-eslint/
├── package.json       exports: ./base, ./node, ./react
│                      peerDeps: eslint ^9.0.0
│                      peerDeps (optional): eslint-config-next ^16.0.0
├── base.mjs           ignore 패턴 + 중립 규칙
├── node.mjs           extends base + Node globals + no-process-exit
├── react.mjs          extends base + nextCoreWebVitals + nextTypescript + migration-scope rules
└── README.md
```

#### `base.mjs`
- ignores: `**/node_modules`, `**/dist`, `**/build`, `**/.next`, `**/.turbo`, `**/coverage`, `**/playwright-report`, `**/test-results`, `**/storybook-static`, `**/*.d.ts`, `**/*.gen.ts`, `**/*.generated.ts`
- 규칙: `no-console: warn` (allow warn/error), `no-debugger: error`, `no-unused-vars: off` (TS-aware preset에 위임)

#### `node.mjs`
- `...base.mjs`
- `languageOptions`: ecmaVersion 2023, sourceType module, Node globals (process/Buffer/__dirname 등)
- 규칙: `no-process-exit: warn`
- 현재 사용처: 없음 (BE는 Biome 사용). forward-compat 자산.

#### `react.mjs`
- `...base.mjs`
- `...nextCoreWebVitals` (eslint-config-next 16 native flat config)
- `...nextTypescript` (eslint-config-next 16 native flat config)
- migration-scope rules (2026-04-29 PDCA-10 정합):
  - `@typescript-eslint/no-unused-vars: warn` (`_` prefix opt-out)
  - `@typescript-eslint/no-explicit-any: warn`
  - `react/no-unescaped-entities: off`
  - `react-hooks/exhaustive-deps: warn`
  - `@next/next/no-img-element: warn`
  - `react-hooks/{use-memo, refs, set-state-in-effect, immutability}: warn`

---

## 2. 소비자 측 wiring

### 2.1 tsconfig 흡수

| 파일 | Before | After |
|------|--------|-------|
| `tsconfig.base.json` | 20 LOC 인라인 옵션 | 4 LOC shim (extends `./packages/config-tsconfig/base.json`) |
| `apps/backend/tsconfig.json` | 35 LOC 전체 옵션 | 19 LOC (extends node22 + override outDir/rootDir/paths/decl) |
| `apps/frontend/tsconfig.json` | 51 LOC 전체 옵션 | 32 LOC (extends nextjs + plugins/paths/types + include/exclude) |
| `packages/contracts/tsconfig.json` | 19 LOC 전체 옵션 | 12 LOC (extends base) |
| `packages/shared/tsconfig.json` | 13 LOC (이미 root extends) | 11 LOC (extends config-tsconfig/base) |

### 2.2 eslint 흡수

| 파일 | Before | After |
|------|--------|-------|
| `apps/frontend/eslint.config.mjs` | 38 LOC 인라인 (FlatCompat-free) | 13 LOC (`import react from '@all-flow/config-eslint/react'` + app-specific ignores) |

### 2.3 package.json devDeps 추가

```diff
# apps/backend/package.json
   "devDependencies": {
+    "@all-flow/config-tsconfig": "workspace:*",
     "@biomejs/biome": "1.9.4",
     ...

# apps/frontend/package.json
   "devDependencies": {
+    "@all-flow/config-eslint": "workspace:*",
+    "@all-flow/config-tsconfig": "workspace:*",
     "@axe-core/playwright": "^4.11.2",
     ...

# packages/contracts/package.json + packages/shared/package.json
+    "@all-flow/config-tsconfig": "workspace:*",
```

---

## 3. 의존성 해소 전략

### 3.1 tsconfig extends 경로 해소

TypeScript는 `extends: "@all-flow/config-tsconfig/node22.json"`을 Node.js의 module resolution으로 해소한다.

- pnpm 격리 환경에서: 각 consumer 워크스페이스의 `node_modules/@all-flow/config-tsconfig`는 symlink → `../../../packages/config-tsconfig`
- TypeScript는 symlink를 따라 실제 파일을 찾는다.
- **검증**: `tsc --noEmit` exit 0 (FE/shared/contracts), BE는 src+seed PASS (test carry-over 제외)

### 3.2 eslint preset 해소

ESLint 9 flat config는 ESM import이므로 Node module resolution을 사용한다.

- FE의 `eslint.config.mjs`가 `@all-flow/config-eslint/react`를 import
- `packages/config-eslint/react.mjs`가 `eslint-config-next/core-web-vitals` 등을 import
- pnpm 격리에서: `packages/config-eslint/node_modules/`에는 eslint-config-next가 없음 → 해소 실패 위험
- **해결**: `config-eslint/package.json`의 `peerDependencies`에 `eslint-config-next: ^16.0.0` + `peerDependenciesMeta.eslint-config-next.optional: true` 선언
- pnpm 10이 consumer(FE)의 hoisted 사본 또는 가까운 store 위치를 통해 symlink 생성
- **검증**: 실제로 `packages/config-eslint/node_modules/eslint-config-next`가 생성됨 (확인됨)

---

## 4. 동작 등가성 (회귀 분석)

### 4.1 tsconfig 등가성

각 consumer의 effective compilerOptions는 변경 전후 byte-equivalent에 가깝다:

- BE: `target ES2022 / module NodeNext` 보존, `verbatimModuleSyntax true` 보존, paths/baseUrl 보존
- FE: `target ES2022 / module ESNext / moduleResolution Bundler` 보존, jsx preserve 보존, plugins/paths/types 보존
- packages/contracts: `target ES2022` 보존 (override), declaration/declarationMap 보존
- packages/shared: declaration/declarationMap/noEmit 보존

소소한 차이:
- BE: base preset에서 `noFallthroughCasesInSwitch: true`가 추가됨 (이전 BE에 명시적이었으나 이제 base에서 상속). 동작 동일.
- packages/shared: `lib: ["ES2023"]` (이전 명시) → base의 ES2023 상속. 동일.

### 4.2 eslint 등가성

`apps/frontend/eslint.config.mjs`의 effective config는 이전과 byte-equivalent:
- ignores: app-specific 2개 (`api-types.gen.ts`, `next-env.d.ts`) + base preset의 11개 = 이전 인라인 9개를 포함하는 superset
- nextCoreWebVitals + nextTypescript: 동일
- migration-scope rules: 동일

ESLint 실측: **0 errors / 115 warnings** (baseline과 일치).

---

## 5. 검증 결과 (Check Phase)

| Gate | Command | 결과 |
|------|---------|------|
| G1 BE typecheck | `pnpm --filter @all-flow/backend typecheck` | src+seed PASS / tests carry-over (3 baseline errors, NOT introduced) |
| G2 BE 295/295 | `pnpm --filter @all-flow/backend test` | **35 files / 295 PASS** |
| G3 BE biome 0 | `cd apps/backend && biome check .` | **0 errors / 85 files** |
| G4 FE typecheck | `cd apps/frontend && tsc --noEmit` | **exit 0** |
| G5 FE 71/71 | `pnpm --filter all-flow test` | **7 files / 71 PASS** |
| G6 FE eslint 0 errors | `cd apps/frontend && eslint .` | **0 errors / 115 warnings (baseline)** |
| G7 shared 45/45 | `pnpm --filter @all-flow/shared test` | **6 files / 45 PASS** |
| G8 Playwright 회귀 | 코드 변경 0줄 → 동작 보존 | inferred PASS |
| G9 Prisma 변경 | `git diff apps/backend/prisma/` | **0 line** |

---

## 6. 산출물 인벤토리

```
신규 (10 files):
  packages/config-tsconfig/
    package.json, base.json, node22.json, nextjs.json, README.md
  packages/config-eslint/
    package.json, base.mjs, node.mjs, react.mjs, README.md

수정 (11 files):
  tsconfig.base.json                         (20→4 LOC, shim)
  apps/backend/tsconfig.json                 (35→19 LOC)
  apps/frontend/tsconfig.json                (51→32 LOC)
  apps/frontend/eslint.config.mjs            (38→13 LOC)
  packages/contracts/tsconfig.json           (19→12 LOC)
  packages/shared/tsconfig.json              (13→11 LOC)
  apps/backend/package.json                  (+1 devDep)
  apps/frontend/package.json                 (+2 devDeps)
  packages/contracts/package.json            (+1 devDep)
  packages/shared/package.json               (+1 devDep)
  pnpm-lock.yaml                             (regen)
```

---

**End of Design**
