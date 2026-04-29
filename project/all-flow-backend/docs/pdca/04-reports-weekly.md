# T-404 — POST /reports/weekly (KPI/sections/citations)

> Phase: 4 | Owner: Backend-B | Status: done | Created: 2026-04-28
> Acceptance: report.kpis ≥ 3 + sections ≥ 3 + citations로 task/doc/issue 링크 검증
> Dependencies: [T-401, T-203]

## Plan

- 목표: 주간 단위 자동 리포트 생성 엔드포인트 제공. AI 어댑터(T-401) + tasks(T-203) + issues 데이터로 KPI 산정 및 섹션 본문 생성.
- 범위: `POST /reports/weekly` (인라인 실행 + Report row 영속화). 별도 BullMQ 의존성 회피.
- 결정/가정:
  - 비동기 큐 재료(BullMQ)는 추가 의존성 비용이 크므로 인라인 + persistReport 패턴으로 표면화. 후속 워커 분리 가능 구조 유지.
  - KPI 는 deterministic 집계(완료율/미해결/크리티컬), sections 본문만 AI 어댑터로 생성.
  - InMemoryAdapter 가 echo 응답 → 본문에 `[task:id]` / `[issue:id]` 인용 마커가 그대로 포함되어 citations 추출 검증 가능.
- 리스크: AI 어댑터 실패 시 섹션 누락 → fallbackBody 로 deterministic 보조 본문 생성하여 acceptance(`sections ≥ 3`) 보장.

## Do

- 추가 파일:
  - `src/modules/reports/report-builder.ts` (KPI/section 빌더, AI 호출, citations 추출)
  - `src/modules/reports/reports.routes.ts` (`POST /reports/weekly`, RBAC, 영속화)
  - `src/modules/reports/ai-observability.ts` (T-406 공용 — 본 단계에서 weekly 호출에 적용)
  - `src/modules/reports/reports.routes.test.ts` (단위 테스트 6종)
- 수정 파일:
  - `src/app.ts` — `reportsRoutes` 등록, aiRegistry 공유
- 추가 의존성: 없음 (Prisma + Fastify + zod 기존 스택 재사용)
- 핵심 코드:
  - `buildReport(adapter, prismaShim(app), input)` — kind/period/scope 입력 → tldr/kpis/sections 산출
  - `assertMembershipForAll` — scopeIds 모든 프로젝트의 멤버 여부 일괄 검증 → 비멤버는 403
  - `persistReport` — Prisma `report.create` + JSONB(`kpis`, `sections`) 직렬화

## Check

- 단위 테스트: `pnpm test` → 23 files / 150 tests 모두 PASS (신규 reports.routes 6 + ai-observability 6)
- 컨트랙트:
  - `pnpm openapi:contract` → coverage **100%** (이전 73.3% → 100%, weekly/monthly/notifications/extract-actions 4종 미구현 모두 해소)
- 수동 검증:
  - 주간 리포트 응답: kpis 3 / sections 3 / citations 추출 (`[task:t1]`, `[issue:i2]`) 확인
  - 비멤버 scopeIds → 403, 잘못된 날짜 → 400, 인증 누락 → 401
- 메트릭/로그:
  - `recordAICall` 호출 — `prompt_version=1.0.0`, `adapter`, `tone`, `section_count` 구조화 로그

## Act

- 학습한 패턴:
  - prismaShim 어댑터로 도메인 모듈이 Prisma 광역 타입을 알 필요 없게 좁힘 → testability 향상.
  - InMemoryAdapter echo + 인용 마커 패턴 → 결정론적 단위 테스트로 sections/citations 검증 가능.
- 메모리에 저장: `.claude/agent-memory/av-base-memory-keeper/`에 "reports 모듈 = builder/observability/routes 3-파일 분리" 패턴 기록 예정.
- 후속 태스크 영향:
  - T-405 monthly 는 동일 builder 재사용 (kind="monthly").
  - T-406 ai-observability 는 본 태스크에서 함께 도입.
- 회고: BullMQ 도입 회피로 의존성 0 추가. 추후 비동기 처리 필요 시 `persistReport` 를 워커로 분리하면 됨.
