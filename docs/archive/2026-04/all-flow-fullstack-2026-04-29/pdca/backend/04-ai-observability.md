# T-406 — AI 프롬프트 버전 관리 + 토큰/비용 메트릭

> Phase: 4 | Owner: Backend-B | Status: done | Created: 2026-04-28
> Acceptance: 각 호출에 prompt_version + cost(USD) 로그
> Dependencies: [T-402, T-403, T-404]

## Plan

- 목표: 모든 AI 호출(/ai/complete, /ai/extract-actions, /reports/weekly, /reports/monthly)에 `prompt_version` + `cost_usd` 구조화 로그를 표준화하여 비용 가시성과 prompt 추적성을 확보.
- 범위: 신규 모듈 `src/modules/reports/ai-observability.ts` (단일 진입점 `recordAICall`).
- 결정/가정:
  - 비용 산정 우선순위: (1) adapter 가 직접 제공한 `usage.costUSD`, (2) `PRICE_TABLE` 모델 가격표, (3) 알 수 없는 모델 → null
  - `PROMPT_VERSIONS` 매핑: `reports.weekly`/`reports.monthly`/`ai.complete`/`ai.extract-actions` 4개 키 → semver 문자열, 프롬프트 본문 변경 시 bump
- 리스크: 가격 변동 → 운영팀이 `PRICE_TABLE` 갱신해야 하며, 어댑터가 직접 비용을 계산해주는 게 더 정확. 본 단계는 fallback 보조용으로 도입.

## Do

- 추가 파일:
  - `src/modules/reports/ai-observability.ts` — `PROMPT_VERSIONS`, `recordAICall`, `resolveCost`, `PRICE_TABLE`
  - `src/modules/reports/ai-observability.test.ts` — 6 단위 테스트
- 수정 파일:
  - `src/modules/ai/ai.routes.ts` — `/ai/complete` (non-stream + stream) 와 `/ai/extract-actions` 에 `recordAICall` 호출 추가, stream 분기에 `usage` 전파
  - `src/modules/reports/reports.routes.ts` — weekly/monthly 호출 후 `recordAICall` 적용, `promptKey` 명시
- 추가 의존성: 없음
- 핵심 코드:
  - `recordAICall(log, { route, adapter, promptKey, model, usage, tone, sectionCount })` → Pino `kind:'ai_call'` 로그
  - `resolveCost(usage, model)` — costUSD 우선, PRICE_TABLE fallback, unknown → null

## Check

- 단위 테스트: 신규 6 PASS — PROMPT_VERSIONS 형식, costUSD 우선, PRICE_TABLE fallback, unknown 모델 null, undefined usage null, recordAICall Pino 호출 인자 검증
- 통합 검증: weekly/monthly 라우트 호출 시 `prompt_version` 필드가 로그에 노출됨을 코드 경로로 확인
- 누계: 23 files / 150 tests PASS, lint 0 error, typecheck clean
- OpenAPI 컨트랙트: 100% (T-404/T-405 와 동시 측정)

## Act

- 학습한 패턴: 관측성 모듈을 단일 진입점(`recordAICall`)으로 표준화 → 후속 라우트 추가 시 한 줄로 계측 일관성 유지.
- 메모리에 저장: AI 비용 메트릭 = adapter 우선 + 가격표 fallback + 알 수 없으면 null (3-tier).
- 후속 태스크 영향:
  - T-602 E2E 시 AI 비용 합계 검증 가능
  - T-605 최종 PDCA report 작성 시 `cost_usd` 합산 데이터 활용
- 회고: PROMPT_VERSIONS 는 코드 상수로 관리 → 프롬프트 변경 PR 리뷰 시 bump 강제. 추후 외부 설정 분리도 가능.
