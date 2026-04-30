# Plan — monorepo-step6-catalog-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md` (Step 6 + Step 4.5 codemod)
> **Cycle Scope**: pnpm Catalog 도입 (단일 버전 수렴) + Step 4.5 codemod (BE 25 errors imports + rate-limit.ts → @all-flow/shared)
> **Absolute Constraints**: BE 295/295 + biome 0 / FE 71/71 + eslint 0 / shared 45/45 / Playwright 회귀 0건 / Prisma schema 0 변경

---

## 1. Cycle Scope

본 사이클은 **두 작업의 동시 처리**:

1. **Step 6 catalog wave** — `pnpm-workspace.yaml` 의 `catalog:` 키에 6개 dep 단일화 + 모든 workspace package.json deps를 `catalog:` 토큰으로 치환.
2. **Step 4.5 codemod** — BE의 `from '../shared/errors.js'` / `from '../../shared/errors.js'` 25 hits → `from '@all-flow/shared/errors'` 직접 import 전환. 동시에 `plugins/rate-limit.ts` 의 로컬 `class RateLimitError extends AppError` 정의 제거 → `@all-flow/shared/errors`의 `RateLimitError` 사용.

근거: 두 작업 모두 lockfile 단일 갱신으로 묶이는 게 회귀 위험 1/2. catalog는 격상된 동일-버전 contract, codemod는 그 contract 사용처 일관화 — 함께 가는 것이 의미상 자연스럽다.

---

## 2. Catalog 후보 6개 (사용자 지정)

| dep | 현재 분포 | 결정 catalog 버전 | 근거 |
|-----|----------|------------------:|------|
| **zod** | BE `^4.3.6` / FE `^4.1.0` / shared dev `^4.3.6` / contracts peer `^4.0.0` / shared peer `^4.0.0` | `^4.3.6` | 최신 안정. PRD §1.1 드리프트 가장 큰 dep |
| **typescript** | BE `^5.7.2` / FE `^5.7.3` / contracts `^5.7.2` / shared `^5.7.2` | `^5.7.3` | 최신값. caret 호환 |
| **vitest** | BE `^2.1.8` / FE `^2.1.9` / shared `^2.1.9` | `^2.1.9` | 최신값. caret 호환 |
| **@types/node** | BE `^22.10.0` / FE `^22.13.4` | `^22.13.4` | 최신. Node 22 LTS 호환 |
| **tsup** | BE / contracts / shared 모두 `^8.3.5` | `^8.3.5` | 이미 정렬 |
| **@biomejs/biome** | BE `1.9.4` (정확) | `1.9.4` | 정확 버전 유지. monorepo 다른 곳 미사용 |

**참고**: `peerDependencies`는 catalog에 들어갈 수 없다 (pnpm Catalog 제약 — peer는 caret 범위 자유). zod의 BE/FE/shared dev/devDep만 catalog로 강제. peer는 그대로 `^4.0.0`.

---

## 3. Step 4.5 Codemod 범위

### 3.1 `from '../shared/errors.js'` / `from '../../shared/errors.js'` → `from '@all-flow/shared/errors'`

총 25 hits (전수 수집):

```
src/plugins/auth.ts                         '../shared/errors.js'
src/plugins/error-handler.ts                '../shared/errors.js'
src/plugins/error-handler.test.ts           '../shared/errors.js'
src/plugins/rate-limit.ts                   '../shared/errors.js'   ← (별도 §3.2)
src/plugins/rbac.ts                         '../shared/errors.js'
src/modules/ai/ai.routes.ts                 '../../shared/errors.js'
src/modules/ai/ai-adapter.ts                '../../shared/errors.js'
src/modules/approvals/approvals.routes.ts   '../../shared/errors.js'
src/modules/auth/auth.routes.ts             '../../shared/errors.js'
src/modules/channels/channels.routes.ts     '../../shared/errors.js'
src/modules/clients/clients.routes.ts       '../../shared/errors.js'
src/modules/comments/comments.routes.ts     '../../shared/errors.js'
src/modules/docs/docs.routes.ts             '../../shared/errors.js'
src/modules/events/events.routes.ts         '../../shared/errors.js'
src/modules/identity/identity.routes.ts     '../../shared/errors.js'
src/modules/issues/issues.routes.ts         '../../shared/errors.js'
src/modules/notifications/notifications.routes.ts  '../../shared/errors.js'
src/modules/org/org.routes.ts               '../../shared/errors.js'
src/modules/projects/projects.routes.ts     '../../shared/errors.js'
src/modules/realtime/realtime.ws.ts         '../../shared/errors.js'
src/modules/reports/reports.routes.ts       '../../shared/errors.js'
src/modules/resources/resources.routes.ts   '../../shared/errors.js'
src/modules/search/search.routes.ts         '../../shared/errors.js'
src/modules/tasks/tasks.routes.ts           '../../shared/errors.js'
```

= 24 import sites (rate-limit.ts 1개 포함). `src/shared/errors.ts` 자체는 re-export shim이며 본 codemod의 대상이 아니다 (별도 §6 처리 결정).

### 3.2 `plugins/rate-limit.ts` 의 로컬 RateLimitError 제거

```ts
// BEFORE
import { AppError } from '../shared/errors.js';

class RateLimitError extends AppError {
  constructor(retryAfterSec: number) {
    super({ code: 'RATE_LIMITED', message: `..`, statusCode: 429, details: { retryAfterSec } });
    this.name = 'RateLimitError';
  }
}
// ...
throw new RateLimitError(retryAfterSec);

// AFTER
import { RateLimitError } from '@all-flow/shared/errors';
// (로컬 class 정의 4줄 제거)
// ...
throw new RateLimitError({ retryAfterSec });   // ← shared의 시그니처 정합 (별도 §3.3 대조)
```

