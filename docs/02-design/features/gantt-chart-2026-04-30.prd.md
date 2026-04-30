# PRD — Task Gantt Chart (태스크 간트차트)

> Feature: `gantt-chart-2026-04-30` | Owner: PM (av-pm-coordinator) | Status: in-review
> 작성: 2026-04-30 | bkit:pdca v2.0.8 | PRD Template

## 1. 요약 (Executive Summary)

ALL-Flow 의 태스크는 현재 **칸반 보드(컬럼: todo/doing/review/done/blocked)** 만 존재하여
일정·의존성·리소스 분배가 시각화되지 않는다. 본 기능은 **cross-project 포트폴리오 간트차트**
를 도입하여 PM·팀 리드가 단일 화면에서 팀 전체 모든 프로젝트의 일정 현황을 즉시 파악하고,
의존성·마일스톤·담당자 부하를 함께 관리할 수 있게 한다.

## 2. 배경 (Pain Point)

| # | Pain Point | 현재 상태 | 영향 |
|---|------------|----------|------|
| P1 | 태스크 일정 시각화 부재 | `Task.due` 가 "오늘"/"5/2" 같은 free-form string. 시작일 개념 없음 | 일정 계획 불가 |
| P2 | 의존성 관리 불가 | 데이터 모델에 `dependencies` 필드 자체 부재 | 선후 관계 추적 불가 |
| P3 | 마일스톤·데드라인 시각화 | Project.due 만 존재하나 화면에 노출 약함 | 중요 시점 누락 |
| P4 | 리소스 부하 미가시 | `Task.assigneeId` 만 존재. 시간축에 매핑 안 됨 | 한 사람에게 과부하 누적 |
| P5 | 단일 프로젝트 시야 | 칸반은 프로젝트 단위. 포트폴리오 시야 부재 | 팀 전체 충돌 미식별 |

## 3. 목표 (Goals)

| 축 | 목표 | 측정 |
|----|------|------|
| **G1** | 태스크 시작일~마감일 막대 시각화 | `/gantt` 라우트에서 모든 태스크가 시간축에 표시 |
| **G2** | 드래그 기반 일정 수정 | 막대 좌우 끝/중앙 드래그로 startDate/endDate PATCH, 200ms 이내 응답 |
| **G3** | 의존성 연결선 + 순환 방지 | FS/SS/FF 3종 + 사이클 감지 시 422 응답 |
| **G4** | 마일스톤 다이아몬드 표시 | `Task.kind = milestone` 표시 + 데드라인 강조 |
| **G5** | 리소스 부하 뷰 | 담당자별 그룹 + 동일 시간대 N개 이상 충돌 시 시각 경고 |
| **G6** | 포트폴리오 뷰 | 프로젝트 색상 구분 + cross-project 일정 한 화면 |
| **G7** | 회귀 0건 | 칸반/태스크 API 기존 사용처 (FE 71/71 + BE 295/295) PASS 유지 |

### Non-Goals (이번 사이클 제외)

- 자동 일정 최적화·AI 제안 (미래 사이클)
- 외부 캘린더(Google/Outlook) 동기화
- 용량 계획(Capacity Planning) 정량 산출
- 모바일 전용 간트 인터랙션 (read-only는 반응형 지원)

## 4. 사용자 시나리오

### S1 — 팀 리드의 월간 계획 점검
> 팀 리드가 매주 월요일 `/gantt` 에 진입한다. 6개 프로젝트의 모든 in-flight 태스크가
> 시간축에 표시되고, 다음 2주 안에 끝나야 할 태스크 13개가 색으로 강조된다.
> "지난주에 미뤘던 BE-R5 막대를 잡고 +3일 드래그" → 자동으로 PATCH 전송, 의존된
> FE-W1 막대가 함께 +3일 시프트 (FS 의존성).

### S2 — 의존성 추가
> PL이 새 태스크 "DB 마이그레이션 검증" 을 만들고, 기존 "DB 마이그레이션 실행" 막대 끝에서
> 새 태스크 시작점으로 선을 연결한다. UI 상에서 FS(Finish-Start) 화살표가 그려지고
> 백엔드는 사이클 검사를 통과한 뒤 저장한다. 시작점이 의존하는 태스크 종료일 이전이면
> 422 에러 + 인라인 토스트.

