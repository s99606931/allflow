# Plan — P1 백로그 5종 PDCA Sweep (2026-04-30)

> feature: `p1-backlog-sweep-2026-04-30`
> 작성: av-do-orchestrator (av-pm-team STEP 3) | 2026-04-30
> PRD: `docs/00-pm/p1-backlog-sweep-2026-04-30.prd.md`

## 0. 트랙 / 우선순위

| Track | 항목 | 의존성 | 본 사이클 처리 |
|-------|------|--------|---------------|
| T1 | in-memory → Prisma 영속화 (7 도메인) | — | **Plan + 부분 실행** (대규모, 단일 PR 분할 권고) |
| T2 | USE_MOCK=false E2E 전수 회귀 | T1 | **Plan** (T1 완료 후 트리거) |
| T3 | Biome 1.9.4 → 2.4.13 GA | — | **본 사이클 종결** |
| T4 | Node 22 → 24 Active LTS | — | **본 사이클 종결** |
| T5 | Vercel Turbo Remote Cache 등록 | 사용자 권한 | **Plan + 핸드오프 가이드** |

## 1. T3 — Biome 1.9.4 → 2.4.13 GA

### 변경 범위
| 파일 | 변경 |
|------|------|
| `pnpm-workspace.yaml` | `catalog['@biomejs/biome']: 1.9.4 → 2.4.13` |
| `apps/backend/biome.json` | `$schema: 1.9.4 → 2.4.13` + Biome 2 호환 검증 |

### Biome 2 마이그레이션 도구
- `pnpm dlx @biomejs/biome migrate` — 1.x 설정 자동 변환
- `pnpm dlx @biomejs/biome@2.4.13 lint .` — 2.x 적용 후 검증

### 호환성 체크
- Biome 2 주요 변경: `useImportType` 강화, `noUnusedImports`/`noUnusedVariables` 시맨틱 개선, `linter.rules` 카테고리 일부 재구성
- 기존 0 errors 상태이므로 마이그레이션 후 신규 errors는 룰 변경에 의한 것 — fix 또는 비활성화 결정

### 검증 게이트
1. `pnpm install` PASS
2. `pnpm --filter @all-flow/backend lint` PASS (0 errors)
3. `pnpm typecheck` 회귀 0건

## 2. T4 — Node 22 → 24 Active LTS

### 변경 범위
| 파일 | 변경 |
|------|------|
| `package.json` (root) | `engines.node: >=22.0.0 → >=24.0.0` |
| `apps/backend/package.json` | 동일 |
| `apps/frontend/package.json` | 동일 |
| `apps/backend/Dockerfile` | `ARG NODE_VERSION=22 → 24` |
| `apps/frontend/Dockerfile` | 동일 |
| `.github/workflows/ci.yml` | `node-version: ["22"] → ["24"]` |
| `.github/workflows/security.yml` | `node-version: 20 → 24` |
| `packages/config-tsconfig/node22.json` | (preset 이름 유지, target 최신화 검토) |

### 호환성 체크
- Fastify 5 / Prisma 6 / Next.js 15 / Vitest 2: Node 24 공식 지원 확인
- pnpm 10.33.0 / Turbo 2.5.x: Node 24 호환
- `--experimental-strip-types` Node 24 stable화 (tsx 의존도 점진 감소 가능, 본 사이클 비목표)

### 검증 게이트
1. `corepack enable && corepack prepare pnpm@10.33.0 --activate` PASS
2. `pnpm install` PASS (engines 경고 0)
3. `pnpm typecheck` 회귀 0건
4. CI matrix Node 24 PASS
5. Docker build PASS (`docker compose -f infra/docker-compose.dev.yml build`)

### 호환성 리스크
- 일부 native binding (lightningcss/oxide) Node 24 musl alpine 바이너리 존재 확인 필요
- 학습된 `learning_musl_binary_fix_2026_04_30.md` 패턴 재적용 가능

## 3. T1 — in-memory → Prisma 영속화 (Plan only)

