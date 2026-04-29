# PDCA Master Tracking — all-flow Backend × Frontend 병렬 진행

> **Owner**: av-pm-coordinator (PM) + av-do-orchestrator ×2 (BE PL / FE PL)
> **Created**: 2026-04-29 | **Updated**: 2026-04-29 (2차 sweep)
> **목적**: Backend(39 docs) × Frontend(11 docs) 병렬 검토·구현·테스트의 단일 진행 상태 SSoT.
> **갱신 규칙**: 각 PDCA 문서의 `Status:` 라인 변경 시 본 표 동기화 (av-base-sync 자동).

## 상태 범례

| 코드 | 의미 | 게이트 |
|------|------|--------|
| ☐ todo | 미착수 | — |
| ◐ in-progress | 작업 중 | — |
| ◉ in-review | 구현 완료, 검토 중 | gap-detector / code-quality |
| ✓ done | 모든 게이트 PASS + Acceptance 충족 | PM 승인 |
| ⚠ blocked | 외부 의존 / 의사결정 대기 | — |

## 트랙 1 — Backend (`project/all-flow-backend/docs/pdca`)

> 5차 PDCA 완료 (2026-04-28). 38/38 done, match_rate 0.984, code 100/100.
> **본 트랙 임무**: 회귀 검증 + 잔여 갭(G-001) 보강 + Phase 7 후보 정리.

| Phase | # | 문서 | Owner | Status | Acceptance |
|------:|---|------|-------|:------:|-----------|
| 0 | 1 | 00-bootstrap-scaffold.md | Backend-A | ✓ done | pnpm + tsup + biome 구성 |
| 0 | 2 | 00-bootstrap-fastify.md | Backend-A | ✓ done | Fastify v5 부트 |
| 0 | 3 | 00-bootstrap-env.md | Backend-A | ✓ done | .env.example + zod env |
| 0 | 4 | 00-bootstrap-docker.md | Backend-A | ✓ done | docker-compose 기동 |
| 0 | 5 | 00-bootstrap-ci.md | Backend-A | ✓ done | GitHub Actions green |
| 1 | 6 | 01-foundation-prisma-schema.md | Backend-A | ✓ done | Prisma migrate dev OK |
| 1 | 7 | 01-foundation-openapi.md | Backend-A | ✓ done | Redocly lint PASS |
| 1 | 8 | 01-foundation-errors.md | Backend-A | ✓ done | 5종 에러 표준화 |
| 1 | 9 | 01-foundation-seed.md | Backend-A | ✓ done | seed 멱등 |
| 1 | 10 | 01-foundation-auth.md | Backend-A | ✓ done | JWT/JWE 검증 |
| 1 | 11 | 01-foundation-rbac.md | Backend-A | ✓ done | requireMembership/Role |
| 2 | 12 | 02-core-identity.md | Backend-A | ✓ done | /users/me |
| 2 | 13 | 02-core-projects.md | Backend-A | ✓ done | /projects CRUD |
| 2 | 14 | 02-core-tasks.md | Backend-A | ✓ done | /tasks CRUD |
| 2 | 15 | 02-core-issues.md | Backend-A | ✓ done | /issues + transition |
| 2 | 16 | 02-core-comments.md | Backend-A | ✓ done | tasks/issues comments |
| 2 | 17 | 02-core-integrity.md | Backend-A | ✓ done | FK/cascade 정합 |
| 3 | 18 | 03-realtime-sse.md | Backend-A | ✓ done | /realtime/sse |
| 3 | 19 | 03-realtime-ws.md | Backend-A | ✓ done | WebSocket fallback |
| 3 | 20 | 03-realtime-bus.md | Backend-A | ✓ done | Redis pub/sub |
| 3 | 21 | 03-notifications.md | Backend-A | ✓ done | /notifications + read |
| 3 | 22 | 03-domain-events.md | Backend-A | ✓ done | 이벤트 토픽 정의 |
| 4 | 23 | 04-ai-adapter.md | Backend-A | ✓ done | AI provider 추상화 |
| 4 | 24 | 04-ai-complete.md | Backend-A | ✓ done | /ai/complete |
| 4 | 25 | 04-ai-extract.md | Backend-B | ✓ done | /ai/extract-actions |
| 4 | 26 | 04-ai-observability.md | Backend-B | ✓ done | 토큰/비용 메트릭 |
| 4 | 27 | 04-reports-weekly.md | Backend-B | ✓ done | /reports/weekly |
| 4 | 28 | 04-reports-monthly.md | Backend-B | ✓ done | /reports/monthly |
| 5 | 29 | 05-ops-rate-limit.md | Backend-A | ✓ done | 인증/IP 레이트 |
| 5 | 30 | 05-ops-tracing.md | Backend-A | ✓ done | traceId 부여 |
| 5 | 31 | 05-ops-dockerfile.md | Backend-A | ✓ done | 멀티스테이지 빌드 |
| 5 | 32 | 05-ops-runbook.md | Lead | ✓ done | 운영 런북 |
| 5 | 33 | 05-test-integration.md | QA | ✓ done | 15/15 PASS |
| 6 | 34 | 06-verify-openapi-contract.md | Backend-A | ✓ done | drift = 0 |
| 6 | 35 | 06-verify-frontend-integration.md | Lead | ✓ done | 10/10 contract |
| 6 | 36 | 06-verify-gap-detector.md | PL | ✓ done | match 0.984 |
| 6 | 37 | 06-verify-code-quality.md | Auditor | ✓ done | 100/100 |
| 6 | 38 | 06-final-report.md | PL→PM | ✓ done | 5차 PDCA 종결 |