### S3 — 리소스 부하 확인
> "사람별 보기" 토글 → 담당자 11명 행으로 그룹핑. 김PL 행에 4월 30일 한 시점에
> 막대 4개가 겹쳐 있는 것을 발견 → 빨간 배지 "4 conflicts". 클릭하면 드롭다운으로
> 4개 태스크 리스트 + 빠른 재할당 액션.

### S4 — 마일스톤 강조
> Project.due 와 별도로, "베타 출시 D-day" 같은 중요 시점을 마일스톤 태스크로 등록 →
> 다이아몬드(◆) 마커 + 빨간 점선 수직 가이드라인이 시간축에 그려져 모든 태스크가
> 마일스톤 대비 위치를 한눈에 비교 가능.

## 5. 기능 요구사항 (Functional Requirements)

### F1. 데이터 모델 — Prisma `Task` 확장

```prisma
model Task {
  // ... (기존 필드 유지)

  // [GANTT] 신규 필드
  startDate     DateTime?     @db.Date  @map("start_date")
  endDate       DateTime?     @db.Date  @map("end_date")
  parentTaskId  String?       @map("parent_task_id")  // 서브태스크/그룹화
  kind          TaskKind      @default(task)         // task | milestone | summary
  progress      Int           @default(0)             // 0~100 진척률

  // 의존성 (양방향 관계)
  predecessors  TaskDependency[] @relation("Successor")
  successors    TaskDependency[] @relation("Predecessor")

  parent        Task?  @relation("TaskHierarchy", fields: [parentTaskId], references: [id], onDelete: SetNull)
  children      Task[] @relation("TaskHierarchy")

  @@index([startDate, endDate])
  @@index([parentTaskId])
}

model TaskDependency {
  id              String          @id @default(cuid())
  predecessorId   String          @map("predecessor_id")
  successorId     String          @map("successor_id")
  type            DependencyType  @default(FS)
  lagDays         Int             @default(0) @map("lag_days")  // 선후 관계 + 지연(±N일)

  createdAt       DateTime        @default(now()) @map("created_at")

  predecessor Task @relation("Predecessor", fields: [predecessorId], references: [id], onDelete: Cascade)
  successor   Task @relation("Successor",   fields: [successorId],   references: [id], onDelete: Cascade)

  @@unique([predecessorId, successorId])
  @@index([predecessorId])
  @@index([successorId])
  @@map("task_dependencies")
}

enum TaskKind {
  task
  milestone
  summary
}

enum DependencyType {
  FS  // Finish-to-Start (가장 일반)
  SS  // Start-to-Start
  FF  // Finish-to-Finish
  SF  // Start-to-Finish (드물지만 표준)
}
```

> **호환성**: 기존 `Task.due` (free-form string) 는 그대로 유지. `startDate`/`endDate` 는 nullable
> 도입으로 기존 칸반 동작에 영향 없음. 마이그레이션 시 `due` → 휴리스틱으로 `endDate` 백필 (선택).

### F2. 백엔드 API — `/api/v1/gantt` + Task 확장

| Method | Path | 설명 | Phase |
|--------|------|------|------:|
| GET    | `/gantt`                            | 포트폴리오 간트 조회 (cross-project, 모든 in-flight task) | 1 |
| GET    | `/gantt?projectId=...&from=...&to=...` | 필터 (프로젝트/기간) | 1 |
| GET    | `/gantt/by-assignee`                | 담당자별 그룹 + 충돌 카운트 | 3 |
| PATCH  | `/tasks/{id}`                       | `startDate`/`endDate`/`progress`/`kind` 추가 (기존 확장) | 1 |
| POST   | `/tasks/{id}/dependencies`          | 의존성 생성 — 사이클·역시간 검증 | 2 |
| DELETE | `/tasks/{id}/dependencies/{depId}`  | 의존성 제거 | 2 |
| GET    | `/tasks/{id}/dependencies`          | 단일 태스크의 선후 관계 그래프 | 2 |

**GET /gantt 응답 예시**

```jsonc
{
  "range": { "from": "2026-04-01", "to": "2026-06-30" },
  "tasks": [
    {
      "id": "task_abc",
      "title": "BE 마이그레이션 실행",
      "kind": "task",
      "projectId": "proj_alpha",
      "projectColor": "#FF6B6B",
      "assigneeId": "user_1",
      "startDate": "2026-04-30",
      "endDate":   "2026-05-03",
      "progress":  40,
      "status":    "doing",
      "priority":  "high"
    },
    {
      "id": "task_def",
      "title": "베타 출시",
      "kind": "milestone",
      "endDate": "2026-05-15"
    }
  ],
  "dependencies": [
    { "id": "dep_1", "predecessorId": "task_abc", "successorId": "task_xyz", "type": "FS", "lagDays": 0 }
  ]
}
```

