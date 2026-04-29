# T-206 — 프로젝트-태스크-이슈 관계 무결성 (cascade + soft-delete 정책)

> Phase: 2 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 정책 코드화 + invariant 단위 테스트
> Dependencies: [T-203, T-204]

## Plan

- 목표:
  - DB-level cascade 는 Prisma `onDelete: Cascade` 가 보장 → 본 태스크는 **soft-delete 의 도메인 정책** 을 코드화.
  - 프로젝트/태스크/이슈/코멘트 가 동일 `deletedAt` 시각을 공유하여 운영자가 일괄 복구 가능하도록 한다.
- 결정/가정:
  - "삭제" 1차 시멘틱은 soft-delete; hard delete 는 운영자 전용 + Prisma cascade.
  - `updateMany` 는 cascade 트리거가 아니므로 코멘트도 명시적으로 갱신한다.
  - 트랜잭션은 호출부에서 `prisma.$transaction(async (tx) => ...)` 으로 제공.

## Do

- 추가 파일: `src/shared/integrity.ts`, `src/shared/integrity.test.ts`.
- 수정 파일: 없음(라우트 노출은 후속 PR).
- 핵심:
  - `softDeleteProject(tx, id)` — 자식 ID 목록 조회 → project/task/issue/comment 일괄 갱신, 동일 `now` 공유.
  - `softDeleteTask` / `softDeleteIssue` — 자식 코멘트만 cascade.

## Check

- 단위 테스트(5):
  1. project soft-delete 가 task/issue/comment 모두 같은 deletedAt 으로 갱신.
  2. 자식 없는 프로젝트에서는 comment.updateMany 가 호출되지 않음.
  3. softDeleteTask 가 코멘트 cascade.
  4. softDeleteIssue 가 코멘트 cascade.
  5. 모든 결과 deletedAt 이 호출 시점 이후(invariant).
- typecheck/lint: 그린.
- 누계 테스트: 85/85 PASS.

## Act

- 학습한 패턴: `updateMany` 만 사용하면 cascade 가 안 되므로 명시적 ID 수집 → 조인 테이블 갱신 패턴이 표준.
- 후속: 라우트 `DELETE /projects/:id`, `DELETE /tasks/:id`, `DELETE /issues/:id` 노출 PR.
