# PDCA Plan — Task Gantt Chart

> Feature: `gantt-chart-2026-04-30` | PRD: `gantt-chart-2026-04-30.prd.md`
> Owner: PL (av-do-orchestrator) | Status: planned | bkit:pdca v2.0.8
> 작성: 2026-04-30 | 평균 사이클 match_rate 목표: ≥ 0.95

## 0. 한 줄 요약

ALL-Flow 에 **포트폴리오 간트차트(`/gantt`)** 를 도입한다. Prisma `Task` 에
`startDate`/`endDate`/`kind`/`progress` 필드와 신규 `TaskDependency` 모델을 추가하고,
`GET /api/v1/gantt` 엔드포인트 + zero-dep 자체 구현 `GanttChart` 컴포넌트로
드래그 일정 수정 / FS·SS·FF 의존성 / 마일스톤 다이아몬드 / 담당자 부하 뷰를 제공한다.
3-phase PR 분리로 진행한다.

## 1. 목표 및 성공 기준

| ID | 목표 | 측정 방법 | 임계값 |
|----|------|----------|-------:|
| G1 | 포트폴리오 간트 화면 가동 | `/gantt` Playwright PASS | 100% |
| G2 | 드래그 기반 일정 수정 BE 반영 | E2E + DB row 검증 | 100% |
| G3 | 의존성 4종 + 사이클 감지 | Vitest BE 단위 + Playwright | 100% |
| G4 | 마일스톤 + 데드라인 시각화 | gstack screenshot 회귀 | drift 없음 |
| G5 | 담당자 부하 뷰 + 충돌 카운트 | Playwright | 100% |
| G6 | 회귀 0건 (기존 모듈) | BE 295/295 + FE 71/71 + Playwright 59/62 | PASS |
| G7 | bkit:gap-detector match_rate | 자동 측정 | ≥ 0.95 |
| G8 | OpenAPI SOR 동기화 | `pnpm openapi:check` | 0 error |
| G9 | 성능 (500 태스크 렌더) | Playwright + performance.now() | < 800ms |

## 2. 화면 목록 (Frontend Routes)

| 라우트 | 컴포넌트 | Phase |
|--------|---------|------:|
| `/gantt` (포트폴리오) | `app/(authenticated)/gantt/page.tsx` | 1 |
| `/gantt?view=assignee` | 동일 페이지 + view 파라미터 | 3 |
| `/gantt?projectId=...` | 동일 페이지 + 필터 | 1 |
| `/projects/{id}` 내 "간트로 보기" 링크 | 기존 페이지 수정 | 1 |
| 사이드 네비 — "간트" 메뉴 추가 | `components/nav/...` | 1 |

## 3. BE API 설계

### 3.1 OpenAPI SOR 갱신 (`packages/contracts/openapi.yaml`)

새 태그 추가: `gantt`. 새 스키마: `GanttResponse`, `GanttTask`, `TaskDependency`, `DependencyType`, `TaskKind`.

**신규 엔드포인트**

```yaml
/gantt:
  get:
    tags: [gantt]
    summary: 포트폴리오 간트 조회 (cross-project)
    parameters:
      - { name: projectId, in: query, schema: { type: string } }
      - { name: assigneeId, in: query, schema: { type: string } }
      - { name: from, in: query, schema: { type: string, format: date } }
      - { name: to,   in: query, schema: { type: string, format: date } }
    responses:
      '200':
        description: OK
        content:
          application/json:
            schema: { $ref: '#/components/schemas/GanttResponse' }

/gantt/by-assignee:
  get:
    tags: [gantt]
    summary: 담당자 그룹 + 충돌 카운트
    responses:
      '200':
        description: OK
        content:
          application/json:
            schema: { $ref: '#/components/schemas/GanttByAssignee' }

/tasks/{id}/dependencies:
  parameters:
    - { name: id, in: path, required: true, schema: { type: string } }
  get:
    tags: [tasks]
    summary: 단일 태스크 의존성 그래프
    responses:
      '200':
        description: OK
        content:
          application/json:
            schema:
              type: object
              properties:
                predecessors: { type: array, items: { $ref: '#/components/schemas/TaskDependency' } }
                successors:   { type: array, items: { $ref: '#/components/schemas/TaskDependency' } }
  post:
    tags: [tasks]
    summary: 의존성 생성 (사이클 검증)
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [successorId, type]
            properties:
              successorId: { type: string }
              type:        { $ref: '#/components/schemas/DependencyType' }
              lagDays:     { type: integer, default: 0 }
    responses:
      '201': { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/TaskDependency' } } } }
      '422': { description: Cycle or schedule violation }

/tasks/{id}/dependencies/{depId}:
  parameters:
    - { name: id,    in: path, required: true, schema: { type: string } }
    - { name: depId, in: path, required: true, schema: { type: string } }
  delete:
    tags: [tasks]
    summary: 의존성 제거
    responses: { '204': { description: No Content } }
```