**검증 규칙**
- `startDate <= endDate` (경계 검증)
- 의존성 사이클 감지: DFS + visiting set, 사이클 발견 시 `422 dependency_cycle`
- FS 타입에서 `successor.startDate < predecessor.endDate + lagDays` 면 `422 schedule_violation`
- 마일스톤(`kind=milestone`)은 `startDate` 무시, `endDate` 만 사용

### F3. 프론트엔드 — `/gantt` 라우트 + 컴포넌트

**라우트**
- `app/(authenticated)/gantt/page.tsx` — 메인 페이지
- 사이드 네비게이션 메뉴 추가: "간트" (Calendar 아이콘 사용)

**컴포넌트 트리**
```
GanttPage
  ├─ GanttToolbar          (zoom: day/week/month, view: project/assignee, filter)
  ├─ GanttChart
  │    ├─ GanttTimeAxis    (시간축 헤더, sticky)
  │    ├─ GanttRows
  │    │    └─ GanttRow     (프로젝트 또는 담당자 그룹)
  │    │         └─ GanttBar      (태스크 막대, draggable)
  │    │              └─ GanttBarHandle (좌/우/중앙 핸들)
  │    └─ GanttDependencyLayer (SVG overlay, 화살표)
  └─ GanttDetailDrawer     (막대 클릭 시 우측 드로어)
```

**라이브러리 결정**
- **자체 구현 (zero-dep)**: 기존 학습([Zero-dep 패턴](`learning_pdca_2026_04_29_complete.md`))과 일관.
  CSS Grid + SVG overlay + dnd-kit (이미 의존성?) 활용.
- React-Gantt-task / dhtmlx-gantt 등 외부 라이브러리는 **Phase 2 옵션**으로 보류.
- 우선 zero-dep MVP → 성능/UX 부족 시 라이브러리 도입을 별도 PDCA로.

**핵심 인터랙션**
| 동작 | 결과 |
|------|------|
| 막대 좌측 핸들 드래그 | startDate 변경 → 200ms debounce → PATCH |
| 막대 우측 핸들 드래그 | endDate 변경 → 동일 |
| 막대 중앙 드래그 | 길이 유지 시프트 → start+end PATCH |
| 막대 우측 끝 → 다른 막대 좌측 끝으로 선 그리기 | FS 의존성 생성 |
| 막대 클릭 | 우측 드로어 — title/assignee/progress/status 편집 |
| 줌 토글 (D/W/M) | 시간축 축척 변경, 막대 width 비례 조정 |
| 뷰 토글 (Project/Assignee) | row 그룹핑 키 전환 |

### F4. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 성능 | 500 태스크 + 300 의존성 렌더링 < 800ms (CPU 4x throttle 기준) |
| 접근성 | 키보드만으로 막대 이동·의존성 추가 가능, ARIA role=region+grid |
| 반응형 | 모바일은 read-only (드래그 차단), 데스크탑만 풀 인터랙션 |
| 회귀 | BE 295/295 + FE 71/71 + Playwright 59/62 PASS 유지 |
| 보안 | 의존성 사이클·역시간 검증은 BE 강제 (FE는 UX 힌트만) |
| 다국어 | i18n 키 추가, ko/en 동시 지원 |

## 6. 화면 목록 (Information Architecture)

| 라우트 | 설명 | Phase |
|--------|------|------:|
| `/gantt` | 포트폴리오 간트 (모든 프로젝트, 프로젝트별 그룹) | 1 |
| `/gantt?view=assignee` | 담당자별 부하 뷰 | 3 |
| `/gantt?projectId=...` | 단일 프로젝트 간트 (drill-down) | 1 |
| `/projects/{id}` | 프로젝트 상세에 "간트로 보기" 링크 추가 | 1 |
| 사이드 네비 | "간트" 메뉴 항목 추가 | 1 |

## 7. 단계별 구현 (Phasing)

### Phase 1 — 기본 막대 표시 (MVP)
- Prisma `Task` 에 `startDate`/`endDate`/`kind`/`progress` 추가 + 마이그레이션
- `GET /api/v1/gantt` (cross-project) + `PATCH /tasks/{id}` 확장
- `/gantt` 라우트 + `GanttChart` (drag for start/end + zoom)
- 마일스톤 다이아몬드 표시 + Project 색상 매핑

