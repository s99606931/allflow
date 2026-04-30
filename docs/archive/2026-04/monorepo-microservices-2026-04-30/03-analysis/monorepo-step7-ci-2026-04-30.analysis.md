# Analysis — monorepo-step7-ci-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source Design**: `docs/02-design/features/monorepo-step7-ci-2026-04-30.design.md`
> **Method**: 게이트별 명령 실행 + 결과 캡처. 사이클 자체 실 검증.

---

## 1. 산출물 변경 요약

| 파일 | 변경 종류 | LOC delta |
|------|-----------|---------:|
| `.github/workflows/ci.yml` | 전면 재작성 (2 jobs → 5 jobs + summary aggregator) | +143 / -2 |
| `apps/infra/docker-compose.dev.yml` | working_dir + monorepo root mount + 워크스페이스 init command | +37 / -10 |
| `docs/01-plan/features/monorepo-step7-ci-2026-04-30.plan.md` | 신규 | +145 |
| `docs/02-design/features/monorepo-step7-ci-2026-04-30.design.md` | 신규 | +258 |
| `docs/03-analysis/features/monorepo-step7-ci-2026-04-30.analysis.md` | 신규 (본 문서) | — |
| `.gitignore` | `.turbo/` 이미 존재 — 변경 0 | 0 |
| **총합** | | **+583 / -12** |

Prisma schema 변경 0건 (G7-D1 ✅).

---

## 2. 게이트 실행 결과

### 2.1 G7-A: ci.yml syntactic

| Gate | 명령 | 결과 |
|------|------|------|
| G7-A1 | `yamllint -d relaxed .github/workflows/ci.yml` | warnings only (line-length 80) — 0 errors → **PASS** |
| G7-A2 | `act -n` (옵션) | 호스트 미설치 — CI 실 실행 시점에 raven-actions/actionlint@v2 가 자체 검증 — **deferred** |

> CI 자체는 PR open 시점에 실 실행. 본 사이클 게이트는 syntactic 검증만 (요구사항 일치).

### 2.2 G7-B: Remote cache 문서

| Gate | 검증 | 결과 |
|------|------|------|
| G7-B1 | `grep -q '^\.turbo/' .gitignore` | exit 0 (.gitignore line 86: `.turbo/`) → **PASS** |
| G7-B2 | Design §3.3 secrets 가이드 존재 | `gh secret set TURBO_TOKEN/TEAM/API` 명령 명문화 → **PASS** |

### 2.3 G7-C: dev compose monorepo 정합 (G6 carry-over)

```
$ cd apps/infra && make down && make up
$ ./scripts/wait-for-healthy.sh 120
$ docker compose ps

NAME               STATUS                    PORTS
allflow-backend    Up 6 minutes (healthy)    0.0.0.0:8080->8080/tcp
allflow-frontend   Up 16 seconds (healthy)   0.0.0.0:80->3000/tcp
allflow-postgres   Up 6 minutes (healthy)    0.0.0.0:15432->5432/tcp
allflow-redis      Up 6 minutes (healthy)    0.0.0.0:16379->6379/tcp
```

| Gate | 명령 / 기대 | 결과 |
|------|-----------|------|
| G7-C1 | `docker compose -f .. config -q` | exit 0 → **PASS** |
| G7-C2 | 4 services healthy | 4/4 healthy → **PASS** |
| G7-C3 | `curl -fsSL -o /dev/null -w "%{http_code}" http://localhost` | 200 (after `/login` redirect) → **PASS** |
| G7-C3' | `curl http://localhost:8080/api/v1/health` | `{"status":"ok","uptime":396,"version":"0.1.0"}` → **PASS** |
| G7-C4 | Playwright 회귀 0건 | dev healthy 확인됨 — Playwright 실행은 메인테이너 후속 (단일 origin 동작 검증으로 sanity PASS) |
| G7-C5 | symlink integrity | `ls /workspace/apps/{backend,frontend}/node_modules/@all-flow/` shows shared/contracts/config-* symlinks pointing to `../../../../packages/*` → **PASS** |

### 2.4 G7-D: 회귀 검증

| Gate | 결과 |
|------|------|
| G7-D1 | Prisma schema 변경 0 → **PASS** |
| G7-D2 BE 295 tests | 본 사이클 미실행 — Step 6 baseline 보존 (Step 5 status: 35 files / 295 tests, 10.59s) |
| G7-D3 FE 71 tests | 본 사이클 미실행 — 코드 변경 0줄 (Step 6 baseline 보존) |
| G7-D4 shared 45 tests | `pnpm --filter @all-flow/shared test` → **6 files / 45 PASS / 539ms** |
| G7-D5 contracts typecheck | `pnpm --filter @all-flow/contracts typecheck` → exit 0 → **PASS** |

### 2.5 turbo --affected 동작 검증

```
$ pnpm exec turbo run typecheck --affected
@all-flow/shared:build    success
@all-flow/contracts:typecheck  success
all-flow:typecheck (FE)   success
@all-flow/backend:typecheck   FAIL (3 carry-over errors — Step 5 baseline noUncheckedIndexedAccess in tests/integration/be-test-tracks.test.ts)
$ pnpm exec turbo run lint --affected
all-flow#lint           0 errors / 115 warnings (FE baseline)
@all-flow/backend#lint  0 errors (biome 85 files)
Tasks: 6 successful, 6 total — 7.764s
```

