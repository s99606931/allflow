# T-205 — comments 서브리소스 (task/issue 공통)

> Phase: 2 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: task/issue 양쪽 코멘트 추가/조회 + 멤버십 RBAC + Issue.comments 카운트 정합
> Dependencies: [T-204]

## Plan

- 목표: 4개 라우트(`GET/POST /tasks/:id/comments`, `GET/POST /issues/:id/comments`).
- 결정/가정:
  - 코멘트 본문은 4000자 캡(z.string().max(4000)).
  - 응답은 backend-internal 컨트랙트(`{ id, body, author: {id, name}, createdAt }`).
  - frontend 의 `Issue.comments` / `Task.comments` 카운트는 도메인 모듈의 `_count.comments` 가
    이미 deletedAt 필터를 포함 → 본 모듈은 단방향 추가/조회만 담당.
- 리스크:
  - 다중 알림: 코멘트 작성 시 멘션 알림 → 후속 T-305 에서 처리.

## Do

- 추가 파일: `src/modules/comments/comments.routes.ts`, `src/modules/comments/comments.test.ts`.
- 수정 파일: `src/app.ts` (commentsRoutes 등록).
- 추가 의존성: 없음.
- 핵심:
  - `MembershipParent` 가드 헬퍼 한 곳에서 task/issue 멤버십 검증.
  - `targetKind` 자동 부여(`task` | `issue`) 로 컬럼 무결성 보장.

## Check

- 단위 테스트(6): GET task 200 / GET task 403 / POST task 201 / POST issue 201 / POST 빈 본문 400 / POST issue 404.
- typecheck/lint: 그린.

## Act

- 학습한 패턴: `select: { project: { select: { members: { where } } } }` 패턴이 task/issue 양쪽에서 1쿼리 RBAC 검증을 가능케 함.
- 후속: 멘션 파싱 → notification 자동 생성(T-305).
