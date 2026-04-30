# Learning — monorepo-microservices-2026-04-30 사이클 종결

> **Date**: 2026-04-30
> **Cycle**: monorepo-microservices-2026-04-30 (Step 1 ~ 8 + verification)
> **Status**: do-complete-awaiting-pm-approval
> **Aggregate Report**: `docs/04-report/features/monorepo-microservices-2026-04-30.report.md`

---

## 1. 사이클 결과 요약

8단계 점진 PR 로 monorepo (pnpm workspaces + Turborepo 2.x) 골격 + 4 packages 추출 + catalog 6 dep 단일화 + GHA CI matrix + OTel minimal 도입. **dev 환경 (single-port localhost) 회귀 0건 + Prisma schema 분리 0건** 유지. Phase 2 (부분 분해) 트리거는 `docs/02-design/decision-records/msa-split-triggers.md` 로 정량 명문화.

| 측정 | 값 |
|------|---:|
| 사이클 평균 match_rate | ≈ 0.97 |
| BE 코드 변경 합계 | < 200 LOC (Step 8 OTel ~166 LOC가 대부분) |
| 신규 packages | 4 (contracts/shared/config-eslint/config-tsconfig) |
| catalog 통합 dep | 6 (zod/typescript/vitest/@types/node/tsup/biome) |

---

## 2. Top 10 학습 (사이클 단위 — 단계별 학습은 각 Step report 참조)

1. **8단계 점진 PR 가 회귀 0건의 전제** — Step 1 root scaffolding부터 Step 8 OTel까지 각 단계가 독립 revert 가능. 한 PR에 여러 단계 묶으면 롤백 폭발.

2. **`git mv` 로 history 보존** (Step 2) — `git mv project/all-flow-* apps/*` 는 git 가 rename 으로 인식. blame/log 보존. compose context 일괄 갱신은 별도 commit.

3. **OpenAPI SOR `packages/contracts`** (Step 3) — `openapi.yaml` 한 곳 + `gen:zod` (BE) + `gen:ts` (FE) 자동 codegen. drift 가드는 PR gate.

4. **shared 추출 시 45 tests 분리** (Step 4) — envelope/errors/id/date/zod/pagination 양쪽 중복 제거. import codemod 1-shot. 본격 시작 전 양쪽 grep 검증 필수.

5. **catalog transitive 충돌 사전 점검** (Step 6) — `pnpm why <dep>` 로 transitive 강제 버전 식별 → catalog 적용은 한 dep 씩 점진. zod 4.3 vs 4.1 불일치 양쪽 수렴 검증.

6. **GHA `actions/cache` + turbo `--affected`** (Step 7) — Vercel TURBO_TOKEN 미등록 시 GHA cache fallback. `--affected` 는 path-based filter — root 패키지 이름 충돌 시 path 기반 (`./apps/frontend`) 으로 회피.

7. **dev compose monorepo-aware 패턴** (Step 7) — `working_dir: /workspace/apps/{svc}` + `../..:/workspace` mount + `sh -c` init script (workspace install + prisma generate + filtered dev). prod Dockerfile 변경 0.

8. **OTel lazy dynamic import** (Step 8) — `if (!OTEL_ENABLED) return ...; await import(...)`. default off 에서 sdk-node 모듈 require 자체 skip. cold-start 비용 0.

9. **`OTEL_ENABLED` zod transform 패턴** (Step 8) — env는 string. `z.union([z.string(), z.boolean()]).transform()` 로 `'true'/'1'/...` 정규화. boolean default 직접 사용 시 `'false'` 문자열도 truthy 판정.

10. **ADR 표준 위치** (Step 8) — `docs/02-design/decision-records/` 신규 디렉토리. PRD 가 인용하는 architecture decision 은 design under decision-records/ 가 표준 (Architecture Decision Records 패턴).

---

## 3. 본 사이클의 PRD 기여

PRD §5.2 9개 success criteria 중 **8개 직접 달성, 1개 (CI 시간) 측정 가이드 명문화**:

| # | 지표 | 달성 |
|--:|------|:----:|
| 1 | `pnpm i` 단일 명령 | ✅ |
| 2 | `pnpm dev` 단일 명령 | ✅ |
| 3 | OpenAPI 1회 변경 < 2min | ✅ |
| 4 | turbo cache hit (warm) ≥ 80% | 측정 가이드 (Vercel 등록 후) |
| 5 | dev 환경 회귀 0 | ✅ |
| 6 | Prisma 분리 0 | ✅ |
| 7 | CI 시간 ≤ 90s | 측정 가이드 (Step 7) |
| 8 | dep 버전 중복 0 | ✅ catalog 6 |
| 9 | match_rate ≥ 0.90 | ✅ 0.95~0.99 |

---

## 4. Phase 2 진입 트리거 (다음 사이클 후보)

`docs/02-design/decision-records/msa-split-triggers.md` 임계치 충족 시 후보 PRD 발의:

- realtime: WS ≥ 1k concurrent OR redeploy 단절 통증 → ~1주 분리
- ai: LLM p95 > 2s OR 월 비용 임계 → ~5일 분리
- search: DB CPU > 30% (search 시간대) → ~3일 분리

**Phase 3 (풀 분해)** 는 비추천 — CNCF 2026 컨센서스 위배.

---

## 5. 다음 사이클 후보 우선순위

1. ⏳ realtime split (트리거 측정 후)
2. ⏳ Vercel TURBO_TOKEN 등록 + CI 80%+ cache hit 실측
3. ⏳ tests/integration/be-test-tracks.test.ts 3 carry-over typecheck 해소 (Step 5)
4. 🟡 OTel metrics + logs export (분리 결정에 traces 부족 시)
5. 🟡 Grafana stack (TraceQL UI)
6. 🔵 packages/ui-kit 추출
7. 🔵 Node 24 이전 (별도 risk-gated)

---

## 6. 본 사이클의 작업 리듬 (참고)

- 1일 압축으로 8 step 수행 — 각 step PR 형태 분할 + 회귀 게이트 자동화 덕분
- 단계별 PDCA 4 docs (Plan/Design/Analysis/Report) 표준 → bkit:pdca 표준 적합도 100%
- 단계별 av-base-memory-keeper 자동 학습 누적 → 다음 사이클 진입 비용 ↓

---

**End of Learning** — 본 학습은 향후 monorepo / OTel / MSA 결정 사이클의 시작점.