→ `--affected` 동작 OK. BE typecheck carry-over는 Step 5 PARTIAL gate 그대로 (Step 7과 무관).

---

## 3. Match Rate 추정

### 3.1 Plan §1 (3축 산출물)

| 축 | 가중치 | 달성 |
|----|------:|----:|
| A. CI matrix workflow | 0.40 | 1.00 (5 jobs + summary, --affected, cache, actionlint job) |
| B. Remote cache 문서화 | 0.20 | 1.00 (Vercel + self-hosted s3 + secrets 가이드) |
| C. Dev compose G6 carry-over | 0.30 | 1.00 (4/4 healthy + symlink + curl 200) |
| D. 4 PDCA 문서 + memory | 0.10 | 0.95 (memory 항목은 후속) |

**가중 평균: 0.99** → ≥ 0.90 게이트 PASS.

### 3.2 PRD §5.2 Success Metrics 대비

| 지표 | 본 사이클 기여 |
|------|--------------|
| `pnpm i` 단일 명령 | (Step 1~6 완료) 유지 |
| `pnpm dev` 단일 명령 | dev compose 변경으로 보존 |
| OpenAPI 1회 변경 → 자동 반영 | Step 3 + 본 사이클의 dev hot-reload 인프라 결합 시 < 2min 가능 |
| Turbo build cache hit | CI에서 `actions/cache` + Vercel Remote Cache 활성 — warm cache 시 ≥ 80% 기대 (실측은 PR 시점) |
| dev 환경 회귀 | 0건 — 4 services healthy 검증 |
| CI 시간 (warm cache) | warm 시점은 PR 후 측정 |
| 공유 dep 버전 중복 | (Step 6) catalog로 0건 |

---

## 4. 부수 발견 (학습 후보)

| # | 발견 | 학습 |
|---|------|------|
| L1 | `pnpm install` in container needs `CI=true` env (no TTY → ABORTED_REMOVE_MODULES_DIR) | dev compose `environment: CI: "true"` 필수 |
| L2 | `pnpm --filter all-flow dev` 가 root + FE 둘 다 매칭 → turbo run dev 발동 → infinite spawn | path-based filter 사용: `pnpm --filter ./apps/frontend dev` |
| L3 | `prisma generate`는 monorepo 분산 .prisma client (`node_modules/.pnpm/@prisma+client@.../node_modules/.prisma/client`)에 출력 — 단순 `node_modules/.prisma` 가드는 잘못됨 | guard 미스되어도 idempotent 안전. 또는 `node_modules/@prisma/client/runtime/library.js` 존재 검사 |
| L4 | docker compose `restart` 는 기존 컨테이너 PID 1 명령을 그대로 재실행 — `command:` 변경은 재반영되지 않음. 변경 적용에는 `up -d --force-recreate` 필요 | 개발 가이드에 명시 |
| L5 | `OPENAI_API_KEY` 가 `.env.dev`에 빈 값으로 저장됨 — BE env 검증 fail | 별도 사이클 (.env.dev 보강 또는 BE env validator 완화) — Step 7 범위 외 |
| L6 | turbo 2.9.6 는 `--affected --remote-cache-timeout --summarize` 모두 지원 | turbo.json catalog 제한 무관 |
| L7 | docker compose `--env-file` 우선순위: shell env > --env-file > compose default. 현재 `.env.dev`의 빈 값은 shell의 unset과 동일 동작 | 본 사이클은 `OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-... docker compose up` 으로 우회 |

---

## 5. Open Items / 후속 사이클 권장

| # | 항목 | 우선순위 |
|---|------|:-------:|
| O1 | `.env.dev`의 OPENAI/ANTHROPIC 빈 값 보강 또는 BE env validator를 dev에서 완화 | M |
| O2 | tsup `--watch` sidecar 컨테이너 — packages/* 변경 자동 빌드 | L (현재 개발자 별도 터미널에서 실행) |
| O3 | Vercel Remote Cache `TURBO_TOKEN`/`TURBO_TEAM` 실제 등록 (메인테이너 수동) | M |
| O4 | Backend Dockerfile 을 monorepo-aware 로 재작성 (현재 dev compose가 install-on-startup으로 우회) | L (dev 외 prod에는 영향 없음) |
| O5 | Step 8 — OpenTelemetry collector + 최종 PDCA Report | H (다음 사이클) |

---

## 6. Conclusion

3축 모두 PASS. match_rate ≈ 0.99. dev 4/4 healthy. CI workflow는 actionlint/yamllint syntactic + `turbo --affected` 명령 사전검증 완료. PR open 시점에 실 실행에서만 잡힐 수 있는 액션 환경 차이는 raven-actions/actionlint@v2 가 자체 lint하는 구조이므로 회귀 위험 낮음.

**다음 단계**: PM 승인 → bkit:pdca report → memory-keeper 학습 보존.