**기존 `/tasks/{id}` PATCH 확장** — Task schema 에 다음 추가:

```yaml
startDate:    { type: string, format: date, nullable: true }
endDate:      { type: string, format: date, nullable: true }
parentTaskId: { type: string, nullable: true }
kind:         { $ref: '#/components/schemas/TaskKind' }
progress:     { type: integer, minimum: 0, maximum: 100, default: 0 }
```

### 3.2 BE 라우트 모듈 (`apps/backend/src/modules/gantt/`)

```
modules/gantt/
  ├─ gantt.routes.ts          (Fastify 라우트 등록)
  ├─ gantt.service.ts         (조회 + 충돌 계산 + 사이클 감지)
  ├─ gantt.repo.ts            (Prisma 쿼리 캡슐화)
  ├─ dependency-cycle.ts      (DFS visiting-set 알고리즘)
  └─ __tests__/
       ├─ gantt.service.test.ts
       ├─ dependency-cycle.test.ts
       └─ gantt.integration.test.ts
```

**핵심 알고리즘 — 사이클 감지**

```typescript
// dependency-cycle.ts
async function wouldCreateCycle(
  predecessorId: string,
  successorId: string,
  prisma: PrismaClient,
): Promise<boolean> {
  // successorId 부터 시작해서 DFS 로 predecessorId 까지 도달 가능하면 사이클
  const visited = new Set<string>();
  const stack = [successorId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const next = await prisma.taskDependency.findMany({
      where: { predecessorId: current },
      select: { successorId: true },
    });
    for (const dep of next) stack.push(dep.successorId);
  }
  return false;
}
```

### 3.3 Frontend → Backend wiring

- `apps/frontend/lib/api/gantt.ts` — `useGantt`, `useGanttByAssignee`, `useUpdateTaskSchedule`, `useCreateDependency`, `useDeleteDependency` (TanStack Query)
- 기존 `lib/api/tasks.ts` 의 `useUpdateTask` 에 startDate/endDate/kind/progress 필드 통합 (분리하지 않음)
- `lib/types.ts` 는 `pnpm openapi:gen` 으로 자동 생성

## 4. FE 컴포넌트 설계

### 4.1 디렉토리

