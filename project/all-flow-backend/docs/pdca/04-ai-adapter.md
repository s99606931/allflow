# T-401 — AI 어댑터 추상화 (OpenAI 1차, 인터페이스만 노출)

> Phase: 4 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 도메인 코드는 어댑터 인터페이스만 의존 + 결정론적 InMemory 어댑터 제공
> Dependencies: [T-103]

## Plan

- 목표: AI 호출의 전 도메인 코드(reports/extract-actions)를 단일 `AIAdapter` 인터페이스 뒤에 격리.
- 범위:
  - 메시지/옵션/결과 타입 + `AIAdapter` 인터페이스 + `AIAdapterError`
  - `InMemoryAIAdapter` (테스트/Plan 결정론용)
  - `OpenAIAdapter` 골격 (실제 fetch 구현은 T-402)
  - `AIAdapterRegistry` + `buildDefaultAIRegistry(env)`
- 결정/가정:
  - 외부 의존성 추가 없이 fetch 기반으로 T-402 에서 OpenAI 구현.
  - `AIUsage.costUSD` 를 표면화하여 T-406 토큰/비용 메트릭과 연결.
- 리스크:
  - 추후 Anthropic/Bedrock 추가 시 `AIMessage.role` 매핑이 어댑터별로 다를 수 있음 → 어댑터 내부에서 매핑하도록 인터페이스 캡슐화.

## Do

- 추가 파일: `src/modules/ai/ai-adapter.ts`, `src/modules/ai/ai-adapter.test.ts`.
- 수정 파일: 없음.
- 추가 의존성: 없음.

## Check

- 단위 테스트 (11):
  - InMemoryAdapter: canned 매칭/echo/빈 메시지 에러/stream 분할 + done 마지막
  - OpenAIAdapter: apiKey 누락 에러 / 미구현 호출 에러
  - Registry: 첫 등록 default / 미등록 에러 / 빈 레지스트리 에러 / env 기반 빌더 (key 유무)
- typecheck/lint/build: 모두 그린.

## Act

- 학습한 패턴:
  - 어댑터 패턴 + 레지스트리로 모델 라우팅을 한 곳에 수렴.
  - `InMemoryAdapter` 가 있으면 도메인 단위 테스트가 외부 API 의존 없이 결정론적.
- 메모리에 저장: AI 호출 추상화는 항상 어댑터+레지스트리 패턴.
- 후속: T-402(complete/stream 실구현), T-403(extract-actions), T-404(weekly), T-406(메트릭/비용).
