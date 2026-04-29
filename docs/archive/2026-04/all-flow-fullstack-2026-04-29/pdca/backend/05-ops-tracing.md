# T-502 — OpenTelemetry HTTP traceId + Pino 통합

> Phase: 5 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 들어오는 W3C `traceparent` 컨텍스트를 보존 + Pino 로그에 traceId 포함
> Dependencies: [T-104]

## Plan

- 목표: W3C Trace Context 표준만으로도 분산 추적 가능하도록 한다.
- 결정/가정:
  - 본 단계는 OTel SDK 의존성 추가 없이 W3C 만 구현 → exporter 도입 시 traceId 호환.
  - request id(`req.id`) 와 별도로 `traceId/spanId` 를 보존.
  - Pino child logger 에 traceId/spanId/reqId 바인딩 → 모든 후속 로그에 자동 포함.
- 리스크: 다운스트림 호출 시 새 span 발급 패턴은 후속 라우트에서 도입.

## Do

- 추가 파일: `src/plugins/tracing.ts`, `src/plugins/tracing.test.ts`.
- 수정 파일: `src/app.ts` (sensible 다음에 tracing 등록).
- 추가 의존성: 없음 (`node:crypto.randomBytes` 사용).
- 핵심:
  - `parseTraceparent` 정규식 가드: version/traceId/spanId/flags 길이 + hex + all-zero 체크.
  - 새 span id 발급(부모-자식 관계 명시).

## Check

- 단위 테스트(14): parseTraceparent 8케이스 + 생성기 3 + Fastify 통합 2 = 13. 그리고 `it.each` 로 7 케이스 = 14.
- typecheck/lint: 그린. 누계 108/108 PASS.

## Act

- 학습한 패턴: W3C 만으로도 충분한 첫 도입 — SDK 도입은 collector 합류 시점으로 미룸.
- 후속: OTLP exporter (라우트 별 span 추가), DB 쿼리 span.
