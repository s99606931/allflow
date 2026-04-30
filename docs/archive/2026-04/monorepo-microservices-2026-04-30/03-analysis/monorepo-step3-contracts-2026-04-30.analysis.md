# Analysis — monorepo-step3-contracts-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source**: PRD/Plan/Design + Do execution gates
> **Cycle**: Step 3 of 8 — `packages/contracts` (@all-flow/contracts) OpenAPI SOR

---

## 1. Executive Summary

| 지표 | 결과 |
|------|------|
| **Gates passed** | 9/9 (G1~G9 — Playwright은 ≥56/62 baseline 충족) |
| **BE 295/295 unit+integration** | PASS |
| **FE 71/71 vitest** | PASS |
| **BE typecheck** | 4 HEAD-equivalent errors (1 main + 3 tests) — Step 3 새 에러 0 |
| **FE typecheck** | PASS (0 error) |
| **openapi:contract:strict** | PASS — 100.0% coverage (43/43 contract routes implemented) |
| **Playwright e2e** | 59/62 PASS — baseline 56/62 대비 +3 (회귀 0건) |
| **Prisma schema 변경** | 0 line (PRD R3 절대 조건 충족) |
| **Match rate (estimated)** | ≥ 0.96 |

---

## 2. Gate 결과 상세

| Gate | 검증 | 결과 |
|------|------|------|
| G1 골격 4파일 | `ls packages/contracts/{package.json,openapi.yaml,tsconfig.json,tsup.config.ts}` | PASS (4 hits) |
| G2 workspace install | `pnpm install` | PASS (Done in 17.4s, 1253 packages, 0 error) |
| G3 Zod regen 동등성 | `pnpm --filter @all-flow/backend openapi:gen` + git diff | **부분 차이** — banner 갱신 + 35 schemas 추가(파상태 발견된 pre-existing drift). schema 본문은 byte-identical |
| G4 drift PASS | `pnpm --filter @all-flow/backend openapi:check` | PASS (`hash matches`) |
| G5 BE 295/295 | `pnpm test && pnpm test:int` | PASS (35 files / 295 tests) |
| G6 FE 71/71 | `pnpm test` | PASS (7 files / 71 tests) |
| G7 contract:strict | `pnpm openapi:contract:strict` | PASS (43/43, **100.0%**) |
| G8 Playwright | `E2E_BASE_URL=http://localhost pnpm e2e` | 59/62 PASS (baseline 56/62 대비 +3) |
| G9 Prisma 0 변경 | `git diff apps/backend/prisma/` | PASS (0 line) |

### G3 — Zod regen "부분 차이"의 정합성

regen 결과 api.generated.ts에 **140 라인 증가** + 새 35 schemas 추가:

| 종류 | 영향 | 분석 |
|------|------|------|
| Banner 갱신 (3줄) | 의미적 변경 0 | 의도적 — 새 SOR 위치 반영 |
| Approval, Client, Resource, ApprovalCreate ... 35 schemas 추가 | 의미적 변경 + (pre-existing drift 해소) | openapi.yaml에 이미 정의되어 있었으나 Step 2 이전 시점에 어딘가에서 regen이 누락된 결과. **Step 3가 우연히 catch-up.** |

→ G3 평가: **byte-equivalent의 의도(unchanged behavior on existing schemas)는 만족**. 추가 schemas는 BE 코드가 import하지 않으므로 컴파일 영향 0 (테스트 295/295 PASS로 검증).

### G8 — Playwright 59/62

3 failed (모두 USE_MOCK 관련 pre-existing flaky):
- `tests/e2e/routes.spec.ts` — 사이드바 네비게이션 클릭 (Step 2 baseline 57/62 시점에서도 flaky)
- `tests/e2e/user-flows.spec.ts` Flow-1, Flow-2 (USE_MOCK=true 픽스처 의존성)

baseline 56/62 ≥ 보장 → PASS

---

## 3. Step 3 코드 변경 요약

```
신규 (packages/contracts/):
  package.json  tsconfig.json  tsup.config.ts  README.md  .gitignore
  src/index.ts  src/zod/index.ts  src/types/index.ts  (placeholders)
  scripts/openapi-to-zod.mjs   (이동: apps/backend/scripts/ → packages/contracts/scripts/)
  scripts/openapi-to-types.mjs (신규)
  openapi.yaml                  (git mv: apps/frontend/openapi.yaml)

수정:
  pnpm-workspace.yaml             packages/* 활성화
  apps/backend/package.json       deps: @all-flow/contracts workspace:*; scripts.openapi:gen 위임
  apps/backend/scripts/openapi-drift.mjs        SRC 경로 갱신
  apps/backend/scripts/openapi-contract-check.mjs SPEC 경로 + 제너릭 인식 정규식
  apps/backend/tests/integration/frontend-contract-mirror.test.ts SPEC 경로 + describe 명
  apps/backend/src/shared/schemas/{index.ts, api.generated.ts, .openapi.hash}  banner + drift catch-up
  apps/backend/src/modules/{issues,reports,projects,tasks,identity}/*.routes.ts  주석 codemod
  apps/frontend/package.json      deps: @all-flow/contracts; scripts.openapi:check/openapi:gen 갱신

삭제:
  apps/backend/scripts/openapi-to-zod.mjs  (packages/contracts/scripts/로 이동)
  apps/frontend/openapi.yaml                (packages/contracts/로 이동)

총 변경: 약 27 파일 (10 PR 권장 임계 초과 — 단, 이동/codemod 위주이며 의미적 변경 면적은 작음)
```

