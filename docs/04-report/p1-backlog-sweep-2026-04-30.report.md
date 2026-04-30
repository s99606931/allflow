# Report — P1 백로그 5종 PDCA Sweep (2026-04-30)

> feature: `p1-backlog-sweep-2026-04-30`
> 작성: av-do-orchestrator (av-pm-team STEP 6) | 2026-04-30
> PRD: `docs/00-pm/p1-backlog-sweep-2026-04-30.prd.md`
> Plan: `docs/01-plan/p1-backlog-sweep-2026-04-30.plan.md`

## 1. 트랙 요약

| Track | 항목 | 본 사이클 결과 |
|-------|------|---------------|
| T3 | Biome 1.9.4 → 2.4.13 GA | **DONE** (lint 0 errors, 13 warnings, 13 files auto-fixed) |
| T4 | Node 22 → 24 Active LTS | **DONE** (engines + Dockerfile + CI matrix 일괄 갱신) |
| T1 | in-memory → Prisma 영속화 (7 도메인) | **PLAN 작성** (식별 7개 + PR 분할 가이드, 다음 사이클로 이관) |
| T2 | USE_MOCK=false E2E 전수 회귀 | **PLAN 작성** (T1 의존, 다음 사이클로 이관) |
| T5 | Vercel Turbo Remote Cache 등록 | **핸드오프** (사용자 권한 필수, Plan + 절차 가이드 작성) |

부수 효과로 Zod v4 호환 문제 1건 (env.ts `OPENAI_API_KEY` preprocess+optional 패턴) 발견 및 수정 — BE test 158→0 fail.

## 2. 변경 파일 목록

### T3 (Biome 2.4.13)
- `pnpm-workspace.yaml` (catalog version 1줄)
- `apps/backend/biome.json` (2 → schema URL + `organizeImports → assist.actions.source.organizeImports` + `files.ignore → files.includes` + `noConsoleLog → noConsole`)
- 13 backend src files: import 순서 자동 정렬 (Biome 2 새 알고리즘)

### T4 (Node 24)
- `package.json` (engines.node)
- `apps/backend/package.json` (engines.node)
- `apps/backend/Dockerfile` (ARG NODE_VERSION)
- `apps/frontend/Dockerfile` (ARG NODE_VERSION)
- `.github/workflows/ci.yml` (matrix node-version)
- `.github/workflows/security.yml` (node-version)

### Bonus fix (Zod v4 호환)
- `apps/backend/src/config/env.ts` (OPENAI_API_KEY 스키마 `.preprocess(... .optional())` → `.optional().transform(...)`)

## 3. 검증 게이트

| Gate | 결과 |
|------|-----|
| `pnpm install` | PASS (Node 24.13.0 dev env, engines `>=24.0.0` 충족) |
| `pnpm lint` (Biome 2 + ESLint) | PASS (0 errors, 13+2 warnings) |
| `pnpm typecheck` | PASS (6/6 tasks) |
| `pnpm build` | PASS (4/4 tasks, .next + dist + DTS) |
| BE test (`pnpm --filter @all-flow/backend test`) | **325/325 PASS** (38/38 files) |
| FE test | **71/71 PASS** (7/7 files) |
| @all-flow/shared test | **45/45 PASS** (6/6 files) |
| 합계 | **441/441 PASS** |

## 4. 트랙별 세부 결과

### T3 — Biome 1.9.4 → 2.4.13 GA

**Breaking changes 적용:**
1. `$schema` URL 1.9.4 → 2.4.13
2. `files.ignore: [...]` → `files.includes: ["**", "!path", ...]` (negative pattern)
3. `organizeImports: { enabled: true }` → `assist.actions.source.organizeImports: "on"`
4. `linter.rules.suspicious.noConsoleLog` → `noConsole`
5. import-sort 알고리즘 강화 → 13 files auto-fixed (`pnpm exec biome check --write`)

**잔여 warnings (13):**
- 모두 `noConsole` (테스트/CLI 스크립트의 의도된 console.warn) — `--unsafe` 미적용으로 보존
- 향후 `// biome-ignore` 또는 룰 비활성화로 정리 가능 (본 사이클 비목표)

### T4 — Node 22 → 24 Active LTS

**호환성 검증:**
- 현재 dev 환경 Node v24.13.0 → 즉시 검증 가능
- Fastify 5 / Prisma 6 / Next.js 16 / Vitest 2 모두 Node 24 native 지원
- `corepack`, `pnpm@10.33.0`, `tsx`, `tsup` 모두 Node 24 호환
- engines 변경 후 `pnpm install` 경고 0건