### 식별된 7 도메인
| # | 모듈 | in-memory 위치 | Prisma 모델 |
|---|------|---------------|-------------|
| 1 | approvals | `Map<string, ApprovalRow>` (53) | **신설**: `Approval` |
| 2 | org/invitations | `Map<string, InvitationRow>` (52) | **신설**: `Invitation` |
| 3 | resources/bookings | `Map<string, BookingRow[]>` (50) | **신설**: `Resource` + `Booking` |
| 4 | clients | `Map<string, ClientRow>` (36) | **신설**: `Client` |
| 5 | docs | `Map<string, DocRow>` (30) | **신설**: `Doc` (Document, 이름 충돌 회피) |
| 6 | events | `Map<string, EventRow>` (44) | **신설**: `Event` (Calendar event) |
| 7 | channels | (검증 후 결정) | TBD |

### 단계별 PR 분할 (권고)
- PR-T1.1: Prisma schema 7 모델 추가 + migration
- PR-T1.2: approvals/clients/events 영속화 (단순 CRUD 3개)
- PR-T1.3: docs/org/invitations 영속화
- PR-T1.4: resources/bookings 영속화 (1:N 관계 + 시간 충돌 검사)
- PR-T1.5: 통합 회귀 + bkit:gap-detector

### Acceptance Gates
- `grep -rn "new Map<string" apps/backend/src/modules` = 0 (test 파일 제외)
- BE 단위/통합 테스트 전수 PASS (현재 BE 295/295 + 38/38 기준 유지)
- Prisma migration deploy 성공 (PostgreSQL 16)

## 4. T2 — USE_MOCK=false E2E 전수 회귀 (Plan only)

### 사전 조건
- T1 완료 (BE 모든 데이터 영속) — 그렇지 않으면 컨테이너 재시작 시 데이터 소실로 E2E 깨짐

### 변경 범위
| 파일 | 변경 |
|------|------|
| `apps/frontend/.env.example` | `NEXT_PUBLIC_USE_MOCK=true → false` |
| `apps/infra/.env.dev` | (이미 false 또는 unset = 기본 false) 명시 추가 |
| Playwright 픽스처 | mock fixtures 의존 케이스를 BE seed로 전환 |

### Acceptance Gates
- Playwright 62/62 PASS (`E2E_BASE_URL=http://localhost`)
- BE seed로 모든 케이스 데이터 충족
- Playwright 회귀 0건 (직전 사이클 56-60/62 baseline 대비)

## 5. T5 — Vercel Turbo Remote Cache 등록 (Plan + 핸드오프)

### 사용자 액션 (필수, agent 불가)
1. `npx turbo login` — 브라우저 로그인 (Vercel 계정)
2. `npx turbo link --to {team-slug}` — 팀에 연결
3. GitHub Repository Settings → Secrets and variables → Actions:
   - `TURBO_TOKEN`: Vercel Personal Access Token
   - `TURBO_TEAM`: Vercel team slug
4. PR 머지 → CI 2회차 실행 → Turbo 출력 `cache HIT` 확인

### 측정 지표
- CI 1회차: `>>> Found cache miss` 다수 (예상)
- CI 2회차 (no-op): `>>> Found cache HIT` 80%+ (목표)
- GHA 로그에서 `>>> Time saved` 확인

### Acceptance Gates
- `TURBO_TOKEN` + `TURBO_TEAM` 둘 다 secrets에 존재 (gh secret list)
- CI 2회차 cache hit ≥ 80%
- Plan 문서에 등록 절차 명문화 (사용자 가이드)

## 6. 본 사이클 산출물

- `docs/00-pm/p1-backlog-sweep-2026-04-30.prd.md` (작성됨)
- `docs/01-plan/p1-backlog-sweep-2026-04-30.plan.md` (이 문서)
- T3/T4 코드 변경 (Biome 2.4.13 + Node 24)
- T5 핸드오프 가이드
- T1/T2 후속 사이클을 위한 상세 Plan (위 §3, §4)
- memory-keeper 학습 항목

## 7. 검증 순서

```
1) T3 적용 → pnpm install → pnpm lint
2) T4 적용 → pnpm typecheck
3) Docker build (T4 검증)
4) bkit:gap-detector 측정
5) memory-keeper 학습 저장
```

## 8. 롤백 전략

- T3: `pnpm-workspace.yaml` 1줄 + `biome.json` 1줄 revert
- T4: `engines` + Dockerfile ARG 일괄 revert (8 파일)
- T1/T2/T5: 본 사이클 미실행 → 별도 사이클에서 진행
