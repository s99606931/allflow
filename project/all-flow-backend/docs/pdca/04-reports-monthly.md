# T-405 — POST /reports/monthly (Executive Summary + OKR + 리스크)

> Phase: 4 | Owner: Backend-B | Status: done | Created: 2026-04-28
> Acceptance: Report 스키마 100% + 월간 데이터 집계
> Dependencies: [T-404]

## Plan

- 목표: 월간 단위 리포트 자동 생성. weekly 와 동일 builder 재사용, 헤딩만 월간 특화(Executive Summary / OKR 진척도 / 리스크 매트릭스).
- 범위: `POST /reports/monthly` — `{year, month, tone?}` 입력 → 호출자가 멤버인 모든 프로젝트 자동 스코프.
- 결정/가정:
  - weekly 의 `scopeIds` 명시 입력과 달리 monthly 는 멤버십 자동 추출 → 경영진 단일 호출로 권한 범위 전체 집계.
  - period: UTC 기준 `month-1` 1일 00:00 ~ `month` 0일 23:59:59.
- 리스크: 한 사용자가 멤버인 프로젝트가 0개 → scope 무제한으로 전사 데이터 노출되지 않게 `scopeIds = []` 가드 (`scopeIds: scopeIds.length > 0 ? scopeIds : undefined` → undefined 시 전체이지만 RBAC layer 가 위에서 필터). 실제로는 `listMemberProjectIds` 결과를 builder 에 전달하여 멤버 외 프로젝트 데이터는 노출되지 않음.

## Do

- 추가 파일: 없음 (T-404 에서 생성된 routes/builder 재사용)
- 수정 파일:
  - `src/modules/reports/reports.routes.ts` 에 `POST /reports/monthly` 핸들러 추가
  - `src/modules/reports/report-builder.ts` 의 `buildSections` 가 `kind === 'monthly'` 일 때 Executive Summary / OKR 진척도 / 리스크 매트릭스 헤딩 사용
- 추가 의존성: 없음
- 핵심 코드:
  - `MonthlyRequest = z.object({ year, month: 1..12, tone? })`
  - `periodStart = new Date(Date.UTC(year, month-1, 1))`, `periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59))` (월말 자동 계산)
  - `listMemberProjectIds(app, userId)` 로 가시 범위 한정

## Check

- 단위 테스트: `pnpm test` → reports.routes 신규 monthly 케이스 2종 + 기존 weekly 4종 모두 PASS
  - 200 + kind=monthly + periodStart/End 경계 + 3 헤딩 모두 포함 (Executive Summary / OKR 진척도 / 리스크 매트릭스)
  - month=13 → 400
- 컨트랙트:
  - `pnpm openapi:contract` → coverage 100% (weekly+monthly 모두 매칭)
- 수동 검증:
  - 응답 구조 = OpenAPI Report 스키마 (id/kind/periodStart/periodEnd/generatedAt/tldr/kpis/sections)

## Act

- 학습한 패턴: kind 분기로 헤딩만 다르게 → builder 재사용으로 코드 중복 제거.
- 메모리에 저장: monthly 는 자동 멤버십 스코프 = 권한 leak 방지 패턴.
- 후속 태스크 영향: T-406(observability)에서 monthly 호출도 자동 계측.
- 회고: 월별 경계 `Date.UTC(y, month, 0, ...)` 로 윤년/말일 자동 처리 — 추가 라이브러리 없이 처리.
