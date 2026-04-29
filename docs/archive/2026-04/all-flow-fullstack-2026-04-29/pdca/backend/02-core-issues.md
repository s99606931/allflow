# T-204 — issues 모듈: GET /issues (filter: status/prio) + POST /issues

> Phase: 2 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 백엔드 자체 create 가능 + frontend Issue 스키마 1:1 응답
> Dependencies: [T-105]

## Plan

- 목표: Issue 목록 조회 + 백엔드 자체 create 라우트 추가 (frontend openapi.yaml 에는 GET 만 있음).
- 범위: `GET /issues?status=&prio=` + `POST /issues` (백엔드 확장 라우트).
- 결정/가정:
  - status: API 형식 `in-progress` ↔ Prisma enum `in_progress` 매핑 표 (PRISMA_ISSUE_STATUS / API_ISSUE_STATUS).
  - 응답 `assignee`/`reporter` 는 User.name 으로 직렬화. 미배정 시 `''`.
  - `comments` 는 활성 코멘트 카운트(`_count.comments where deletedAt: null`).
  - 멤버십: `project.members.some.userId` 로 필터. POST 는 직접 `project.findFirst` 로 검증 (RBAC 데코레이터는 path param 기반이라 body.projectId 시 사용 불가).
- 리스크:
  - status 매핑 누락 시 응답이 frontend 와 다른 enum 값으로 노출 → 양방향 매핑 표로 해결.

## Do

- 추가 파일: `src/modules/issues/issues.routes.ts`, `src/modules/issues/issues.test.ts`.
- 수정 파일: `src/app.ts` (issuesRoutes 등록).
- 추가 의존성: 없음.

## Check

- 단위 테스트 (6): 필터 매핑 / 잘못된 필터 400 / 멤버 아님 403 / 프로젝트 없음 404 / 정상 201 / 입력 누락 400.
- typecheck/lint/build: 모두 그린.
- OpenAPI 컨트랙트: `IssueSchema.parse(...)` 통과.

## Act

- 학습한 패턴:
  - Prisma enum ↔ OpenAPI enum 양방향 매핑 표를 모듈 상단에 두면 변환 코드가 한 곳에 수렴.
  - body 기반 멤버십 검증은 RBAC 데코레이터가 아닌 라우트 내부에서 직접 처리 (선언적 데코레이터의 한계).
- 메모리에 저장: dash-case API enum ↔ snake_case Prisma enum 매핑 패턴.
- 후속: T-205 코멘트 서브리소스 — issue/task 양쪽에 attach 되는 polymorphic 처리에 동일 패턴 활용.
