# PRD — P1 백로그 5종 PDCA Sweep (2026-04-30)

> feature: `p1-backlog-sweep-2026-04-30`
> 사이클: idle → 5 P1 백로그 일괄 진행
> 작성: av-pm-coordinator (av-pm-team STEP 1) | 2026-04-30
> 직전 사이클: monorepo-microservices-2026-04-30 (archived, match_rate 0.97)

## 1. 사용자 요구사항 (원문)

> 다음 5개 P1 백로그 항목을 모두 PDCA 사이클로 진행해주세요:
> 1. in-memory → Prisma 영속화 (7 도메인) — 가장 임팩트 큼
> 2. USE_MOCK=false E2E 전수 회귀 — #1 의존
> 3. Biome 1.9.4 → 2.4.13 GA — 스택 현행화
> 4. Node 22 → 24 Active LTS — 스택 현행화
> 5. Vercel Turbo Remote Cache 등록 — CI cache hit 실측
>
> 우선순위: 1→2 순서 의존성 있음, 3/4/5는 독립적으로 병렬 가능

## 2. 의존성 그래프

```
T1 (Prisma 영속화 7 domains) ──→ T2 (USE_MOCK=false E2E)
T3 (Biome 1.9.4 → 2.4.13) ──┐
T4 (Node 22 → 24 LTS) ──────┼─→ 독립 병렬 가능
T5 (Turbo Remote Cache) ────┘
```

T1 → T2 직렬 필수 (FE는 BE 영속 데이터에 의존). T3/T4/T5는 환경/CI 변경이라 독립.

## 3. 트랙별 사용자 요구사항 추출

### T1 — in-memory → Prisma 영속화 (7 도메인)

**현재 식별된 in-memory 모듈:**
- `approvals` — `Map<string, ApprovalRow>` (approvals.routes.ts:53)
- `org` — `Map<string, InvitationRow>` invitations (org.routes.ts:52)
- `resources` — `Map<string, BookingRow[]>` bookings (resources.routes.ts:50)
- `clients` — `Map<string, ClientRow>` (clients.routes.ts:36)
- `docs` — `Map<string, DocRow>` (docs.routes.ts:30)
- `events` — `Map<string, EventRow>` (events.routes.ts:44)
- `channels` (검증 필요) / `notifications-pref` (검증 필요)

**정확히 7 도메인** 도출 필요. Prisma 모델 신설 또는 기존 모델 확장.

### T2 — USE_MOCK=false E2E 전수 회귀

- `apps/frontend/.env*`에서 `NEXT_PUBLIC_USE_MOCK=false` 강제
- Playwright 62 케이스 모두 BE Postgres 데이터 의존 PASS

### T3 — Biome 1.9.4 → 2.4.13 GA

- pnpm-workspace.yaml `catalog['@biomejs/biome']: 1.9.4 → 2.4.13`
- biome.json schema URL `1.9.4` → `2.4.13` + breaking change 마이그레이션

### T4 — Node 22 → 24 Active LTS

- `engines.node: ">=22.0.0"` → `">=24.0.0"` (root + apps/* + packages/*)
- `.github/workflows/ci.yml` matrix `22.x` → `24.x`
- Dockerfiles `node:22-alpine` → `node:24-alpine`

### T5 — Vercel Turbo Remote Cache 등록

- `vercel link` + `npx turbo login` + `turbo link`
- GitHub Secrets: `TURBO_TOKEN` + `TURBO_TEAM`
- CI workflow에서 cache hit 실측 (이미 env 정의됨)

## 4. 트랙별 목표 (수락 기준)

| 트랙 | 게이트 | 측정 |
|------|-------|------|
| T1 | 7개 모듈 in-memory Map 0건 (`grep -rn "new Map<string"` = 0). BE test 전수 PASS. | 단위/통합 테스트 |
| T2 | Playwright 62 전수 PASS, USE_MOCK=false 강제 후 회귀 0건 | Playwright report |
| T3 | `pnpm lint` 전 워크스페이스 PASS (Biome 2 syntax). 0 errors. | turbo run lint |
| T4 | `node --version` v24.x. CI matrix PASS. Docker image build 성공 | CI matrix |
| T5 | Turbo Remote Cache 등록. CI 2회차 실행에서 cache HIT 실측 | GHA logs |
| 종합 | match_rate ≥ 0.90 | bkit:gap-detector |
| 종합 | code 점수 ≥ 95/100 | bkit:code-analyzer |

## 5. 본 사이클의 비목표

- 새 도메인 모델 추가 (T1은 기존 in-memory 모델만 영속화)
- T2의 시각적 디자인 변경
- T3의 lint rule 신규 추가/제거 (마이그레이션만)
- T4의 Node 24 신규 API 도입
- T5의 self-hosted 캐시 서버 구축

## 6. 권한 / 환경 의존성

- **T5**는 사용자가 Vercel CLI 로그인 + GitHub Secrets 등록 필요 → Plan 단계에서 명시적 핸드오프 필수
- T1은 Prisma migration 필요 → `pnpm --filter @all-flow/backend prisma:migrate` 실행 권한 필요
- T4는 Node 24 사용 가능 환경 필요 (현재 dev 컨테이너는 22) → `pnpm engines` 게이트 영향 평가

## 7. 진행 전략

**병렬 트랙 (Plan 동시 작성, Do는 순차):**
1. PL `av-do-orchestrator`가 5개 트랙 Plan 동시 생성
2. T1·T3·T4 동시 Do (T2는 T1 후, T5는 환경 의존)
3. 각 트랙 완료 시 bkit:gap-detector 측정 → < 0.90 시 pdca-iterator
4. 모든 트랙 PASS → 통합 회귀 (Playwright + CI green)
5. memory-keeper 학습 누적 (백그라운드)

## 8. 산출물

- 각 트랙 plan/design/report (`docs/01-plan/p1-backlog-sweep-2026-04-30/T{1..5}-*.plan.md`)
- 코드 변경 (Prisma migration + Biome 2 + Node 24 Dockerfile + 환경 가이드)
- 테스트 리포트 (BE unit/int + Playwright 62)
- memory-keeper 학습 (`learning_p1_backlog_sweep_2026_04_30.md`)
