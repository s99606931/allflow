# T-305 — 도메인 이벤트 → notification 자동 생성

> Phase: 3 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 3가지 트리거(task assigned / issue SLA / mention) → notification + SSE 발행 단위 테스트
> Dependencies: [T-304]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: 도메인 핸들러 코드(태스크 어사인 등)에서 단일 함수만 호출하면 DB notification + 실시간 fan-out 까지 자동 처리되도록 한다.
- 범위:
  - `domain-events.ts` — 3개 트리거 핸들러 (`onTaskAssigned`, `onIssueSlaApproaching`, `onMention`)
  - `DomainEventDeps` 인터페이스 — `createNotification` + `publishEvent` 주입 (테스트 친화적)
  - `buildDomainEventDeps(prisma, bus)` — 실제 의존성 합성 헬퍼
- 결정/가정:
  - emit-and-forget — `realtimeBus.publish` 가 비동기 외부 채널(Redis Pub/Sub) 에 위임되는 환경에서도 호출은 동기 fire-and-forget. publish 실패가 상위로 전파되는 경우 호출자가 try/catch 책임 (테스트로 명시).
  - notification 생성과 publish 는 트랜잭션이 아님 (DB 저장 후 fan-out). 추후 outbox 패턴 도입 가능.
  - 라우트 와이어링은 후속 PR에서 (예: tasks PATCH 시 assignee 변경 감지). 본 태스크는 핸들러 레이어와 단위 테스트만 책임.
- 리스크:
  - publish 실패 시 알림은 DB 에 저장되지만 실시간 미전송 — 사용자는 새로고침/폴링에서만 확인 (수용 가능).
  - 동일 트리거 다중 발생 시 중복 노티 가능 — 추후 dedupe key 도입 여지.

## Do

> 구현 변경 사항.

- 추가 파일:
  - `src/modules/notifications/domain-events.ts` — 핸들러 3종 + 의존성 주입 인터페이스 + 합성 헬퍼
  - `src/modules/notifications/domain-events.test.ts` — 5 케이스
- 수정 파일: 없음 (라우트 와이어링은 후속 PR — 도메인 모듈에서 import)
- 추가 의존성: 없음

## Check

> 검증 결과.

- 단위 테스트: `domain-events.test.ts` 5/5 PASS
  1. onTaskAssigned → DB create + bus.publish 1회씩, href/actor 검증
  2. onIssueSlaApproaching → kind=sla, body 잔여시간 표기
  3. onMention preview 없음 → wire payload body 미포함
  4. onMention preview 있음 → body 포함
  5. publish 가 throw → 호출자에 전파 (emit-and-forget 의 명시적 동작)
- 누계: **20 파일 / 128 테스트 PASS**
- typecheck: PASS
- lint: PASS (53 files)

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - 도메인 이벤트 핸들러는 **얇은 facade + DI** 로 구성하면 단위 테스트가 prisma/bus 없이도 가능
  - wire 페이로드 직렬화는 핸들러 안에서 단일 toWire() 로 통합 — Notification 스키마와 도메인 모델의 단일 매핑
  - publish 실패 정책은 도메인별로 다를 수 있으므로 핸들러에서 throw 통과시키고 호출자가 결정 (현재는 통과)
- 메모리에 저장:
  - "도메인 이벤트 → 알림 + 실시간 fan-out 합성 패턴" → 백엔드 메모리 반영
- 후속 태스크에 영향:
  - **tasks/issues/comments 라우트**: PATCH 시 onTaskAssigned/onMention 호출 와이어링 (소규모 후속 PR)
  - **T-602 E2E**: 실제 PATCH /tasks/:id 후 SSE/WS 채널에 notification 도착 확인
- 회고: 향후 outbox 패턴 (DB transaction 안에서 outbox row insert + 별도 워커가 publish) 으로 확장 가능. 인터페이스는 그대로.