### Phase 2 — 의존성
- `TaskDependency` 모델 + 4 종(FS/SS/FF/SF) + 사이클 감지
- `POST/DELETE /tasks/{id}/dependencies` API
- `GanttDependencyLayer` SVG 화살표 + 드래그 연결 인터랙션
- FS 의존성 위반 시 인라인 422 토스트

### Phase 3 — 리소스 부하
- `GET /gantt/by-assignee` (충돌 카운트 포함)
- 뷰 토글 (Project/Assignee) UI
- 충돌 빨간 배지 + 클릭 시 드롭다운

> 각 Phase 끝에 **bkit:gap-detector + Playwright 회귀** 게이트 통과 필수. Phase 2/3은 별도 PR.

## 8. 성공 기준 (Acceptance Criteria)

| AC | 기준 | 검증 |
|----|------|------|
| AC1 | `/gantt` 진입 시 모든 in-flight task 시간축 표시 | Playwright `tests/e2e/gantt-basic.spec.ts` |
| AC2 | 막대 드래그로 startDate 변경 → BE 반영 → 새로고침 후 유지 | Playwright + DB 검증 |
| AC3 | 의존성 사이클 시도 시 422 응답 + 토스트 | Vitest BE 단위 + Playwright UI |
| AC4 | 마일스톤 다이아몬드 + 수직 가이드라인 표시 | 시각 회귀 (gstack screenshot) |
| AC5 | 담당자 뷰에서 충돌 4건 → 빨간 배지 "4" 표시 | Playwright |
| AC6 | 500 태스크 렌더링 < 800ms | Playwright + performance.now() |
| AC7 | 기존 칸반/태스크 동작 회귀 0건 | BE 295/295 + FE 71/71 + Playwright 59/62 PASS |
| AC8 | bkit:gap-detector match_rate ≥ 0.95 | bkit 자동 측정 |

## 9. 의존성 / 위험

| # | 항목 | 영향 | 대응 |
|---|------|------|------|
| D1 | 기존 `Task.due` (free-form string) 와 신규 `endDate` (Date) 이중 필드 | UX 혼란 가능 | `endDate` 가 있으면 우선, 없으면 `due` 표시. 단계적 deprecate. |
| D2 | 마이그레이션 시 기존 task 의 startDate 부재 | nullable 로 도입, 빈 값 허용 | Phase 1 한정 — UI 에서 "일정 미정" 빈 슬롯 표시 |
| D3 | 의존성 그래프 사이클 감지 비용 | task 수 증가 시 O(V+E) | 의존성 추가 시점에만 검사, 결과 캐시 |
| D4 | dnd-kit 등 드래그 라이브러리 의존성 도입 | 번들 크기 증가 | 우선 native HTML5 drag API + pointer events 자체 구현. 부족 시 Phase 2 |
| D5 | 사이드 네비 메뉴 변경 → 기존 e2e route 테스트 영향 | `tests/e2e/routes.spec.ts` 갱신 필요 | Plan 에 명시, Phase 1 PR 에 포함 |

## 10. 5대 축 매핑 (av 평가 프레임)

| 축 | 본 PRD 기여 |
|----|------------|
| 효율 | 토큰 0 영향. zero-dep 우선으로 번들 영향 최소화 |
| 자기진화 | 학습 산출 — Gantt 인터랙션 패턴(드래그 핸들 / SVG overlay / 사이클 감지) memory 보존 |
| PDCA | gap-detector + Playwright 게이트 자동 적용. Phase 별 PR 분리로 측정 단위 명확 |
| 생명주기 | 신규 라우트·API·DB 모델 동시 도입 — 마이그레이션→인덱스→API→UI 순 단방향 흐름 |
| 외부통합 | OpenAPI SOR(`packages/contracts/openapi.yaml`) 갱신 필수 — Step 3 패턴 준수 |

## 11. 참조

- 데이터 모델: `apps/backend/prisma/schema.prisma` (Task)
- OpenAPI SOR: `packages/contracts/openapi.yaml`
- 칸반 레퍼런스: `apps/frontend/app/(authenticated)/projects` 하위
- 회귀 매트릭스: `learning_monorepo_microservices_2026_04_30_complete.md`
- 학습 메모: `learning_fe_be_wiring_2026_04_30_complete.md`, `learning_single_port_localhost_2026_04_30.md`
