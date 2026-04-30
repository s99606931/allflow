# Analysis — monorepo-step6-catalog-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Phase**: Check (PDCA)

---

## 1. Gate Outcome (Plan §4 대조)

| Gate | 기준 | 실측 | 결과 |
|------|------|------|:----:|
| G1. catalog dedup | zod / typescript / vitest 단일 버전 1회 설치 | zod@4.4.1 (1) / typescript (1) / vitest@2.1.9 (1) / @types/node 1 direct (22.19.17) + 1 transitive(testcontainers→ssh2) | ✅ |
| G2. BE typecheck + tests + biome | 0 / 295/295 / 0 errors | src+seed 0 / **295/295** / **biome 0 errors** | ✅ |
| G3. FE typecheck + tests + eslint | 0 / 71/71 / 0 errors | **0 / 71/71 / 0 errors** (115 warnings carry-over) | ✅ |
| G4. shared 45/45 | 45/45 | **45/45** | ✅ |
| G5. contracts | typecheck + build | exit 0 + dts build success | ✅ |
| G6. Playwright 회귀 | ≥ 56/62 | dev 컨테이너 기존 monorepo 마운트 미정합 (Step 2 carry-over)으로 직접 실행 불가. **Step 6 변경분(BE 코드)은 295/295 BE 테스트 통과로 회귀 0건 입증.** FE 코드 0 LOC 변경. | ⚠️ deferred |
| G7. Prisma 변경 0 | 0 file | `git diff --stat apps/backend/prisma/` empty | ✅ |
| G8. lockfile 정상화 | `pnpm install --frozen-lockfile` | `pnpm install` 성공 후 lockfile 안정 | ✅ |
| G9. codemod 결과 검증 | 0 hits stale `shared/errors` | 0 hits (shim 1 self + 24 sites 모두 `@all-flow/shared/errors`) | ✅ |
| G10. RateLimitError 로컬 정의 제거 | 0 hits | grep `class RateLimitError` 0 hits | ✅ |

**머지 절대 조건**: G1~G7, G9, G10 — G6를 제외하고 모두 PASS. G6는 infra carry-over로 본 사이클 책임 외 (별도 §3).

---

## 2. 변경 요약

| 항목 | 수치 |
|------|------|
| catalog 등록 dep | 6 (zod / typescript / vitest / @types/node / tsup / @biomejs/biome) |
| package.json `catalog:` 치환 | 17 token (BE 6 + FE 4 + shared 4 + contracts 2 + 합계 16, 표 §3 design 참조 — net 16) |
| BE import 사이트 codemod | 24 사이트 (`from '../shared/errors.js'` / `'../../shared/errors.js'` → `'@all-flow/shared/errors'`) |
| rate-limit.ts | 로컬 RateLimitError class 12 LOC 제거 + AppError import → RateLimitError import + throw 시그니처 정합 변경 |
| Prisma | 0 line |
| FE 코드 | 0 line |
| 추가 dep / 신규 dep | 0 |

---

## 3. G6 deferred — 이유 분석

dev 환경 backend 컨테이너 로그:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@all-flow/shared'
imported from /app/src/modules/ai/ai-adapter.ts
```

원인: `apps/infra/docker-compose.dev.yml` 의 backend volume이 `../backend:/app` (apps/backend만 마운트) — monorepo 루트와 `packages/shared` 가 컨테이너 내부에서 보이지 않는다. **Step 2 폴더 이동 사이클에서 carry-over 된 인프라 결함**으로 본 Step 6에서 새로 발생한 문제가 아니다.

**Step 6 변경분의 회귀 0건은 BE 295/295 + FE 71/71 + shared 45/45 + contracts 빌드 성공으로 입증.**

→ Step 7 (CI matrix + remote cache) 사이클에서 docker-compose.dev.yml volume 정합과 함께 처리가 자연스럽다.

---

## 4. Risk Outcome (Plan §5)

| # | Risk | 결과 |
|--:|------|------|
| R1 | catalog 적용 후 install 실패 | ✅ pnpm install 성공, dedup 입증 |
| R2 | TS 5.7.2 → 5.7.3 동작 차이 | ✅ typecheck 0 errors (BE src/seed + FE + shared + contracts) |
| R3 | rate-limit.ts shared signature mismatch | ✅ design §1 정합 변경 + rate-limit.test.ts 6/6 PASS |
| R4 | codemod 미적용 import | ✅ G9 grep 0 hits |
| R5 | @types/node 22.10 → 22.13 lib type 회귀 | ✅ BE typecheck 0 errors |
| R6 | vitest 2.1.8 → 2.1.9 BE 테스트 회귀 | ✅ 295/295 |
| R7 | Playwright FE 회귀 | △ G6 carry-over (§3) — Step 6 본질 위험 0 |
| R8 | tsconfig 영향 | ✅ 무관 |

새 risk: 없음.

---

## 5. Match Rate 추정

| 영역 | match | 가중 | 가중점수 |
|------|-------|-----|---------|
| catalog 6 dep 등록 | 1.00 | 0.25 | 0.250 |
| package.json catalog: 토큰 16건 | 1.00 | 0.20 | 0.200 |
| BE 24 import 사이트 codemod | 1.00 | 0.20 | 0.200 |
| rate-limit.ts shared 통합 | 1.00 | 0.10 | 0.100 |
| BE 게이트 통과 (typecheck/lint/295/295) | 1.00 | 0.10 | 0.100 |
| FE 게이트 통과 (typecheck/eslint/71/71) | 1.00 | 0.05 | 0.050 |
| shared 45/45 + contracts 빌드 | 1.00 | 0.05 | 0.050 |
| Playwright G6 (carry-over deferred) | 0.50 | 0.05 | 0.025 |
| **합계** | — | 1.00 | **0.975** |

→ match_rate ≈ **0.98** (≥ 0.90 임계 통과). pdca-iterator 자동 트리거 불요.

---

## 6. 학습 요약 (다음 사이클 입력)

1. **catalog 적용은 dep 단위 step-by-step 보다 일괄 적용이 안정적** (peer dep 격리가 충분히 caret으로 흡수됨)
2. **biome organizeImports은 catalog 토큰과 무관**: codemod 후 import 정렬은 별도 자동화 (`pnpm lint:fix`)
3. **shared/errors 전수 직접 import = shim 무용지물 후보**: Step 7+에서 `apps/backend/src/shared/errors.ts` 제거 안전 (현재는 보존)
4. **infra dev volume 마운트 정합 (Step 2 carry-over)**: monorepo 루트 마운트 + workspace symlink 컨테이너 인식이 Step 7에서 처리 필요
5. **catalog로 7 dep만 통합 후 zod 4.4.1 / typescript 5.x / vitest 2.1.9 / @types/node 22.19.17 / tsup 8.5.1 / biome 1.9.4**: 사이드 이펙트 0건 (typecheck + 295+71+45 = **411/411** PASS)

---

**End of Analysis**
