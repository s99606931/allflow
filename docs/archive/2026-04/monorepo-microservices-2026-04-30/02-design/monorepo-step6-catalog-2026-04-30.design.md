# Design — monorepo-step6-catalog-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source Plan**: `docs/01-plan/features/monorepo-step6-catalog-2026-04-30.plan.md`
> **Phase**: Design (PDCA)

---

## 1. shared `RateLimitError` 시그니처 정합

```ts
// packages/shared/src/errors/http-errors.ts
export class RateLimitError extends AppError {
  constructor(message = '요청이 너무 많습니다', details?: unknown) {
    super({ code: 'RATE_LIMITED', message, statusCode: 429, details });
    this.name = 'RateLimitError';
  }
}
```

→ `(message, details?)` 시그니처. 기존 BE 로컬 클래스는 `(retryAfterSec)` 단일 인자 + 메시지 생성.

**호출 사이트 변경**:

```ts
// BEFORE (rate-limit.ts:130)
throw new RateLimitError(retryAfterSec);

// AFTER
throw new RateLimitError(
  `요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도하세요.`,
  { retryAfterSec },
);
```

→ envelope (`code`, `statusCode`, `details.retryAfterSec`) 완전 동일. 메시지 문자열도 동일. 회귀 0건.

---

## 2. pnpm-workspace.yaml — Catalog 추가

```yaml
# ALL-Flow monorepo workspaces
# Step 2 (2026-04-30): folder migrated to apps/. infra has no package.json (Makefile-driven, excluded).
# Step 3 (2026-04-30): packages/* activated — @all-flow/contracts (OpenAPI SOR + codegen).
# Step 4 (2026-04-30): @all-flow/shared.
# Step 5 (2026-04-30): @all-flow/config-tsconfig + @all-flow/config-eslint.
# Step 6 (2026-04-30): catalog 도입 — 6 dep 단일 버전 수렴.
packages:
  - 'apps/backend'
  - 'apps/frontend'
  - 'packages/*'

catalog:
  zod: ^4.3.6
  typescript: ^5.7.3
  vitest: ^2.1.9
  '@types/node': ^22.13.4
  tsup: ^8.3.5
  '@biomejs/biome': 1.9.4
```

---

## 3. package.json catalog: 치환 표

| 파일 | dep | type | before | after |
|------|-----|------|--------|-------|
| apps/backend/package.json | zod | dependencies | `^4.3.6` | `catalog:` |
| apps/backend/package.json | @types/node | devDependencies | `^22.10.0` | `catalog:` |
| apps/backend/package.json | typescript | devDependencies | `^5.7.2` | `catalog:` |
| apps/backend/package.json | vitest | devDependencies | `^2.1.8` | `catalog:` |
| apps/backend/package.json | tsup | devDependencies | `^8.3.5` | `catalog:` |
| apps/backend/package.json | @biomejs/biome | devDependencies | `1.9.4` | `catalog:` |
| apps/frontend/package.json | zod | dependencies | `^4.1.0` | `catalog:` |
| apps/frontend/package.json | @types/node | devDependencies | `^22.13.4` | `catalog:` |
| apps/frontend/package.json | typescript | devDependencies | `^5.7.3` | `catalog:` |
| apps/frontend/package.json | vitest | devDependencies | `^2.1.9` | `catalog:` |
| packages/shared/package.json | zod | devDependencies | `^4.3.6` | `catalog:` |
| packages/shared/package.json | typescript | devDependencies | `^5.7.2` | `catalog:` |
| packages/shared/package.json | vitest | devDependencies | `^2.1.9` | `catalog:` |
| packages/shared/package.json | tsup | devDependencies | `^8.3.5` | `catalog:` |
| packages/contracts/package.json | typescript | devDependencies | `^5.7.2` | `catalog:` |
| packages/contracts/package.json | tsup | devDependencies | `^8.3.5` | `catalog:` |
| package.json (root) | turbo | devDependencies | `^2.5.0` | (catalog 미포함, root only) |

**peerDependencies는 catalog 미적용**:

