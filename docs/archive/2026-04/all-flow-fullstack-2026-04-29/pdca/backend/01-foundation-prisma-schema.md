# T-101 — Prisma 6 schema: User/Project/Task/Issue/Report/Notification/Comment

> Phase: 1 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: prisma migrate dev + prisma studio로 7개 테이블 확인
> Dependencies: [T-004]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: `project/all-flow-frontend/openapi.yaml`을 단일 진실 원본으로 삼아 백엔드 영속 레이어를 정의한다. Phase 1 이후 모든 도메인 모듈은 이 스키마를 기반으로 작성된다.
- 범위:
  - `prisma/schema.prisma` — 7개 핵심 엔티티 + ProjectMember 조인 테이블 + 8개 enum
  - `src/plugins/prisma.ts` — 싱글턴 PrismaClient + Fastify 플러그인
  - `src/config/env.ts` — `DATABASE_URL` 검증 추가 (postgres:// 스킴 강제)
  - `prisma/migrations/20260428151443_init/` — 초기 마이그레이션
  - `package.json` — `prisma`, `@prisma/client`, `fastify-plugin` 의존성 추가
- 결정/가정:
  - **DB**: PostgreSQL 16 (T-004 docker-compose 호환). `provider = "postgresql"`.
  - **Prisma 버전**: 6.19.3 (Prisma 7은 메이저 업그레이드 가이드 별도 — 후속 작업으로 분리).
  - **ID 전략**: CUID (frontend가 opaque string id를 기대).
  - **Soft Delete**: `deletedAt DateTime?` 필드를 가진 도메인(User/Project/Task/Issue/Comment)에서 제공. Notification/Report는 hard delete.
  - **Cascade 정책**:
    - Project 삭제 → ProjectMember/Task/Issue/Comment 모두 cascade
    - User 삭제 → assignee/reporter는 SetNull (역사적 데이터 보존), Comment/Notification은 cascade (개인 데이터)
  - **OpenAPI 매핑**:
    - `Task.due` 는 OpenAPI에서 free-form string ("오늘", "5/2", "내일") 이므로 `String?`. 추후 정규화 시 마이그레이션 추가.
    - `Issue.created/sla` 는 human-readable string. `created_at`은 별도 timestamp 컬럼.
    - `Issue.comments / linked` 는 OpenAPI에서 `integer` (카운트). 실제 row 카운트는 T-205에서 트리거/뷰 처리.
    - `Report.kpis / sections` 는 JSON 배열로 직렬화 (`Json` 타입).
  - **Enum 매핑**: OpenAPI `IssueStatus`의 `"in-progress"` / `"in-review"` 는 Prisma 식별자 제약상 `in_progress @map("in-progress")` 형태로 표현.
  - **인덱스**: 자주 쓸 쿼리 패턴 기준 (projectId+status, assigneeId, deletedAt, userId+read 등) 우선 추가. 부하 데이터 확보 후 EXPLAIN으로 재조정 예정.
- 리스크:
  - JSON 컬럼 `Report.kpis/sections` 는 타입 안전성이 약함 → T-404/T-405 구현 시 zod 스키마로 경계 검증 필수.
  - `Task.due` 가 비구조화 문자열 → 캘린더/SLA 계산 시 정확도 한계. 후속 태스크에서 `due_date Date?` 컬럼 추가 검토.

## Do

> 구현 변경 사항.

- 추가 파일:
  - `prisma/schema.prisma` (211 lines) — 7 엔티티 + ProjectMember + 8 enum
  - `prisma/migrations/20260428151443_init/migration.sql` — Prisma가 자동 생성한 초기 DDL
  - `src/plugins/prisma.ts` — `getPrisma()` 싱글턴 + `prismaPlugin` Fastify 플러그인 + onClose 훅
  - `docs/pdca/01-foundation-prisma-schema.md` (본 문서)
- 수정 파일:
  - `src/config/env.ts` — `DATABASE_URL` 검증 추가 (postgres:// 스킴, 빈 문자열 거부)
  - `src/config/env.test.ts` — DB URL 검증 케이스 2개 추가 (8 케이스 / 8 PASS)
  - `package.json` — `prisma@^6.19.3` (devDep), `@prisma/client@^6.19.3`, `fastify-plugin@^5.1.0`
- 추가 의존성: prisma, @prisma/client, fastify-plugin
- 핵심 코드 스냅샷:

```prisma
// prisma/schema.prisma 발췌
enum IssueStatus {
  open
  in_progress  @map("in-progress")  // OpenAPI 호환
  in_review    @map("in-review")
  resolved
}

model Project {
  id        String    @id @default(cuid())
  code      String    @unique
  status    StatusKey @default(doing)
  members   ProjectMember[]
  tasks     Task[]
  issues    Issue[]
  deletedAt DateTime? @map("deleted_at")
  @@index([status])
  @@index([deletedAt])
}
```

```typescript
// src/plugins/prisma.ts (요약)
let cached: PrismaClient | null = null;
export function getPrisma(): PrismaClient {
  if (cached) return cached;
  cached = new PrismaClient({ log: ['warn', 'error'] });
  return cached;
}
```

## Check

> 검증 결과.

- 단위 테스트: `pnpm test` → **8/8 PASS** (env 6 + DATABASE_URL 2)
- 통합 테스트: 추후 T-503 testcontainers에서 검증
- OpenAPI 컨트랙트 검증: T-601 단계 (drift 0 자동 비교)
- 수동 검증:
  - `docker compose up -d` (POSTGRES_PORT=15432) → postgres+redis healthy
  - `DATABASE_URL=postgresql://allflow:allflow@localhost:15432/allflow pnpm exec prisma migrate dev --name init --skip-seed` → 마이그레이션 적용 성공
  - `docker exec allflow-postgres psql -U allflow -d allflow -c "\dt"` → 8개 테이블 확인 (users / projects / project_members / tasks / issues / comments / reports / notifications + _prisma_migrations)
  - `pnpm typecheck` 그린, `pnpm lint` (biome) 그린
- 메트릭/로그 확인: PrismaClient log 레벨이 production은 `warn|error`만 노출 — 정보성 쿼리 로그 누출 방지.

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - **OpenAPI ↔ Prisma 매핑** 시 enum 식별자 제약 → `@map`으로 케밥 케이스 보존
  - **싱글턴 PrismaClient** + Fastify 플러그인 + `onClose` 훅 = 프로세스/테스트/HMR 안전
  - **Soft delete + Cascade 혼용**: 도메인 데이터는 soft delete, 종속/개인 데이터는 cascade로 일관성 유지
- 메모리에 저장: `프로젝트별 OpenAPI yaml ↔ Prisma schema 동기화 책임을 T-102가 이어받도록 위임`. JSON 컬럼은 항상 zod 경계 검증 짝지어 사용.
- 후속 태스크에 영향:
  - **T-102**: openapi.yaml → Zod 스키마 자동 생성 + drift check. JSON 컬럼(Report)에 zod 스키마 적용.
  - **T-103**: `AUTH_SECRET` 검증을 env loader에 추가 (현재 패턴 그대로 확장).
  - **T-105**: ProjectMember.role (owner/admin/member)을 RBAC 가드의 단일 진실 원본으로 사용.
  - **T-106**: 시드 스크립트는 fixtures.ts의 5 users / 5 projects / 6 tasks / 8 issues 기반 + 추가 데이터 보강하여 acceptance(5+/8/30+) 충족.
- 회고: Prisma 7 GA가 출시됐지만 6 → 7 마이그레이션 가이드는 별도 작업이 필요해 6.19.x로 고정. 의존성 안정화 후 별도 태스크로 업그레이드 검토.