### 3.3 shared `RateLimitError` 시그니처 대조

shared의 RateLimitError 호출 시그니처를 사전 확인하여 회귀를 막는다 (Design 단계).

### 3.4 BE shim 처리 결정

`src/shared/errors.ts` 는 re-export-only shim이며 해당 작업 후에도 (a) re-export로 보존, (b) 제거 후 모든 import를 catalog 패키지 직접 import로 통합 — 본 plan에서는 **(a) 보존**. 이유: shim은 5 LOC, 보존 비용 0, 제거 시 shared error 시그니처 노출 단일 출처가 깨지지 않는 게 더 안전. 후속 정리는 Step 7+에서.

→ Design에서 25 → 24로 정합 (rate-limit이 import 경로 + 로컬 class 제거 = 1 site 2 변경).

---

## 4. 게이트 매트릭스

| Gate | 검증 방법 | 통과 기준 |
|------|----------|----------|
| **G1. catalog dedup** | `pnpm install` 후 `pnpm why zod` / `typescript` / `vitest` | 해당 dep 단일 버전 1회 설치 |
| **G2. BE typecheck + tests + biome** | `pnpm --filter @all-flow/backend typecheck && pnpm --filter @all-flow/backend test && pnpm --filter @all-flow/backend lint` | typecheck 0 / 295/295 / biome 0 |
| **G3. FE typecheck + tests + eslint** | `pnpm --filter all-flow typecheck && pnpm --filter all-flow test && pnpm --filter all-flow lint` | typecheck 0 / 71/71 / eslint 0 errors |
| **G4. shared tests** | `pnpm --filter @all-flow/shared test` | 45/45 |
| **G5. contracts (있으면)** | `pnpm --filter @all-flow/contracts typecheck && pnpm --filter @all-flow/contracts build` | exit 0 |
| **G6. Playwright 회귀 0건** | dev 환경 가동 후 `pnpm --filter all-flow e2e` | ≥ 56/62 (baseline) |
| **G7. Prisma 변경 0** | `git diff --stat apps/backend/prisma` | 0 file changed |
| **G8. lockfile 정상화** | `pnpm install --frozen-lockfile` (post-commit) | exit 0 |
| **G9. codemod 결과 검증** | `grep -rn "shared/errors" apps/backend/src \| grep -v 'src/shared/errors.ts'` | 0 hits (모두 @all-flow/shared/errors로 전환) |
| **G10. RateLimitError 로컬 정의 제거** | `grep -n "class RateLimitError" apps/backend/src/plugins/rate-limit.ts` | 0 hits |

머지 절대 조건: G1~G7, G9, G10 모두 PASS. G8은 commit 후 별도 검증.

---

## 5. Risk Re-rank

| # | Risk | Severity | Likelihood | Mitigation |
|--:|------|---------:|-----------:|-----------|
| **R1** | catalog 적용 후 `pnpm install` 실패 (peer/transitive 충돌) | 🟠 High | M | dep 단위 단계 적용. 적용 후 `pnpm install --frozen-lockfile` 실패 시 즉시 catalog rollback. zod는 BE+FE 메이저 동일(4.x) 사전 확인됨. |
| **R2** | TypeScript 5.7.2 → 5.7.3 미세 동작 차이 | 🟢 Low | L | 같은 minor. typecheck 게이트로 즉시 검증 |
| **R3** | rate-limit.ts에서 RateLimitError 인자 시그니처 mismatch (로컬 vs shared) | 🟠 High | M | Design §1에서 shared 시그니처 정확 명시 → 호출 사이트 정합 변경 동시. `rate-limit.test.ts` 통과 게이트 |
| **R4** | codemod 미적용 import (build typecheck pass였는데 런타임 실패) | 🟠 High | L | typecheck로 import 미해석 차단. 보수: re-export shim 보존(§3.4)으로 안전망 |
| **R5** | `@types/node` 22.10 → 22.13 lib type 변경으로 BE 타입 회귀 | 🟡 Medium | L | BE typecheck 게이트로 즉시 검증 |
| **R6** | `vitest 2.1.8 → 2.1.9` BE 테스트 동작 미세 차이 | 🟢 Low | L | minor 차이. 295/295 게이트 |
| **R7** | Playwright 회귀 (FE 실배선 영향) | 🔴 Critical | L | FE 코드 변경 0줄. catalog는 dev dep만. 회귀 위험 매우 낮음 |
| **R8** | `tsconfig.base.json` 외 readonly tsconfig가 catalog 영향 받음 | 🟢 Low | L | tsconfig는 catalog 무관 |

---

## 6. PDCA 사이클 매핑

| Phase | 활동 | 산출물 |
|-------|------|--------|
| Plan (이 문서) | 결정 사항 + 게이트 10건 | 본 문서 |
| Design | catalog 정확 YAML + codemod 변환 표 + rate-limit.ts diff | step6 design |
| Do | (1) pnpm-workspace.yaml catalog 추가, (2) 6 dep × N package.json catalog: 치환, (3) BE 25 import 사이트 codemod, (4) rate-limit.ts 로컬 class 제거, (5) `pnpm install` | 변경 파일 |
| Check | G1~G10 자동 검증 + bkit:gap-detector | match_rate ≥ 0.90 |
| Act | 학습 보존 + memory-keeper | learning 메모리 |
| Report | bkit:pdca report | step6 report |

---

**End of Plan** — 다음 액션: Design 작성 → 구현 → Check