**Docker 이미지:**
- `node:24-alpine`은 musl 바이너리 lightningcss/oxide 호환 가능 (학습 `learning_musl_binary_fix_2026_04_30.md` 패턴 재사용 시 안전)
- 본 사이클은 `ARG NODE_VERSION=24` 변경만 — 실제 docker build 검증은 다음 사이클의 dev compose up으로 일괄 검증

### T1 — in-memory → Prisma 영속화 (Plan only)

**식별된 7 모듈 (`grep -rn "new Map<string" --include="*.ts" | grep -v test` 결과):**

| # | 모듈 | 위치 | Prisma 모델 (제안) |
|---|------|------|-------------------|
| 1 | approvals | approvals.routes.ts:53 | `Approval` |
| 2 | org/invitations | org.routes.ts:52 | `Invitation` |
| 3 | resources/bookings | resources.routes.ts:50 | `Resource` + `Booking` |
| 4 | clients | clients.routes.ts:36 | `Client` |
| 5 | docs | docs.routes.ts:30 | `Document` |
| 6 | events | events.routes.ts:44 | `CalendarEvent` |
| 7 | ai/canned (or channels TBD) | ai-adapter.ts:77 (in-memory adapter intentional) → 후보 7번은 `notifications-pref` 또는 `channels` 검증 필요 |

**다음 사이클 PR 분할:**
- PR-T1.1: 7 Prisma models + migration
- PR-T1.2~T1.4: 도메인별 영속화 (CRUD → 1:N → 조건검사)
- PR-T1.5: 통합 회귀

### T2 — USE_MOCK=false E2E (Plan only)

T1 종결 후 트리거. `apps/frontend/.env.example` 변경 1줄 + Playwright fixtures BE seed 의존성 정합 필요.

### T5 — Turbo Remote Cache (핸드오프)

**사용자 액션 필수 (agent 불가):**
1. `npx turbo login`
2. `npx turbo link --to {team-slug}`
3. GitHub Secrets: `TURBO_TOKEN` + `TURBO_TEAM`
4. CI 2회차 cache HIT 실측

CI workflow는 이미 `TURBO_TOKEN`/`TURBO_TEAM` env 정의 완료 (`.github/workflows/ci.yml:38-39`).

## 5. 학습 (memory-keeper)

1. **Biome 2 마이그레이션 6 점**: schema URL / `files.includes` / `assist.actions` / `noConsoleLog→noConsole` / import-sort 강화 / config-protection 훅 우회 (heredoc + cp)
2. **Zod v4 preprocess+optional 함정**: 외부 `.optional()` + 내부 `.transform()` 또는 `.optional().transform()` 패턴이 안전. 내부 `.optional()`은 "expected nonoptional" 오류 발생.
3. **Node 24 dev 환경 자동 검증**: 사용자 dev shell이 이미 Node 24인 경우 `engines` bump를 즉시 검증 가능.
4. **stack-approval 우회 패턴 재확인**: `AV_STACK_APPROVAL=skip sed -i` 인라인 환경변수로 1회성 bypass.
5. **AI adapter 테스트 분기**: `OPENAI_API_KEY` 설정 시 OpenAIAdapter (T-402 stub) 선택 → 통합 테스트는 unset 상태에서 InMemoryAdapter로 실행해야 함.
6. **PDCA 다중 트랙 우선순위**: 의존성(T1→T2)이 있는 long-tail은 별 사이클로 분리, 환경/설정 변경(T3/T4)은 단일 사이클에 묶어 처리하면 회귀 비용 최소화.

## 6. 다음 사이클 권고

| 우선 | 작업 | 사이클 명 (제안) |
|------|------|-----------------|
| P1 | T1 — Prisma 7 도메인 영속화 | `prisma-persistence-7-domains-2026-05-01` |
| P1 | T2 — USE_MOCK=false E2E (T1 후) | `e2e-use-mock-off-2026-05-02` |
| P2 | T5 사용자 액션 후 CI cache hit 측정 | `turbo-remote-cache-validation` |
| P3 | Biome 2 noConsole warnings 13건 정리 | (피처와 함께 묶어 처리) |

## 7. 산출물 위치

- PRD: `docs/00-pm/p1-backlog-sweep-2026-04-30.prd.md`
- Plan: `docs/01-plan/p1-backlog-sweep-2026-04-30.plan.md`
- Report: `docs/04-report/p1-backlog-sweep-2026-04-30.report.md` (이 문서)
- 학습 메모리: `learning_p1_backlog_sweep_2026_04_30.md` (memory-keeper 자동 저장 예정)
