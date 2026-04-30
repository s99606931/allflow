# Plan — monorepo-step4-shared-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md` (Step 4)
> **Cycle Scope**: **Step 4 only** — `packages/shared` 신설 + isomorphic 유틸 추출 + 1~2개 dogfood codemod
> **Absolute Constraints**: Prisma schema 절대 미수정 / single-port localhost 회귀 0건 / Playwright 56/62 baseline 유지 / Node-only·Browser-only 코드 절대 금지

---

## 1. Cycle Scope (PRD §5.1)

| Step | 이번 사이클 | 사유 |
|------|:-----------:|------|
| Step 1 root scaffolding | ✅ done | Step 1 cycle |
| Step 2 apps/ folder move | ✅ done | Step 2 cycle |
| Step 3 packages/contracts | ✅ done | Step 3 cycle |
| **Step 4 packages/shared** | ✅ **본 사이클** | envelope/errors/ID/zod helper/env getter/log redaction 추출 |
| Step 4.5 대량 codemod | ❌ next | 본 사이클은 dogfood 1~2 호출처만 |
| Step 5 packages/config-* | ❌ later | preset 추출 |
| Step 6 catalog | ❌ later | zod/types/typescript 단일화 |
| Step 7 GHA cache | ❌ later | CI 시간 측정 |
| Step 8 OTel | ❌ later | Phase 2 트리거 |

---

## 2. Step 4 산출물

```
/data/allflow/
├── pnpm-workspace.yaml                          (이미 packages/* 글로브 — 변경 없음)
├── packages/
│   └── shared/                                  (NEW)
│       ├── package.json                         name: @all-flow/shared, sideEffects: false
│       ├── tsconfig.json
│       ├── tsup.config.ts                       esm + dts (treeshake on)
│       ├── README.md                            isomorphic 정책 / 사용법
│       ├── src/
│       │   ├── index.ts                         barrel
│       │   ├── errors/
│       │   │   ├── index.ts
│       │   │   ├── app-error.ts                 AppError + ErrorResponse 타입
│       │   │   └── http-errors.ts               Auth/Forbidden/NotFound/Conflict/Validation/RateLimit
│       │   ├── pagination/
│       │   │   ├── index.ts
│       │   │   ├── cursor.ts                    CursorPagination<T>, CursorPageInput
│       │   │   └── offset.ts                    OffsetPagination<T>, OffsetPageInput
│       │   ├── env/
│       │   │   ├── index.ts
│       │   │   └── safe-getter.ts               getEnvVar(source, key, schema) - zod 검증
│       │   ├── redact/
│       │   │   ├── index.ts
│       │   │   └── deep-redact.ts               redactSecrets(obj, keys)
│       │   ├── zod/
│       │   │   ├── index.ts
│       │   │   └── helpers.ts                   parseOrThrow, safeParseOr
│       │   └── date/
│       │       ├── index.ts
│       │       └── iso.ts                       toIsoString, isIsoString, parseIso
│       └── tests/
│           └── (vitest, isomorphic 검증)
├── apps/backend/
│   ├── package.json                             (EDIT) deps: "@all-flow/shared": "workspace:*"
│   └── src/shared/errors.ts                     (EDIT) re-export from @all-flow/shared (shim)
└── apps/frontend/
    ├── package.json                             (EDIT) deps: "@all-flow/shared": "workspace:*"
    └── src/lib/api-error.ts                     (EDIT) ErrorResponse 타입 재사용
```

---

## 3. isomorphic 가드 (절대 조건)

**금지** (build 실패 또는 런타임 시 즉시 fail):

| 카테고리 | 차단 대상 |
|---------|----------|
| Node-only | `node:fs`, `node:path`, `node:os`, `node:crypto` (Web Crypto만 OK), `process.cwd`, `Buffer` |
| Browser-only | `window`, `document`, `navigator`, `localStorage`, `sessionStorage` |
| 외부 통합 | `@prisma/client`, `prisma`, `fastify`, `next`, `react` |

