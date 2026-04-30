# Plan — monorepo-step2-folder-move-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source PRD**: `docs/00-pm/monorepo-microservices-2026-04-30.prd.md` (Step 2 절 + R1 Critical)
> **Cycle Scope**: **Step 2 — git mv project/all-flow-{backend,frontend,infra} → apps/{backend,frontend,infra}**
> **Prev cycle**: Step 1 (root scaffolding) — match_rate 0.9625, gates G1~G4/G7/G8 PASS

---

## 1. 본 사이클 절대 조건 (사용자 직접 지시)

| # | 조건 | 검증 방법 |
|---|------|----------|
| C1 | Playwright `user-flows.spec.ts` 회귀 ≤ baseline (직전 56/62) | `pnpm e2e` 실행 결과 비교 |
| C2 | `curl http://localhost` 200 OK | dev compose up 후 |
| C3 | `docker compose up dev` 4 서비스 healthy | `docker compose ps` |
| C4 | Prisma schema 변경 0건 | `git diff schema.prisma` empty |
| C5 | single-port localhost 정합 유지 | dev/prod compose env 변경 0건 |
| C6 | 게이트 실패 시 즉시 `git reset --hard` (사용자 확인 없이) | rollback baseline = 본 사이클 시작 직전 commit |

**rollback 대상 commit**: 본 사이클 baseline commit (Step 1 미커밋 자산을 먼저 commit하여 확보).

---

## 2. 작업 범위

### 2.1 폴더 이동 (3개)

```
git mv project/all-flow-backend  apps/backend
git mv project/all-flow-frontend apps/frontend
git mv project/all-flow-infra    apps/infra
rmdir project   # (빈 디렉토리 정리)
```

### 2.2 경로 갱신 — 6 파일 수정

| 파일 | 변경 |
|------|------|
| `pnpm-workspace.yaml` | `project/all-flow-backend` → `apps/backend`, `project/all-flow-frontend` → `apps/frontend` (인용/주석도 동기화) |
| `apps/infra/docker-compose.dev.yml` | build context/volumes: `../all-flow-backend` → `../backend`, `../all-flow-frontend` → `../frontend` |
| `apps/infra/docker-compose.prod.yml` | build context: `../all-flow-backend` → `../backend`, `../all-flow-frontend` → `../frontend` |
| `.claude/agents/av-base-browser-tester.md` | `project/all-flow-frontend` → `apps/frontend` (5곳) |
| `apps/backend/prisma/seed.ts` | 주석 1줄 (`project/all-flow-frontend/...` → `apps/frontend/...`) |
| `apps/backend/tests/integration/frontend-contract-mirror.test.ts` | 주석 1줄 (`project/all-flow-frontend/openapi.yaml` → `apps/frontend/openapi.yaml`) |

### 2.3 변경 절대 금지 (불변 영역)

| 영역 | 이유 |
|------|------|
| `apps/backend/prisma/schema.prisma` | C4 — Prisma 변경 0건 |
| `apps/infra/docker-compose.yml` (base) | path 참조 0건 (이미 무관) |
| dev/prod compose의 env 섹션 | C5 — single-port 정합 |
| 모든 `src/**` 코드 | 이번 사이클은 path 외 코드 변경 0건 |
| BE/FE `pnpm-lock.yaml` | 본 사이클은 root install 미실행 (Step 3에서 통합) |
| `docs/archive/**` | 과거 산출물 보존 |

---

## 3. 게이트 매트릭스 (R1 Critical 강제)

