# T-402 — POST /ai/complete (non-stream + SSE stream)

> Phase: 4 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: openapi `/ai/complete` 컨트랙트 일치 (non-stream JSON + SSE 스트림)
> Dependencies: [T-401]

## Plan

- 목표: 어댑터 추상(T-401)을 표면화하는 첫 라우트.
- 결정/가정:
  - context 객체는 system 메시지로 직렬화하여 첫 메시지에 주입.
  - 인용은 본문 마커 `[task:id]` / `[doc:id]` / `[message:id]` / `[issue:id]` 정규식 추출.
  - SSE 청크 포맷: `data: {"delta": "..."}\n\n` → 마지막 `data: {"done":true,"citations":[...]}`.
  - 어댑터는 env OPENAI_API_KEY 유무에 따라 OpenAI 또는 InMemoryAdapter 선택.
- 리스크:
  - 실제 OpenAI fetch 는 미구현(어댑터 throw) — 본 라우트 단위 테스트는 InMemoryAdapter 로 결정론.

## Do

- 추가 파일: `src/modules/ai/ai.routes.ts`, `src/modules/ai/ai.routes.test.ts`.
- 수정 파일: `src/app.ts`, `src/config/env.ts` (OPENAI_API_KEY).
- 추가 의존성: 없음.

## Check

- 단위 테스트(5): non-stream 200 + citations / SSE 청크+done / 401 / 빈 prompt 400 / extractCitations 4종 매칭.
- typecheck/lint: 그린.
- 누계: 94/94 PASS.

## Act

- 학습한 패턴: SSE 라우트는 hijack 후 `reply.raw.end()` 로 명시 종료 + AsyncIterable 어댑터 stream 을 직렬화.
- 후속: T-403(extract-actions), T-406(프롬프트 버전+비용 메트릭).
