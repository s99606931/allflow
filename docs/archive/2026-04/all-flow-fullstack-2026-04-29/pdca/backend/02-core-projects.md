# T-202 — projects 모듈: GET/POST /projects + GET/PATCH /projects/:id

> Phase: 2 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: frontend openapi.yaml `Project` 스키마와 1:1 일치 + RBAC 적용
> Dependencies: [T-105]

## Plan

- 목표: 4개 라우트 구현 + 멤버십/역할 RBAC 적용.
- 범위:
  - `GET /projects` — 인증 사용자 멤버십 프로젝트 목록 (`status`, `q` 필터)
  - `POST /projects` — 본인을 owner 로 등록한 신규 프로젝트 생성
  - `GET /projects/:id` — 멤버십 필수
  - `PATCH /projects/:id` — owner/admin 만
- 결정/가정:
  - tasks 집계는 Prisma `_count` + 별도 `groupBy(status='done')` 로 N+1 회피.
  - `Project.due` 는 `Date` → `YYYY-MM-DD` 로 직렬화 (frontend 컨트랙트).
  - `code` 중복(P2002) → `ConflictError` 매핑.
  - `ProjectPatch` 는 OpenAPI 에 `color` 필드 없음 → 코드도 제외.
- 리스크:
  - `Project.due` nullable 처리: openapi 는 `format: date` 필수처럼 보이지만 실제 sample 은 null 허용 → 직렬화 로직에서 null 그대로 통과.

## Do

- 추가 파일: `src/modules/projects/projects.routes.ts`, `src/modules/projects/projects.test.ts`.
- 수정 파일: `src/app.ts` (projectsRoutes 등록).
- 추가 의존성: 없음.
- 핵심:
  - `findMany` 에서 `members.some.userId` 로 멤버십 필터.
  - `groupDoneTasks` 헬퍼로 N+1 방지.
  - RBAC: T-105 의 `app.requireMembership('id')` / `app.requireRole(['owner','admin'], 'id')` 재사용.

## Check

- 단위 테스트 (6): 목록 + 본인 owner 등록 + 409 중복 + 멤버십 없으면 403 + member PATCH 403 + admin PATCH 200.
- typecheck/lint/build: 모두 그린.
- OpenAPI 컨트랙트: `ProjectSchema.parse(...)` 응답 통과로 보장.

## Act

- 학습한 패턴:
  - Prisma `_count.where` 절은 비활성 레코드(deletedAt) 필터링까지 한 쿼리로 처리 가능.
  - RBAC 가 이미 추상화되어 있어 도메인 라우트는 1줄 preHandler 로 권한 적용.
- 메모리에 저장: 도메인 라우트의 RBAC 적용 표준 패턴.
- 후속: T-203(tasks), T-205(comments) 도 같은 패턴 — `groupBy` + `_count` + RBAC preHandler.