| Gate | 검증 | 통과 기준 | 실패 시 |
|------|------|----------|--------|
| **G1** | `git mv` 3건 정상 + `apps/{backend,frontend,infra}` 존재, `project/` 미존재 | 3 dirs + project 비존재 | reset --hard |
| **G2** | `pnpm-workspace.yaml` 문법 + `apps/*` 등록 | yaml.parse OK + apps/backend/frontend 포함 | reset --hard |
| **G3** | `(cd apps/infra && docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev config -q)` | exit 0 | reset --hard |
| **G4** | `docker compose up -d` 후 `wait-for-healthy.sh` | postgres+redis+backend+frontend = 4 healthy | reset --hard |
| **G5** | `curl -fsS http://localhost/health` | HTTP 200 | reset --hard |
| **G6 (R1 Critical)** | `(cd apps/frontend && pnpm exec playwright test tests/e2e/user-flows.spec.ts --reporter=line)` | PASS ≥ 56/62 | reset --hard |
| **G7** | BE: `(cd apps/backend && pnpm typecheck && pnpm test)` | typecheck no new error + unit 188+ PASS | reset --hard |
| **G8** | FE: `(cd apps/frontend && pnpm typecheck && pnpm test)` | typecheck 0 + vitest 98+ PASS | reset --hard |
| **G9** | git 이력 보존 (rename detection) | `git log --follow apps/backend/src/app.ts` 이전 이력 노출 | (정보성, 차단 아님) |
| **G10** | `git diff schema.prisma` empty | 0 diff | reset --hard |
| **G11** | match_rate ≥ 0.90 | bkit:gap-detector | < 0.90 시 pdca-iterator 자동 |

**머지 절대 조건**: G1~G8, G10 모두 PASS. G9는 정보성. G11은 사이클 종결 시.

---

## 4. 실행 순서 (Do)

1. **baseline commit** — 현 dirty state(Step 1 자산 + 직전 cycle 미커밋 변경)를 단일 commit으로 묶어 rollback 기준점 확보.
2. `git mv` 3건 — backend/frontend/infra → apps/.
3. 경로 갱신 6 파일 (위 2.2).
4. `apps/infra/scripts/wait-for-healthy.sh` 등 인프라 스크립트는 상대 호출이므로 변경 0건 (검증).
5. **순차 게이트 실행** — G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8 → G10.
6. PASS 시: 사이클 commit + bkit:gap-detector 측정.
7. FAIL 시: `git reset --hard <baseline>` 즉시 rollback (사용자 확인 없이 — C6 명시 권한).

---

## 5. Risk Re-rank (Step 2 한정)

| # | Risk | Severity | Mitigation |
|--:|------|---------:|-----------|
| R1 | compose context 누락 → 4 서비스 unhealthy | **Critical** | G3 compose config -q + G4 healthy 매트릭스 |
| R2 | volume bind path 깨짐 → hot reload 불가 | High | G4 healthy + 컨테이너 내 ls /app 검증 |
| R3 | Playwright spec 회귀 (56/62 baseline 깨짐) | **Critical** | G6 R1 강제 게이트 |
| R4 | git rename detection 실패 → 이력 단절 | Medium | git mv 사용 (cp/rm 금지). G9 검증. |
| R5 | pnpm-workspace.yaml 미갱신 → workspace resolve 실패 | High | G2 yaml.parse + 워크스페이스 entry 검증 |
| R6 | .claude/agents 경로 stale → av 게이트웨이 오작동 | Medium | 본 plan §2.2에 강제 갱신 |
| R7 | Prisma schema 우발 변경 | Critical | G10 git diff empty |
| R8 | dev compose env (single-port) 우발 변경 | Critical | env 섹션 diff 0 검증 (수동) |
| R9 | BE/FE pnpm-lock.yaml 깨짐 (root install 누설) | Medium | 본 사이클 root pnpm install **금지** (Step 3 작업) |

---

## 6. PDCA 매핑

| Phase | 활동 | 산출물 |
|-------|------|--------|
| Plan (이 문서) | 게이트 11건 + Risk 9건 + 절대조건 6건 | 본 파일 |
| Design | git mv 시퀀스 + 6 파일 정확한 diff | `docs/02-design/features/monorepo-step2-folder-move-2026-04-30.design.md` |
| Do | git mv 3건 + 6 파일 수정 + baseline commit | git history 2 commits (baseline + step2) |
| Check | G1~G11 + bkit:gap-detector | match_rate ≥ 0.90 |
| Act | 학습 메모리 보존 | `learning_monorepo_step2_2026_04_30.md` |
| Report | bkit:pdca report | (사이클 종료 후) |

---

**End of Plan** — 다음 액션: Design 문서 (정확한 diff 명세) → 실행
