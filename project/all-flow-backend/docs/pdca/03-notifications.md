# T-304 — notifications 모듈

> Phase: 3 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: GET /notifications?unread + 미읽음/읽음 토글
> Dependencies: [T-303]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: 프런트엔드 topbar/notifications 위젯이 사용할 알림 REST 엔드포인트를 제공.
- 범위:
  - `GET /notifications?unread=true|false` — 본인 알림 목록 (createdAt desc, max 100)
  - `POST /notifications/:id/read` — 단건 읽음 (멱등) — 본인 소유 검증
  - `POST /notifications/read-all` — 본인 미읽음 일괄 읽음 (멱등)
- 결정/가정:
  - 읽음 토글은 단방향(unread→read). 읽음→미읽음 복귀는 도메인 요구 없음.
  - PATCH 대신 POST `/read` 액션 엔드포인트 채택 — 멱등성 + 의도 명확성.
  - 페이징 미지원 (max 100). 추후 cursor 기반 확장 여지.
  - frontend openapi 는 GET 만 정의 → POST 액션은 backend 확장. T-601 OpenAPI drift 검사는 GET 만 본다.
- 리스크:
  - 알림 폭증 시 100개 제한이 부족할 수 있음 → 추후 since 파라미터로 보강
  - read-all 은 트랜잭션 내 단일 updateMany — 큰 사용자(수만 알림)는 timeout 가능 (현재는 미스코프)

## Do

> 구현 변경 사항.

- 추가 파일:
  - `src/modules/notifications/notifications.routes.ts` (3 엔드포인트)
  - `src/modules/notifications/notifications.test.ts` (6 케이스)
- 수정 파일:
  - `src/app.ts` — `notificationsRoutes` 등록
- 추가 의존성: 없음

## Check

> 검증 결과.

- 단위 테스트: `notifications.test.ts` 6/6 PASS
  - 401 (no auth)
  - GET 기본 (where.userId, take=100, OpenAPI Notification 직렬화)
  - GET unread=true → where.read=false
  - POST :id/read 본인 소유 X → 404
  - POST :id/read 정상 → read=true 반영
  - POST read-all → updateMany.where { userId, read:false }, count 반환
- 누계: **19 파일 / 123 테스트 PASS**
- typecheck: PASS
- lint: PASS (51 files)

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - 액션 엔드포인트(`POST /:id/read`)가 PATCH 부분 갱신보다 의도/멱등성에서 깔끔
  - prisma mock 캡처는 `let captured: T | null` 보다 `const box: { captured?: T } = {}` 가 narrowing 안전
- 메모리에 저장:
  - notifications 도메인의 본인 소유 검증 패턴 → memory-keeper
- 후속 태스크에 영향:
  - **T-305**: 도메인 이벤트 핸들러가 `prisma.notification.create()` + `realtimeBus.publish()` 동시 수행
  - **T-602**: frontend topbar 가 USE_MOCK=false 로 본 엔드포인트 호출
- 회고: 멱등성 우선. 추후 SSE/WS publish 와의 자동 연결은 T-305 에서 도메인 이벤트로 묶음.