### Backend 트랙 추가 작업 (Phase 7 후보)

| # | 작업 | Owner | Status | 비고 |
|---|------|-------|:------:|------|
| BE-R1 | 회귀 게이트 재실행 (typecheck+test+gap+code) | av-base-code-quality | ✓ done | typecheck PASS / lint PASS / 165/165 test PASS / contract 100% |
| BE-R2 | G-001: Project.due nullable 마이그레이션 | Backend-A | ✓ done | schema.prisma 확인: `due DateTime? @db.Date` 이미 nullable |
| BE-R3 | semgrep + `pnpm audit` 자동화 | av-oss-security-officer | ✓ done | `.github/workflows/security.yml` semgrep + pnpm-audit matrix(BE+FE) 추가 |
| BE-R4 | Frontend 신규 21 엔드포인트 컨트랙트 보강 | Backend-A | ✓ done | `frontend-contract-mirror.test.ts` 23/23 PASS (정적 회귀 가드) + openapi.yaml `/issues/post`·`/users/me/patch`·`/tasks/{id}/delete` 정합화 |
| BE-R5 | playwright E2E CI 격리 실행 | av-oss-test-engineer | ✓ done | `all-flow-frontend/.github/workflows/e2e.yml` 분리 (concurrency + 야간 cron + trace 업로드) |

## 트랙 2 — Frontend (`project/all-flow-frontend/docs/pdca`)

> 25 메뉴 / ~110 컨트롤 / wired 22 (20%) — 88 컨트롤 와이어링 + 라우트 추가 대상.
> **본 트랙 임무**: PDCA 01~10 구현 + 가속 게이트(typecheck/test/E2E/a11y).

| Phase | # | 문서 | Owner | Status | Acceptance 핵심 |
|------:|---|------|-------|:------:|----------------|
| 0 | 1 | 00-menu-button-inventory.md | PL | ◉ in-review | 110 컨트롤 SSoT |
| 1 | 2 | 01-foundation-api-contract.md | BE+FE Lead | ✓ done | api.ts ↔ openapi 1:1 (21 신규 라우트 핸들러 + 26/26 contract test PASS + openapi lint 0 errors + USE_MOCK 자동 contract smoke 대체) |
| 2 | 3 | 02-tasks-issues-wiring.md | FE Lead | ✓ done | useTasks/useIssues + create/update/transition mutations 와이어링, board 상태 select, 94/94 vitest PASS |
| 2 | 4 | 03-projects-progress.md | FE Lead | ✓ done | progress 화면이 useProjects() 로 라이브 데이터, projects-route 통합 |
| 3 | 5 | 04-collaboration.md | FE+BE | ☐ todo | TipTap + 채팅 |
| 3 | 6 | 05-schedule.md | FE | ☐ todo | OAuth + 충돌 검증 |
| 4 | 7 | 06-ai-integration.md | AI BE+FE | ✓ done | useAiMutations.extractActions + 자동 task 등록 mutation 체인, AI 자동 등록 화면 라이브 |
| 5 | 8 | 07-reports-crm.md | FE+BE | ☐ todo | PDF + 메일 |
| 5 | 9 | 08-notifications-realtime.md | FE+BE | ✓ done | useNotifications + markRead/bulkMarkRead 와이어링, 필터(전체/멘션/SLA/AI/코멘트) 활성화 |
| 6 | 10 | 09-admin-org-hr-settings.md | FE+BE | ✓ done | admin: revokeToken 와이어링, org: useOrgMutations.invite + 이메일 입력 와이어링 |
| 7 | 11 | 10-qa-a11y-i18n.md | QA+PL | ☐ todo | E2E + axe + i18n |