- shared/contracts/config-eslint의 zod / eslint / eslint-config-next peer는 그대로 caret 범위 유지 (consumer 그래프에서 결정).

---

## 4. BE 24 import 사이트 codemod

**변환 규칙**:

```
- ../shared/errors.js          → @all-flow/shared/errors
- ../../shared/errors.js       → @all-flow/shared/errors
```

**대상 파일** (24 sites):

```
src/plugins/auth.ts
src/plugins/error-handler.ts
src/plugins/error-handler.test.ts
src/plugins/rate-limit.ts                ← (§5와 동시)
src/plugins/rbac.ts
src/modules/ai/ai.routes.ts
src/modules/ai/ai-adapter.ts
src/modules/approvals/approvals.routes.ts
src/modules/auth/auth.routes.ts
src/modules/channels/channels.routes.ts
src/modules/clients/clients.routes.ts
src/modules/comments/comments.routes.ts
src/modules/docs/docs.routes.ts
src/modules/events/events.routes.ts
src/modules/identity/identity.routes.ts
src/modules/issues/issues.routes.ts
src/modules/notifications/notifications.routes.ts
src/modules/org/org.routes.ts
src/modules/projects/projects.routes.ts
src/modules/realtime/realtime.ws.ts
src/modules/reports/reports.routes.ts
src/modules/resources/resources.routes.ts
src/modules/search/search.routes.ts
src/modules/tasks/tasks.routes.ts
```

**미대상**: `src/shared/errors.ts` (re-export shim, 그대로 보존). 이미 `@all-flow/shared/errors`에서 re-export 중이므로 본 codemod의 범위 외.

---

## 5. rate-limit.ts diff (정확 명세)

```diff
- import { AppError } from '../shared/errors.js';
+ import { RateLimitError } from '@all-flow/shared/errors';

- class RateLimitError extends AppError {
-   constructor(retryAfterSec: number) {
-     super({
-       code: 'RATE_LIMITED',
-       message: `요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도하세요.`,
-       statusCode: 429,
-       details: { retryAfterSec },
-     });
-     this.name = 'RateLimitError';
-   }
- }
-

  // ... (호출 사이트)
-       throw new RateLimitError(retryAfterSec);
+       throw new RateLimitError(
+         `요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도하세요.`,
+         { retryAfterSec },
+       );
```

→ AppError import 제거, 로컬 class 12줄 제거, throw 1라인 변경. 결과 envelope 100% 동일.

---

## 6. 작업 순서 (회귀 안전 경로)

1. **shared 빌드 확인** — `@all-flow/shared/errors` 의 `RateLimitError` 가 dist에 있는지 검증 (`packages/shared/dist/errors/`)
2. **BE codemod (24 import 사이트)** — sed/edit로 일괄 치환
3. **rate-limit.ts §5 정합 변경**
4. **pnpm-workspace.yaml catalog: 추가**
5. **모든 package.json catalog: 치환** (§3 표대로)
6. **`pnpm install`** — lockfile 갱신 + dedup 확인
7. **G2~G5 자동 검증**: BE/FE/shared/contracts 게이트
8. **G6 Playwright** — dev 환경 가동 후
9. **G9/G10 grep 검증**

---

## 7. Acceptance Criteria

- G1~G7, G9, G10 모두 PASS
- match_rate ≥ 0.90
- BE 295/295 + biome 0 errors
- FE 71/71 + eslint 0 errors
- shared 45/45
- contracts typecheck/build OK
- Playwright ≥ 56/62
- `pnpm why zod` 단일 버전 (4.3.6)
- `pnpm why typescript` 단일 버전 (5.7.3)
- `pnpm why vitest` 단일 버전 (2.1.9)
- `pnpm why @types/node` 단일 버전 (22.13.4)
- `grep -rn "shared/errors" apps/backend/src | grep -v 'src/shared/errors.ts'` 결과 0 hits
- `grep -n "class RateLimitError" apps/backend/src/plugins/rate-limit.ts` 결과 0 hits

---

**End of Design**
