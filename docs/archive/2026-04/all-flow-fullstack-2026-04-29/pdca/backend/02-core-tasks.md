# T-203 — tasks 모듈: GET/POST /tasks + PATCH /tasks/:id

> Phase: 2 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: openapi `Task` 스키마 1:1 응답 + `projectId`/`assigneeId`/`status` 필터 동작 + RBAC
> Dependencies: [T-202]

## Plan

- 목표: 3개 라우트 구현 + 멤버십 기반 RBAC + frontend 컨트랙트(`proj`/`assignee` 이름 응답) 충족.
- 범위:
  - `GET /tasks` — 인증 사용자 멤버십 프로젝트 한정, `projectId`/`assigneeId`/`status` 필터.
  - `POST /tasks` — `projectId` 또는 `proj`(이름)으로 대상 프로젝트 식별. 멤버 검증 후 생성.
  - `PATCH /tasks/:id` — 해당 태스크 프로젝트 멤버 검증 후 부분 수정.
- 결정/가정:
  - 컨트랙트는 이름 기반(`proj`/`assignee`)이지만 ID 우회 입력도 받는다 → AI/봇 통합 시 안정.
  - `Task.due` 는 free-form 문자열(예: "오늘", "5/2"). null → 빈 문자열로 직렬화.
  - 200건 페이지 하드 캡(`take: 200`) — 무한 스크롤은 후속 태스크.
- 리스크:
  - assignee 이름이 동명이인일 가능성 → 첫 매칭 사용. 향후 `assigneeId` 우선 권장.

## Do

- 추가 파일: `src/modules/tasks/tasks.routes.ts`, `src/modules/tasks/tasks.test.ts`.
- 수정 파일: `src/app.ts` (tasksRoutes 등록).
- 추가 의존성: 없음.
- 핵심:
  - `members: { some: { userId } }` 로 목록 단계에서 RBAC 일괄 처리.
  - `resolveProjectMembership` 헬퍼: `projectId` XOR `proj` 입력 정규화 + 멤버 한 줄 조회.
  - `resolveAssigneeId` 헬퍼: `assigneeId` 우선, 없으면 이름으로 첫 매칭.

## Check

- 단위 테스트 (7): 목록/생성(201)/멤버 아님(403)/projectId 누락(400)/PATCH 상태변경/PATCH 권한(403)/PATCH 404.
- typecheck/lint: 모두 그린.
- OpenAPI 컨트랙트: `TaskSchema.parse` 응답 통과로 보장.

## Act

- 학습한 패턴:
  - 도메인 라우트가 `proj` 이름과 `projectId` 둘 다 받도록 두면 frontend 호환 + AI/봇 친화.
  - Prisma `where: { project: { members: { some } } }` 로 N+1 없이 RBAC 적용.
- 메모리에 저장: 컨트랙트 이름-필드와 백엔드 ID-필드의 양방향 입력 정규화 패턴.
- 후속: T-205(comments) 도 같은 패턴 — projectId 추론 후 멤버 검증.