```
apps/frontend/
  ├─ app/(authenticated)/gantt/
  │    └─ page.tsx                          (서버 컴포넌트, 메타데이터)
  ├─ components/gantt/
  │    ├─ gantt-page.tsx                    (클라이언트 컨테이너)
  │    ├─ gantt-toolbar.tsx                 (zoom/view/filter)
  │    ├─ gantt-chart.tsx                   (메인 캔버스, CSS Grid + SVG)
  │    ├─ gantt-time-axis.tsx               (sticky header, day/week/month)
  │    ├─ gantt-rows.tsx                    (그룹 + row 가상 스크롤 prep)
  │    ├─ gantt-bar.tsx                     (개별 막대, draggable)
  │    ├─ gantt-bar-handle.tsx              (좌/우/중앙 핸들 + cursor)
  │    ├─ gantt-milestone.tsx               (◆ 마커)
  │    ├─ gantt-dependency-layer.tsx        (SVG overlay, FS/SS/FF/SF 화살표)
  │    ├─ gantt-detail-drawer.tsx           (막대 클릭 drawer)
  │    ├─ gantt-conflict-badge.tsx          (담당자 뷰 충돌 배지)
  │    ├─ hooks/use-gantt-zoom.ts           (D/W/M 축척)
  │    ├─ hooks/use-gantt-drag.ts           (pointer events 기반 드래그)
  │    ├─ hooks/use-gantt-dependency-draw.ts (선 그리기 인터랙션)
  │    └─ utils/
  │         ├─ date-axis.ts                 (타임라인 → x 좌표 매핑)
  │         ├─ schedule-validate.ts         (FS 위반 클라이언트 체크 — UX 힌트만)
  │         └─ conflict-detect.ts           (담당자 행 안 막대 겹침)
  └─ tests/e2e/
       ├─ gantt-basic.spec.ts               (Phase 1)
       ├─ gantt-dependencies.spec.ts        (Phase 2)
       └─ gantt-resource.spec.ts            (Phase 3)
```

### 4.2 라이브러리 결정

**자체 구현 (zero-dep) 우선** — 학습 메모 [`learning_pdca_2026_04_29_complete.md`](Zero-dep / contentEditable+sanitize / TipTap→대체 6 종결 패턴) 와 일관.

- 타임라인: CSS Grid (`grid-template-columns: repeat(N, minmax(40px, 1fr))`) + position:absolute 막대
- 막대 드래그: HTML5 Pointer Events (`onPointerDown/Move/Up`) — dnd-kit 등 외부 의존성 회피
- 의존성 화살표: SVG `<path>` (cubic bezier) + foreignObject 없이 순수 좌표 계산
- 가상 스크롤: 500 task 가 임계 — 임계치 도달 시에만 react-virtualized 도입 (Phase 1 에서는 미도입)
- 날짜 계산: 기존 `date-fns` 4.x 재사용 (이미 의존성에 존재)

**라이브러리 회피 이유**: dhtmlx-gantt(상용 라이선스 위험), react-gantt-task(번들 사이즈 ~150KB),
gantt-task-react(드래그 UX 부족). 회피 결정은 5대 축 "효율" 축에 기여.

### 4.3 핵심 인터랙션 명세

| 동작 | 핸들러 | API 호출 |
|------|--------|----------|
| 막대 좌측 핸들 드래그 | `useGanttDrag('left')` | `useUpdateTask({startDate})` (debounce 200ms) |
| 막대 우측 핸들 드래그 | `useGanttDrag('right')` | `useUpdateTask({endDate})` |
| 막대 중앙 드래그 | `useGanttDrag('move')` | `useUpdateTask({startDate, endDate})` (시프트) |
| 막대 우측 → 다른 막대 좌측 선 그리기 | `useGanttDependencyDraw` | `useCreateDependency({type:'FS'})` |
| 막대 클릭 | drawer 오픈 | (없음, 로컬 상태) |
| 줌 D/W/M | `useGanttZoom` | (없음, x 좌표 재계산) |
| 뷰 토글 | URL search param (`?view=`) | `useGanttByAssignee` 호출 |
| 키보드 — Tab/←/→ | 막대 포커스 + 1일 단위 이동 | `useUpdateTask` |

### 4.4 상태 관리

- TanStack Query: 서버 상태 (gantt 데이터, 의존성)
- React state: UI 상태 (zoom, view, selection, drawer)
- URL search params: zoom/view/projectId/from/to (deep link 지원)
- `useOptimisticUpdate`: 드래그 중 즉시 반영 → 실패 시 rollback

## 5. 데이터 모델 변경

### 5.1 Prisma migration (`apps/backend/prisma/migrations/<ts>_gantt/migration.sql`)