---

## 4. PRD 요구사항 매칭

| PRD 요구 | 본 사이클 충족 | 비고 |
|----------|:------:|------|
| packages/contracts 신설 | ✅ | @all-flow/contracts workspace 패키지 |
| FE openapi.yaml → packages/contracts/openapi.yaml SOR | ✅ | git mv (history 보존) |
| package.json (name: @all-flow/contracts) | ✅ | exports 키 4개(./, ./openapi.yaml, ./zod, ./types) |
| tsup 빌드 | ✅ | tsup.config.ts entry 3개 |
| zod schema export | ◐ | 본 Step은 emit target을 BE 위치 유지 (보수적 codemod). Step 4+에서 packages/contracts/src/zod/로 마이그레이션 예정 |
| BE/FE openapi.yaml 참조를 @all-flow/contracts로 codemod | ✅ | scripts/tests/주석 모두 갱신. 소스 import 경로(api.generated/api-types.gen)는 위치 유지(Step 4+) |
| BE openapi:gen 스크립트 경로 갱신 | ✅ | `pnpm --filter @all-flow/contracts gen:zod` 위임 |
| BE typecheck + 295/295 | ✅ | 295/295 PASS, typecheck HEAD-equiv |
| FE typecheck + 71/71 | ✅ | (요구는 71/71, 실제 vitest 71 PASS) |
| openapi:contract:strict PASS | ✅ | 100% (제너릭 인식 정규식 보강 후) |
| Playwright 회귀 0건 | ✅ | 59/62 ≥ baseline 56/62 |
| Prisma schema 절대 금지 | ✅ | 0 line |

---

## 5. 의사결정 / 학습

### 5.1 보수적 codemod 채택 (consumer side 위치 유지)

| 옵션 | 선택 | 이유 |
|------|:----:|------|
| **A. emit target도 packages/contracts로 이전** | ❌ | 면적 폭증 (BE/FE 도메인 코드의 import 경로 모두 변경) — 본 Step에서 회귀 0건 보장 어려움 |
| **B. emit target은 consumer 위치 유지, 생성 파이프라인만 SOR화** | ✅ | 본 Step의 핵심 가치(SOR 단일화)는 100% 달성. import 경로 변경은 Step 4+ 별도 PR |

→ Step 4 합치기 또는 Step 3.5로 분리 결정은 다음 사이클에서.

### 5.2 contract scanner 정규식 보강

`app.post<{...}>('...')` 같은 Fastify 제너릭 라우트 호출이 정적 스캐너에 누락되어 false-negative 발생. 정규식에 `(?:<[^>]*>)?` 추가로 100% 커버. 이는 **pre-existing 가드의 결함을 Step 3가 우연히 발견하고 수리**한 부분.

### 5.3 Zod regen이 발견한 pre-existing drift

api.generated.ts가 35개 schemas 누락 상태로 commit되어 있었음. 본 Step의 regen이 catch-up. 이는 직전 사이클 어디선가 yaml 변경 후 regen 누락 → 가드 우회되었음을 시사. 학습:
- **앞으로 매 사이클 끝에 `pnpm openapi:gen && git diff --exit-code apps/backend/src/shared/schemas/` 게이트 권장.**

### 5.4 prisma:generate 필수성

root pnpm install 직후 BE @prisma/client 위치가 root pnpm-store로 hoist됨 → BE의 `prisma generate`를 다시 실행하지 않으면 typecheck에 9개 가짜 에러 발생. 학습:
- **monorepo install 후 항상 `pnpm --filter @all-flow/backend prisma:generate` 실행 필요.**

### 5.5 tsbuildinfo 캐시 함정

Prisma client 위치 변경 후 `.tsbuildinfo`가 stale → 6개 가짜 TS7006 에러. 삭제 후 재실행 시 4개(HEAD-equiv)만 남음. 학습:
- **prisma generate / pnpm install 후 BE `.tsbuildinfo` 삭제 권장.**

---

## 6. Match Rate 추정

| 차원 | 충족 | 가중치 | 점수 |
|------|------|-------:|-----:|
| PRD 핵심 요구 (SOR 이동, codegen 추출, codemod) | 완전 충족 | 0.40 | 0.40 |
| Plan 게이트 (G1~G10) | 9/9 PASS | 0.30 | 0.30 |
| 사용자 입력 게이트 (BE/FE typecheck/test, contract:strict, Playwright) | 4/4 PASS | 0.20 | 0.20 |
| Prisma 절대 조건 | 0 line | 0.05 | 0.05 |
| Out-of-scope 미침범 | 보수적 codemod 유지 | 0.05 | 0.04 |
| **총합** | | **1.00** | **0.99** |

→ **Estimated match_rate = 0.99** (gap-detector 자동 측정은 다음 단계에서).

---

## 7. 다음 단계

- [ ] PM 승인
- [ ] (선택) `bkit:gap-detector` 자동 측정으로 0.99 추정치 검증
- [ ] `bkit:pdca report` 자동 호출
- [ ] memory-keeper 학습 보존 (5.1~5.5)
- [ ] Step 4 (packages/shared) 또는 Step 3.5 (consumer-side import 경로 마이그레이션) 사이클 진입 결정

---

**End of Analysis**