**허용** (isomorphic):
- `globalThis`
- `Date`, `Math`, `JSON`, `URL`, `URLSearchParams`
- `Promise`, `AbortController`
- `Web Crypto` (`globalThis.crypto.subtle`) — 단, 본 사이클 사용 X
- `zod` (peer dep)
- `process.env` 읽기는 **호출자가 source 객체로 주입** (직접 접근 X)

검증 방법: `package.json` exports + tsup `external` 미설정 → import 시점에 fail-fast.

---

## 4. 추출 정책 (PRD §2.1)

### 4.1 errors

- BE `apps/backend/src/shared/errors.ts` 가 SOR. 그 내용을 `packages/shared/src/errors/`로 이동.
- BE 기존 파일은 **re-export shim**으로 유지 (Step 4.5 codemod 전까지 import 경로 변경 0).
- FE `apps/frontend/src/lib/api-error.ts` 의 `ApiError`(클라이언트 측 normalized error)는 별도 — **본 사이클 미이전**. `ErrorResponse` 타입만 공유.

### 4.2 pagination

- 현재 BE/FE 어디에도 통일된 pagination 타입 없음. zod 4 + cursor + offset 두 패턴 제공.
- 사용처는 추후 codemod (Step 4.5+).

### 4.3 env (safe getter)

- BE `apps/backend/src/config/env.ts` 의 패턴(zod 검증 + cache + 한국어 에러)을 **isomorphic 헬퍼**로 일반화.
- BE `loadEnv` 자체 이동은 **금지** (NODE_ENVS/PORT 같은 BE 도메인 스키마는 BE 책임).
- 본 사이클 산출물: `getEnvVar<T>(source, key, schema)` — schema 1개에 대한 검증.

### 4.4 redact (log redaction)

- 흔한 시크릿 키(`password`, `token`, `authorization`, `apikey`, `secret`, `cookie` etc.)를 deep-walk 후 `[REDACTED]`로 마스킹.
- pino redact와 별개의 일반화 helper. 로그 직렬화 전에 호출.

### 4.5 zod

- `parseOrThrow(schema, value)` — 실패 시 `ValidationError` (shared errors) 던짐.
- `safeParseOr(schema, value, fallback)` — 실패 시 fallback.

### 4.6 date

- `toIsoString(d: Date | number | string): string`
- `isIsoString(s: string): boolean`
- `parseIso(s: string): Date | null`

### 4.7 미포함 (사용자 요구사항 명시)

| 후보 | 제외 이유 |
|------|---------|
| Prisma 관련 helper | Node-only |
| fs / path 유틸 | Node-only |
| DOM utils, hooks | Browser-only |
| API client (ky/fetch wrapper) | FE는 ky, BE는 undici/fetch 환경 차이 — 본 사이클 X |
| ID generator (ulid/uuid) | crypto.randomUUID는 OK이나 BE/FE 합의된 형식 미정 — 다음 사이클 |

---

## 5. dogfood 범위 (PRD 요구: 1~2개 호출처)

### 5.1 BE

- `apps/backend/src/shared/errors.ts` → `@all-flow/shared/errors`로 re-export
- 기존 import (`from '../shared/errors'`) 100% 유지 → import 경로 변경 0
- 효과: 단일 SOR, 향후 codemod로 직접 import 전환 용이

### 5.2 FE

- `apps/frontend/src/lib/api-error.ts` 상단에서 `ErrorResponse` 타입을 `@all-flow/shared`에서 import
- 본 사이클은 BE 응답 envelope 타입 일관성 확보가 목표 (FE의 normalized `ApiError`는 그대로)

---

## 6. tsup dual-build