```sql
-- TaskKind / DependencyType enum
CREATE TYPE "TaskKind" AS ENUM ('task', 'milestone', 'summary');
CREATE TYPE "DependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- Task 컬럼 추가
ALTER TABLE "tasks"
  ADD COLUMN "start_date"      DATE,
  ADD COLUMN "end_date"        DATE,
  ADD COLUMN "parent_task_id"  TEXT,
  ADD COLUMN "kind"            "TaskKind" NOT NULL DEFAULT 'task',
  ADD COLUMN "progress"        INTEGER    NOT NULL DEFAULT 0;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_parent_task_fkey"
      FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL;

CREATE INDEX "tasks_start_end_idx"  ON "tasks"("start_date", "end_date");
CREATE INDEX "tasks_parent_idx"     ON "tasks"("parent_task_id");

-- TaskDependency 테이블
CREATE TABLE "task_dependencies" (
  "id"              TEXT PRIMARY KEY,
  "predecessor_id"  TEXT NOT NULL,
  "successor_id"    TEXT NOT NULL,
  "type"            "DependencyType" NOT NULL DEFAULT 'FS',
  "lag_days"        INTEGER NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "task_dep_pred_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "task_dep_succ_fkey" FOREIGN KEY ("successor_id")   REFERENCES "tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "task_dep_unique"    UNIQUE ("predecessor_id", "successor_id")
);

CREATE INDEX "task_dep_pred_idx" ON "task_dependencies"("predecessor_id");
CREATE INDEX "task_dep_succ_idx" ON "task_dependencies"("successor_id");
```

### 5.2 Seed 데이터 갱신 (`apps/backend/prisma/seed.ts`)

기존 시드 태스크 일부에 startDate/endDate 백필 + 마일스톤 1~2개 + 의존성 3~5건 추가.
이를 통해 dev 환경에서 `/gantt` 진입 즉시 시각적 확인 가능.

## 6. 구현 단계 (Phasing)

### Phase 1 — 기본 막대 표시 (MVP) [브랜치: `feature/gantt-phase1`]

**범위**
- Prisma 마이그레이션 (TaskKind, startDate/endDate/parentTaskId/kind/progress)
- OpenAPI 스키마 갱신 (Task 확장 + GanttResponse + TaskKind)
- BE: `GET /api/v1/gantt`, `PATCH /tasks/{id}` 확장
- FE: `/gantt` 라우트, `GanttChart` (zoom + 드래그 + 마일스톤)
- 사이드 네비 "간트" 메뉴 추가
- Playwright `gantt-basic.spec.ts`
- Seed 갱신

**산출 게이트**
- BE Vitest: 신규 모듈 단위 + 통합 PASS
- FE Vitest: 컴포넌트 단위 PASS
- `pnpm openapi:check` 0 error
- Playwright 59/62 → 60/63 (1건 추가) PASS
- bkit:gap-detector match_rate ≥ 0.95
- bkit:code-analyzer ≥ 95/100

**예상 LOC**: BE ~600 / FE ~900 / migration ~30

### Phase 2 — 의존성 [브랜치: `feature/gantt-phase2`]

**범위**
- Prisma 마이그레이션 (TaskDependency + DependencyType)
- OpenAPI: `/tasks/{id}/dependencies` GET/POST/DELETE
- BE: 사이클 감지 알고리즘 + FS 위반 검증 + 422 응답
- FE: `GanttDependencyLayer` SVG + 드래그 연결 UI + 토스트
- Playwright `gantt-dependencies.spec.ts`

**산출 게이트** — Phase 1 과 동일.

**예상 LOC**: BE ~400 / FE ~600 / migration ~30

### Phase 3 — 리소스 부하 [브랜치: `feature/gantt-phase3`]

**범위**
- BE: `GET /gantt/by-assignee` + 충돌 계산
- FE: 뷰 토글 (Project/Assignee) + `GanttConflictBadge` + 드롭다운
- Playwright `gantt-resource.spec.ts`

**산출 게이트** — Phase 1 과 동일.

**예상 LOC**: BE ~250 / FE ~400

## 7. 회귀 매트릭스