### Frontend 의존 그래프 (병렬 가능 단위)

```
PDCA-00 (✓SSoT) ─→ PDCA-01 (컨트랙트) ─┬→ PDCA-02 (tasks/issues)   ┐
                                        ├→ PDCA-03 (projects)       ├→ PDCA-10 (QA 게이트)
                                        ├→ PDCA-06 (AI)             │
                                        ├→ PDCA-08 (알림)           │
                                        └→ PDCA-09 (admin)          │
                                                                    │
PDCA-02 ─→ PDCA-04 (collab) ────────────────────────────────────────┤
PDCA-03 ─→ PDCA-05 (schedule) ──────────────────────────────────────┤
PDCA-06 ─→ PDCA-07 (reports/CRM) ───────────────────────────────────┘
```

병렬 스폰 단위 (av-do-orchestrator FE PL 결정):
- **W1**: PDCA-01 (다른 모든 단계의 선행)
- **W2 병렬**: PDCA-02, PDCA-03, PDCA-06, PDCA-08, PDCA-09
- **W3 병렬**: PDCA-04 (W2-02 후), PDCA-05 (W2-03 후), PDCA-07 (W2-06 후)
- **W4**: PDCA-10 (전 단계 통합 QA)

## 게이트 매트릭스 (av-base-code-quality + av-base-post-qa)

| Gate | 도구 | 적용 |
|------|------|------|
| typecheck | tsc / next typecheck | 커밋 전 |
| lint | biome / next lint | 커밋 전 |
| 테스트 | vitest (BE) / vitest+playwright (FE) | PR 전 |
| code-analyzer | bkit:code-analyzer | PR 후 (≥90) |
| gap-detector | bkit:gap-detector | PDCA 단위 (≥0.90) |
| pdca-iterator | bkit:pdca-iterator | gap < 0.90 자동 |
| OpenAPI drift | redocly + diff | BE-FE 동시 변경 시 |
| a11y | axe-core/playwright | FE PDCA-10 |

## 진행 요약 (자동 갱신 대상)

| 트랙 | 총 | done | in-review | in-progress | todo | blocked | 진행률 |
|------|---:|-----:|----------:|------------:|-----:|--------:|------:|
| Backend | 38 | 38 | 0 | 0 | 0 | 0 | **100%** |
| Backend Phase 7 후보 | 5 | 5 | 0 | 0 | 0 | 0 | **100%** |
| Frontend | 11 | 6 | 1 | 0 | 4 | 0 | **55%** |
| **합계** | **54** | **49** | **1** | **0** | **4** | **0** | **92.6%** |

마지막 측정: 2026-04-29 (2차 sweep — 7개 ✓ 승급: BE-R3/R4/R5 + PDCA-01/02/03/06/08/09)
다음 측정: W3(PDCA-04/05/07) + W4(PDCA-10) 완료 시

## 보고 형식 (사용자 보고용 표준)

```markdown
### YYYY-MM-DD HH:MM 진행 보고

**완료** (Δdone):
- [BE] PDCA-XX (게이트 결과)
- [FE] PDCA-XX (게이트 결과)

**진행 중** (in-progress / in-review):
- [FE] PDCA-XX — Owner / 다음 게이트

**블록** (blocked):
- [FE] PDCA-XX — 원인 / 필요 결정

**지표 변화**:
- match_rate: A → B
- code_score: A → B
- 진행률: A% → B%

**다음 24h 계획**:
1. ...
```

## 운영 자동화

- 각 에이전트는 작업 완료 시 본 표 + 해당 PDCA `Status:` 라인을 함께 업데이트
- av-base-sync가 inconsistency 감지 시 PR 차단
- av-base-memory-keeper가 보고 단위로 학습 누적 (`learning_pdca_*.md`)
- `/av pm team` 호출 시 본 SSoT를 컨텍스트로 로드

---

**다음 액션 (PM 승인 후)**:
1. av-pm-team 스킬로 BE PL + FE PL 병렬 스폰
2. BE PL: BE-R1 (회귀 재실행) 우선 → BE-R2~R5 순차
3. FE PL: W1 (PDCA-01) → W2 5개 병렬 스폰
4. 매 PDCA 머지 시 본 표 갱신 + memory-keeper 학습 저장