```ts
// packages/shared/tsup.config.ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: [
    'src/index.ts',
    'src/errors/index.ts',
    'src/pagination/index.ts',
    'src/env/index.ts',
    'src/redact/index.ts',
    'src/zod/index.ts',
    'src/date/index.ts',
  ],
  outDir: 'dist',
  format: ['esm'],
  target: 'es2022',
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  sourcemap: false,
  external: ['zod'],
});
```

`package.json` 핵심:

```json
{
  "name": "@all-flow/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./errors": { "types": "./dist/errors/index.d.ts", "import": "./dist/errors/index.js" },
    "./pagination": { "types": "./dist/pagination/index.d.ts", "import": "./dist/pagination/index.js" },
    "./env": { "types": "./dist/env/index.d.ts", "import": "./dist/env/index.js" },
    "./redact": { "types": "./dist/redact/index.d.ts", "import": "./dist/redact/index.js" },
    "./zod": { "types": "./dist/zod/index.d.ts", "import": "./dist/zod/index.js" },
    "./date": { "types": "./dist/date/index.d.ts", "import": "./dist/date/index.js" }
  },
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "echo '(no lint configured for shared yet)'"
  },
  "devDependencies": { "tsup": "^8.3.5", "typescript": "^5.7.2", "vitest": "^2.1.9" },
  "peerDependencies": { "zod": "^4.0.0" }
}
```

---

## 7. 게이트 (머지 절대 조건)

| Gate | 측정 |
|------|------|
| BE unit + integration | 295/295 (현재 187+38=...) — 직전 사이클 baseline 유지 |
| FE vitest | 71/71 — 직전 사이클 baseline 유지 |
| Playwright e2e | 56/62 — single-port baseline 유지 |
| Tree-shaking | BE/FE prod build 사이즈 비교 — 추가 증가 ≤ 5KB (gzipped) |
| typecheck | turbo run typecheck 0 error |
| lint | turbo run lint 0 error |
| Prisma schema | 변경 0줄 |
| isomorphic 가드 | grep 검증 — `node:`, `window`, `document`, `prisma`, `react`, `next` 0 hit in `packages/shared/src` |

---

## 8. Risks & Mitigations

| # | Risk | Mitigation |
|--:|------|-----------|
| R1 | Node API 우발 사용 | tsup external 명시 + grep 검증 + CI에서 import-time fail-fast |
| R2 | zod 버전 catalog 미적용 충돌 | peerDependency `zod ^4.0.0` + workspace dedupe + Step 6에서 catalog 통합 |
| R3 | re-export shim이 Tree-shake 차단 | 단일 named re-export만 사용 (`export *`만 — 기본 X) |
| R4 | dogfood 코덱이 BE 38 integration test 깨뜨림 | shim 우선, 직접 import 전환은 Step 4.5로 분리 |
| R5 | tsup external 누락 시 zod가 두 번 번들됨 | external: ['zod'] 명시 + dist 검증 |

---

## 9. 실행 순서 (순차 + 일부 병렬)

```
S4.1 Plan/Design (이 문서 + design.md)        ← in_progress
S4.2 packages/shared 스켈레톤 + tsup
S4.3 [parallel A,B,C,D,E,F]
       A errors      D redact
       B pagination  E zod
       C env         F date
S4.4 BE dogfood codemod (errors shim)
S4.5 FE dogfood codemod (ErrorResponse import)
S4.6 게이트 측정 (turbo build/test/typecheck + Playwright)
S4.7 Analysis + Report + Memory
```

---

## 10. Out of Scope

- ID 생성기 (ulid/uuid) — 다음 사이클
- API client wrapper — 다음 사이클
- BE `loadEnv` 자체 이동 — 도메인 스키마라 BE 잔류
- 대량 import 경로 변경 — Step 4.5/Step 5
- catalog 적용 — Step 6
- packages/config-eslint, config-tsconfig — Step 5

---

**End of Plan** — 다음 액션: design.md 작성 후 S4.2 스켈레톤 구현
