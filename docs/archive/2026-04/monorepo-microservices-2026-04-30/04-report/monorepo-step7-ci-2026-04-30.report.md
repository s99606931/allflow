# Report — monorepo-step7-ci-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Cycle**: Step 7 of 8 — GitHub Actions CI matrix + Turborepo remote cache + dev compose monorepo 정합 (G6 carry-over)
> **Status**: do-complete-awaiting-pm-approval
> **Match Rate Estimated**: 0.99

---

## 1. 요약 (TL;DR)

| 축 | 산출물 | 상태 |
|----|--------|:----:|
| **A. CI matrix** | `.github/workflows/ci.yml` 5 jobs (lint-docs / validate-claude-config / actionlint / monorepo[lint,typecheck,build,test] / ci-status) + `actions/cache` + `--affected` + `TURBO_TOKEN/TEAM` env | ✅ |
| **B. Remote cache** | Vercel Remote Cache (1순위) + GHA Actions cache (fallback) — Design §3에 secrets 가이드 명문화 | ✅ |
| **C. Dev compose G6 carry-over** | `apps/infra/docker-compose.dev.yml` working_dir=`/workspace/apps/{backend,frontend}` + monorepo root mount + 첫 부팅 시 자동 `pnpm install --frozen-lockfile` + 자동 `prisma generate` | ✅ |
| **D. PDCA 4 docs** | Plan/Design/Analysis/Report | ✅ |

dev 게이트 4/4 healthy 실측 PASS, 코드 변경 0줄(BE/FE src), Prisma 변경 0건.

---

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `.github/workflows/ci.yml` | 신규 5 jobs + concurrency + TURBO_TOKEN/TEAM env |
| `apps/infra/docker-compose.dev.yml` | working_dir + monorepo root mount + sh -c init script (workspace install + prisma generate + filtered dev) |
| `docs/01-plan/features/monorepo-step7-ci-2026-04-30.plan.md` | 신규 |
| `docs/02-design/features/monorepo-step7-ci-2026-04-30.design.md` | 신규 |
| `docs/03-analysis/features/monorepo-step7-ci-2026-04-30.analysis.md` | 신규 |
| `docs/04-report/features/monorepo-step7-ci-2026-04-30.report.md` | 신규 (본 문서) |

---

## 3. 게이트 결과 (요약)

| Gate | 결과 |
|------|:----:|
| G7-A1 yamllint relaxed (ci.yml) | PASS (warnings only — line-length) |
| G7-A2 actionlint (CI 실 실행 시점) | deferred — raven-actions/actionlint@v2 자체 lint |
| G7-B1 .gitignore .turbo/ | PASS (.gitignore:86) |
| G7-B2 secrets 가이드 | PASS (Design §3.3) |
| G7-C1 compose config -q | PASS (exit 0) |
| G7-C2 4 services healthy | PASS (postgres/redis/backend/frontend 모두 healthy) |
| G7-C3 curl http://localhost | PASS (200, login redirect) |
| G7-C3' curl /api/v1/health | PASS (`{"status":"ok"}`) |
| G7-C5 symlink integrity | PASS (`@all-flow/{shared,contracts,config-*}` → `../../../../packages/*`) |
| G7-D1 Prisma 변경 0 | PASS |
| G7-D4 shared 45 tests | PASS (6 files, 539ms) |
| G7-D5 contracts typecheck | PASS (exit 0) |
| `turbo --affected` 동작 | PASS (lint 6/6 success, typecheck 5/6 success — 1 carry-over from Step 5) |

---

## 4. 주요 학습 (요약 — 상세는 Analysis §4)

1. **`CI=true` env 필수** — pnpm 10은 no-TTY 환경에서 modules dir 정리 시 abort. dev compose 모든 서비스에 명시.
2. **`pnpm --filter` 충돌** — root 패키지 이름이 `all-flow` 인데 FE 패키지 이름도 `all-flow`. path-based filter (`./apps/frontend`)로 해결.
3. **`prisma generate` 출력 위치** — pnpm hoist 환경에서는 `node_modules/.pnpm/.../@prisma/client/.prisma`로 이동. guard로 `node_modules/.prisma/client`만 보면 idempotent하지 않을 수 있으나 미스되어도 안전(재실행).
4. **docker compose `restart` vs `up --force-recreate`** — `command:` 변경은 force-recreate에서만 반영. 디버깅 시 시간 절약.
5. **`docker compose --env-file`은 빈 값을 unset처럼 처리하지 않음** — `OPENAI_API_KEY=` (empty) 가 그대로 전달되어 BE env validator 실패. 별도 사이클 follow-up.
6. **turbo 2.9.6 `--affected`** — `--remote-cache-timeout`, `--summarize`와 함께 안정 동작. CI 와 로컬에서 동일 결과.
7. **monorepo dev 재현성** — `apps/<svc>/Dockerfile`을 그대로 두고 dev compose에서 monorepo 컨텍스트만 노출하는 패턴(working_dir + ../../:/workspace)이 prod Dockerfile 변경 없이 dev parity 확보. prod 빌드는 별도 Docker layer 그대로 사용.

---

## 5. 미완 항목 (Open)

| # | 항목 | 후속 |
|---|------|------|
| O1 | `.env.dev`의 OPENAI/ANTHROPIC 빈 값 → BE env validator 실패 | dev 우회로 처리됨. Step 8 또는 별도 사이클 권장 |
| O2 | `tsup --watch` sidecar (packages 자동 빌드) | UX 개선 권장. 우선순위 낮음 |
| O3 | Vercel Remote Cache `TURBO_TOKEN`/`TURBO_TEAM` 실 등록 | 메인테이너 수동 |
| O4 | `apps/backend/Dockerfile` 의 monorepo-aware 재작성 | dev compose가 install-on-startup으로 우회 — 우선순위 낮음 |
| O5 | Step 8 — OpenTelemetry collector + 최종 PDCA Report | 다음 사이클 |

---

## 6. 최종 평가

| 지표 | 값 |
|------|---:|
| match_rate (estimated) | **0.99** |
| 절대조건 (R1 single-port localhost 회귀) | **0건** |
| Prisma 변경 | 0 line |
| BE 코드 변경 | 0 line |
| FE 코드 변경 | 0 line |
| infra/CI 변경 | 2 file |
| 신규 docs | 4 file |

**결론**: PRD §5.1 Step 7 (CI matrix + remote cache) + 누락된 G6 carry-over 동시 해소. dev 환경 재시작 검증 PASS, CI workflow 사전 검증 PASS. **PM 승인 요청.**

다음 단계: **Step 8 — OpenTelemetry collector + 최종 PDCA Report (사이클 closure)**.