| 모듈 | 기존 통과율 | Phase 후 임계 | 검증 명령 |
|------|------------|--------------|----------|
| BE Vitest | 295/295 | 295/295 + 신규 (≥30) | `pnpm --filter backend test` |
| FE Vitest | 71/71 | 71/71 + 신규 (≥15) | `pnpm --filter frontend test` |
| Playwright | 59/62 | 59/62 + 신규 (3) | `pnpm --filter frontend e2e` |
| OpenAPI lint | 0 error | 0 error | `pnpm openapi:check` |
| Type check | 0 error | 0 error | `pnpm -r typecheck` |
| Lint (Biome+ESLint) | 0 error | 0 error | `pnpm -r lint` |
| bkit:gap-detector | ≥ 0.95 | ≥ 0.95 | (자동) |
| bkit:code-analyzer | 100/100 | ≥ 95/100 | (자동) |

## 8. PR 분리 전략

- 각 Phase = 1 PR (3 PR 총합).
- DCO signoff 필수 (`git commit -s`).
- 각 PR 본문에 회귀 매트릭스 + bkit 점수 + Playwright 추가 케이스 명시.
- main 직접 push 금지, dev 브랜치 통과 후 머지.
- 사이드 네비 메뉴 변경은 Phase 1 PR 에 포함 → `tests/e2e/routes.spec.ts` 동일 PR 에서 갱신.

## 9. 위험·롤백 전략

| 위험 | 트리거 | 롤백 |
|------|--------|------|
| 마이그레이션 후 기존 칸반 회귀 | BE Vitest 실패 | `prisma migrate reset` + 마이그레이션 수정 후 재시도 |
| Playwright e2e routes drift | sidebar 메뉴 영향 | 동일 PR 에서 routes.spec.ts 갱신 |
| 사이클 감지 성능 (대규모 그래프) | 의존성 1000+ | 결과 캐시 + indexed lookup 으로 대응 |
| Zero-dep 드래그 UX 부족 | UAT 부정적 피드백 | Phase 4(별도 PDCA) 에서 dnd-kit 도입 |
| 모바일 드래그 conflict | 터치 이벤트 충돌 | 모바일은 read-only 강제 (PRD F4) |

## 10. 학습 보존 계획

다음 패턴을 본 사이클 종결 시 `learning_gantt_chart_2026_04_30.md` 로 보존:

1. CSS Grid + SVG overlay 기반 zero-dep 간트 패턴
2. Pointer Events 기반 드래그 핸들 + debounce PATCH
3. DFS visiting-set 사이클 감지 알고리즘 (BE)
4. Prisma 자기참조 관계 (parentTaskId) + N:M 의존성 (TaskDependency)
5. OpenAPI nullable date 필드 도입 시 frontend 타입 흐름
6. URL search params 기반 deep link 패턴 (zoom/view/projectId)
7. 마일스톤(◆) + 데드라인 가이드라인 SVG 렌더 패턴

## 11. 일정 (Estimate)

| Phase | 예상 dev-day | 예상 PR 시점 |
|-------|-------------:|-------------|
| Phase 1 (MVP) | 4 d | 2026-05-04 |
| Phase 2 (Dependency) | 3 d | 2026-05-07 |
| Phase 3 (Resource) | 2 d | 2026-05-09 |

> 일정은 1인 dev 기준, 병렬 에이전트 팀 스폰 시 절반 단축 가능.
> PM 승인 후 PL이 Agent Team 스폰 (Lead + BE + FE + QA + Memory).

## 12. 참조

- PRD: `docs/02-design/features/gantt-chart-2026-04-30.prd.md`
- Prisma 스키마: `apps/backend/prisma/schema.prisma`
- OpenAPI SOR: `packages/contracts/openapi.yaml`
- 가장 최근 사이클 학습: `learning_monorepo_microservices_2026_04_30_complete.md`
- 회귀 baseline: `learning_prod_readiness_2026_04_30.md` (62/62 E2E)
- 파일 명명 규칙 / DCO / 단일 호스트 dev 패턴: `MEMORY.md` (auto-loaded)
