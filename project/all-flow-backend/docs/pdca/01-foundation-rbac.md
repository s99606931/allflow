# T-105 — RBAC 가드 (Owner/Admin/Member) + project-level membership 검증

> Phase: 1 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 권한 매트릭스 단위 테스트 그린
> Dependencies: [T-103]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: 프로젝트 단위 RBAC 를 단일 진실 원본으로 정의하고, 라우트가 `app.requireRole(['owner','admin'])` 한 줄로 보호되도록 한다. 권한 매트릭스는 단위 테스트로 회귀 차단.
- 범위:
  - `src/plugins/rbac.ts` — 정적 매트릭스 + `app.requireMembership` / `app.requireRole` 데코레이터
  - `src/plugins/rbac.test.ts` — 6 케이스 (단조성 / 매트릭스 정확성 포함)
- 결정/가정:
  - **Role 위계**: `owner > admin > member` (Prisma `MemberRole` enum 일치).
  - **PERMISSION_MATRIX**: 14 액션 × 3 role을 dot-notation 문자열 키로 정의 (`project.read`, `task.delete` 등).
  - **단조성 정책**: 더 높은 role 은 낮은 role 의 권한을 모두 가진다 (단위 테스트로 검증).
  - **데이터 검증은 prisma 의존**: `requireMembership` 이 ProjectMember 를 조회해서 `req.membership` 에 주입.
  - **plugin dependencies**: `dependencies: ['prisma']` 로 prismaPlugin 선등록 강제 — 누락 시 fastify-plugin 이 부팅 시점에 실패.
- 리스크:
  - 정적 매트릭스만으로는 동적 정책(예: 자기 태스크는 항상 수정 가능) 표현 한계 → 도메인 라우트(T-203/T-204)에서 추가 검사.
  - 권한 변경은 매트릭스 + 데코레이터 사용 라우트 동시 수정 필요 → PR 리뷰 체크리스트에 추가 권장.

## Do

> 구현 변경 사항.

- 추가 파일:
  - `src/plugins/rbac.ts` — 매트릭스 + 두 데코레이터
  - `src/plugins/rbac.test.ts` — 6 단위 테스트
  - `docs/pdca/01-foundation-rbac.md` (본 문서)
- 수정 파일: 없음
- 추가 의존성: 없음 (fastify-plugin 기존 사용)
- 핵심 코드 스냅샷:

```typescript
// src/plugins/rbac.ts (요약)
export const PERMISSION_MATRIX = {
  'project.read': ['owner', 'admin', 'member'],
  'project.update': ['owner', 'admin'],
  'project.delete': ['owner'],
  // ... 14 actions ...
} as const satisfies Record<string, ProjectRole[]>;

app.decorate('requireRole', (roles, projectIdParam = 'id') => async (req) => {
  const m = await app.prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user!.id } },
  });
  if (!m) throw new ForbiddenError('프로젝트 멤버가 아닙니다');
  if (!roles.includes(m.role)) throw new ForbiddenError(`이 작업은 ${roles.join('/')} 권한이 필요합니다`);
  req.membership = { projectId, userId: req.user!.id, role: m.role };
});
```

## Check

> 검증 결과.

- 단위 테스트: `pnpm test` → **34/34 PASS** (env 8 + schemas 8 + error-handler 6 + auth 6 + rbac 6)
  - `hasAtLeast` 위계 검증
  - owner: 14/14 권한 모두 보유
  - admin: project.delete / member.remove 만 거부
  - member: 7/14 (read + task/issue create/update) 만 허용
  - **정책 단조성**: 어떤 액션이라도 role 상위로 갈수록 거부 발생 안 함 (회귀 차단)
  - dot-notation 키 검증
- 통합 테스트: T-503 testcontainers에서 실 ProjectMember 조회 + 라우트 가드 검증 예정
- OpenAPI 컨트랙트 검증: 해당 없음 (RBAC 은 운영 정책)
- 수동 검증: `pnpm typecheck` 그린, `pnpm lint` 그린
- 메트릭/로그 확인: 권한 거부는 4xx → `logger.warn` (T-104 정책)

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - **정적 매트릭스 + 동적 검증 분리**: 정책은 컴파일 타임에 잡고, 멤버십은 DB 조회. 두 단계가 단위 테스트와 통합 테스트로 자연스럽게 나뉨.
  - **단조성 검사**: role 상위로 갈수록 권한이 줄어들면 안 된다는 invariant 를 단위 테스트로 못박아 향후 매트릭스 수정 시 회귀 자동 탐지.
  - **fastify-plugin dependencies 필드**: prisma 선등록을 부팅 시점에 강제 → 의존 순서 버그 사전 차단.
- 메모리에 저장: `프로젝트 단위 권한은 PERMISSION_MATRIX 단일 출처에 정의 + isPermitted(role, action) 로 도메인 코드에서 사용. 데코레이터 + 매트릭스 일관성 유지`. role enum 변경 시 ORDER 가중치도 동기화.
- 후속 태스크에 영향:
  - **T-202 projects 라우트**: `requireMembership('id')` (GET) / `requireRole(['owner','admin'], 'id')` (PATCH)
  - **T-203 tasks**: 라우트별 `requireMembership` + 자기 자원(assignee == req.user.id) 체크 추가
  - **T-204 issues**: 동일
  - **T-503 통합 테스트**: 시드 데이터(8 프로젝트, 21 멤버십)로 권한 매트릭스 실 시뮬레이션
- 회고: 매트릭스를 OpenAPI extension(`x-permissions`) 으로 표현하는 옵션도 고려했으나, 백엔드에서 단일 출처를 유지하는 편이 유지보수가 단순. 향후 frontend RBAC 가드와의 동기화는 codegen 으로 별도 검토.
