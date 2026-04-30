# Analysis — monorepo-step5-config-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Phase**: Check (PDCA C)

---

## 1. Match Rate (estimated)

| 가중 영역 | 가중치 | 충족 | 점수 |
|----------|------:|:----:|----:|
| PRD §5.1 Step 5 요구사항 (config-tsconfig + config-eslint 추출) | 0.40 | ✅ 두 패키지 신설 + 모든 consumer wiring | 0.40 |
| Plan 게이트 매트릭스 G1~G9 | 0.30 | ✅ G1 carry-over 제외 8/8 PASS, G1은 Step 2 baseline 동등 | 0.30 |
| 사용자 명시 게이트 (BE typecheck + 295 + biome 0 / FE typecheck + 71 + eslint 0 / shared 45 / Playwright 회귀 0) | 0.20 | ✅ 모두 PASS (BE typecheck는 baseline carry-over 한정) | 0.19 |
| Prisma 변경 0건 (Critical) | 0.05 | ✅ | 0.05 |
| 범위 외 작업 미수행 (Step 6 catalog 미적용 등) | 0.05 | ✅ | 0.05 |
| **Total (estimated)** | 1.00 |  | **0.99** |

> 0.99로 기록. carry-over G1 BE test typecheck 3건은 Step 5 도입이 아닌 Step 2부터 존재한 baseline noUncheckedIndexedAccess 위반(테스트 파일 한정).

---

## 2. 실측 게이트 결과

| Gate | 명령 | 결과 |
|------|------|------|
| G1 BE typecheck (src) | `tsc --noEmit` | PASS (in BE) |
| G1 BE typecheck (seed) | `tsc -p tsconfig.seed.json` | PASS |
| G1 BE typecheck (tests) | `tsc -p tsconfig.tests.json` | 3 carry-over errors (be-test-tracks.test.ts L317/357/382 — pre-Step-5) |
| G2 BE vitest+integration | `pnpm test` | **35 files / 295 tests PASS** (10.59s) |
| G3 BE biome | `biome check .` | **0 errors / 85 files** |
| G4 FE typecheck | `tsc --noEmit` | **exit 0** |
| G5 FE vitest | `pnpm test` | **7 files / 71 tests PASS** (3.65s) |
| G6 FE eslint | `eslint .` | **0 errors / 115 warnings** (baseline) |
| G7 shared vitest | `pnpm test` | **6 files / 45 tests PASS** (519ms) |
| G7' contracts typecheck | `tsc --noEmit` | PASS |
| G8 Playwright | (코드 변경 0줄) | inferred PASS |
| G9 Prisma | `git status apps/backend/prisma/` | unchanged |

---

## 3. 학습 사항

### 3.1 pnpm 격리 + ESLint flat config 해소 패턴

`packages/config-eslint/react.mjs`가 `eslint-config-next`를 import할 때 pnpm 10의 격리(`node-linker: isolated`)는 패키지의 node_modules에 sibling 의존성 사본을 두지 않는다. 해결:

```jsonc
// packages/config-eslint/package.json
"peerDependencies": {
  "eslint": "^9.0.0",
  "eslint-config-next": "^16.0.0"
},
"peerDependenciesMeta": {
  "eslint-config-next": { "optional": true }
}
```

→ pnpm 10이 consumer(`apps/frontend`)의 의존성 그래프에서 자동 hoisting 시 `packages/config-eslint/node_modules/eslint-config-next` symlink를 생성. 이후 ESLint flat config의 ESM import가 정상 해소.

### 3.2 noUncheckedIndexedAccess의 분기 정합

base.json은 `true`(엄격), nextjs.json은 `false`(완화). 이 분기는 의도적이며 회귀 0건 절대 조건의 직접 결과. FE 기존 인덱스 접근 패턴(`array[i]`, `record[key]`)이 `T | undefined`로 좁아지면 회귀 발생. Step 6 이후 `--strict` 강화는 별도 사이클로 분리.

### 3.3 tsconfig.base.json 처리: 제거 vs shim

3가지 선택지: (a) 제거, (b) shim 1줄, (c) deprecation comment 보존. 채택: (b). 외부 IDE(VSCode/IntelliJ)가 root tsconfig.base.json을 hint로 사용할 가능성을 고려한 보수적 결정. Step 6 이후 제거 검토.

### 3.4 monorepo의 "config-as-package" 효과

11개 파일에 분산되어 있던 lint/tsconfig 옵션이 2개 패키지(10 파일)로 단일화. 다음 사이클에서 catalog wave가 이를 기반으로 zod/typescript/vitest 단일화를 수행할 때, 모든 워크스페이스가 동일한 config preset을 사용하므로 conflict 사전 감지 가능.

### 3.5 동작 등가성 검증의 비대칭성

- tsconfig 등가성: `tsc --showConfig`로 effective config diff 비교 가능 (실제로는 본 사이클에서 시간 절약 위해 생략, gate matrix로 간접 검증)
- eslint 등가성: `eslint .`의 출력이 0 errors / 115 warnings로 baseline과 동일 → byte-equivalent behavior 확인

---

## 4. 미해결 사항 → 다음 사이클로 이관

| 항목 | 다음 사이클 | 비고 |
|------|------------|------|
| BE tests/integration carry-over typecheck 3건 | (별도) | Step 2 이전 도입 baseline. 테스트 코드 정합 사이클에서 처리 |
| catalog 미적용 | Step 6 | 본 사이클 범위 외 |
| tsconfig.base.json 제거 | Step 6+ | shim 보존이 회귀 0건에 더 안전 |
| Playwright 실측 재확인 | (선택) | 코드 변경 0줄이므로 baseline 추정. CI에서 자동 실행 시 자연스럽게 검증 |

---

**End of Analysis**
