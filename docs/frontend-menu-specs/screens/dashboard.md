# 대시보드 (Dashboard)

> 경로: `/` | 파일: `src/components/screens/dashboard.tsx`  
> E2E: `tests/e2e/menus/dashboard.spec.ts`

## 개요

로그인 후 첫 화면. 내 태스크, 프로젝트 현황, 이슈 요약, 빠른 액션 위젯으로 구성.

## 기능 목록

### 1. 대시보드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 내 태스크 위젯 | 오늘 마감/진행 중 태스크 목록 표시 | ✅ | 🔗 GET /tasks?assignee=me | 🧪 use-data.test.tsx |
| 프로젝트 진행률 위젯 | 활성 프로젝트 진행률 바 표시 | ✅ | 🔗 GET /projects | 🧪 use-data.test.tsx |
| 이슈 요약 위젯 | 우선순위별 이슈 수 요약 | ✅ | 🔗 GET /issues | 🧪 use-data.test.tsx |
| 최근 활동 위젯 | 팀 최근 활동 피드 | ✅ | 🔗 GET /audit-log | 🧪 menus/dashboard.spec.ts |
| 캘린더 미니뷰 | 오늘~이번 주 일정 미리보기 | ✅ | 🔗 GET /events | 🧪 menus/dashboard.spec.ts |
| 결재 대기 위젯 | 내가 처리해야 할 결재 건수 표시 | ✅ | 🔗 GET /approvals?status=pending | 🧪 menus/dashboard.spec.ts |

### 2. 빠른 생성

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 생성 버튼 | TaskCreateDialog 오픈 | ✅ | 🔗 POST /tasks | 🧪 menus-crud.spec.ts |
| 태스크 상세 드롭다운 | 태스크 클릭 → TaskDetailDialog 오픈 | ✅ | 🔗 GET /tasks/:id | 🧪 tasks.routes.test.ts |

### 3. 태스크 상세 다이얼로그 (TaskDetailDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 정보 표시 | 제목·설명·담당자·마감일·상태 표시 | ✅ | 🔗 GET /tasks/:id | 🧪 tasks.routes.test.ts |
| 태스크 편집 | 제목·설명·상태·담당자·마감일 수정 | ✅ | 🔗 PATCH /tasks/:id | 🧪 |
| 태스크 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /tasks/:id | 🧪 |
| 댓글 목록 | 댓글 스레드 표시 | ✅ | 🔗 GET /comments?taskId= | 🧪 comments.routes.test.ts |
| 댓글 작성 | 댓글 입력 + 전송 | ✅ | 🔗 POST /comments | 🧪 |

### 4. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 대시보드 컨텍스트 힌트 | 오늘 할 일·마감 임박 태스크 기반 힌트 | ✅ | 🔌 (실데이터 조건 분기) | 🧪 menus/dashboard.spec.ts |

### 4-1. AI 플로우 인사이트 + 병목 감지 (FlowInsightsPanel · 9차 PDCA 신규)

> 파일: `apps/frontend/src/components/ai/flow-insights-panel.tsx` (162 LOC)
> 집계 모듈: `apps/backend/src/modules/business-flows/insights.ts` (178 LOC, 순수 함수 + AI 프롬프트 빌더 + 결정적 fallback)
> 배치: 대시보드 메트릭 행 직후, `FlowProgressSummary` (5차 PDCA 위젯) 바로 위에 수직 컴팩트로 통합.
> 기본 분석 대상 플로우: `project-lifecycle`. (props.flowId 로 다른 5개 표준 플로우 지정 가능)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 단계별 평균 체류일 표시 | `(now - stepStartedAt)` 평균을 단계 카드별로 소수 1자리 표기 | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts (9 단위) · business-flows.routes.test.ts (5 통합) · flow-insights-panel.test.tsx (5 RTL) |
| 단계별 오버듀 비율 | `dwellDays > step.expectedDays` 인 멤버 비율(0..1, 100% 환산 표기). expectedDays 없으면 0. | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts |
| 단계별 멤버 수 | 현재 그 단계에 머물고 있는 활성 사용자 수 (deletedAt:null) | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts |
| 병목 단계 강조 (red ring + AlertTriangle) | (overdueRatio desc, avgDwellDays desc) 1순위. 멤버 0이면 `bottleneckStepId=null` (강조 없음) | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts (정렬 결정성) · flow-insights-panel.test.tsx |
| AI 한국어 2문장 설명 박스 (Sparkles) | (1) 병목 현황 요약, (2) 매니저 권장 액션. AI 호출 실패 시 결정적 fallback 문장(`buildFallbackExplanation`) 사용 — 위젯 항상 렌더 보장 | ✅ | 🔗 GET /business-flows/:id/insights (라우트 내부 try/catch + adapter.complete) | 🧪 insights.test.ts (프롬프트 빌더 + fallback) · business-flows.routes.test.ts |
| silent fallback (loading/error) | `isLoading` 시 Loader2 스피너만 표시, `error || data===null` 이면 위젯 비표시 (대시보드 회귀 차단) | ✅ | 🔌 (TanStack Query) | 🧪 flow-insights-panel.test.tsx |

#### 인사이트 데이터 형상

```ts
interface FlowInsight {
  flowId: string;
  totalMembers: number;          // 활성 사용자 기준
  steps: FlowInsightStep[];      // flow.steps 와 1:1 정렬
  bottleneckStepId: string | null;
  aiExplanation: string;         // 한국어 2문장
}

interface FlowInsightStep {
  stepId: string;
  label: string;
  memberCount: number;
  avgDwellDays: number;          // 소수 1자리
  overdueRatio: number;          // 0..1 (소수 2자리)
  isBottleneck: boolean;
}
```

#### 백엔드 정책 (insights.ts)

- `aggregateFlowInsight(flow, rows, activeUserIds, now=new Date())` — 순수 함수, 시간 주입으로 결정적 단위 테스트 보장
- `buildInsightPrompt(flow, insight)` — system/user 메시지 빌더 (`maxTokens:200, temperature:0.3`)
- `buildFallbackExplanation(flow, insight)` — adapter 미등록/실패/빈 응답 시 정량 정보 기반 한국어 2문장 fallback
- soft-deleted 사용자 제외 → 통계 노이즈 차단

### 5. 비즈니스 플로우 스테퍼 (BusinessFlowStepper)

> 초급/기존 사용자가 현재 화면이 전체 비즈니스 프로세스 중 어디에 위치하는지
> 시각적으로 이해하고, AI 다음 단계 제안으로 다음 액션을 받는 컴포넌트.

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 플로우 단계 도식화 | 5개 표준 플로우(project/task/approval/issue/report)의 단계를 칩(chip) 형태로 표시 | ✅ | 🔗 GET /business-flows | 🧪 business-flows.routes.test.ts (7/7) |
| 현재 단계 강조 | 화면별 도메인 신호(상태/카운트)로 currentStepId 추론 (`data-current="true"` + ring) | ✅ | — | 🧪 business-flow-stepper.test.tsx |
| 단계 클릭 → 라우팅 (딥링크) | 각 step의 `screen`으로 `onStepSelect→router.push` 이동 | ✅ | — | 🧪 business-flow-stepper.test.tsx (onStepSelect) |
| AI 다음 단계 제안 | 현재 단계 + 화면 systemContext + currentStep aiHint를 enriched context로 묶어 AI에 1요청 | ✅ | 🔗 POST /business-flows/:id/suggest | 🧪 business-flows.routes.test.ts |
| **AI 플로우 인사이트 (9차 PDCA 신규)** | 단일 플로우의 단계별 평균 체류일/오버듀 비율/병목 + AI 한국어 2문장. 4-1 섹션의 `FlowInsightsPanel` 로 노출 | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts (9) · flow-insights-panel.test.tsx (5) · business-flows.routes.test.ts (+5) |
| 다음 단계 바로가기 | AI 응답에서 nextStep 제안 → 클릭 시 동일 `onStepSelect` 핸들러로 화면 이동 | ✅ | — | 🧪 business-flow-stepper.test.tsx |
| **진행률 바 (UX 강화 2026-05-03)** | currentIdx/totalSteps 비율을 0.5px 바 + `· {pct}%` 텍스트로 표시. 접혀도 항상 노출 | ✅ | — | 🧪 business-flow-stepper.test.tsx (progress) |
| **체크마크 (UX 강화 2026-05-03)** | past 단계는 `CheckCircle2` + `data-completed="true"` accent 컬러로 명시 | ✅ | — | 🧪 business-flow-stepper.test.tsx (data-completed) |
| **collapse / expand (UX 강화 2026-05-03)** | 헤더 ChevronUp/Down 토글 + `localStorage av:bf-stepper:collapsed:{flowId}` flow별 독립 저장 → 새 마운트 시 복원 | ✅ | — | 🧪 business-flow-stepper.test.tsx (collapse + restore) |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 위젯 커스터마이징 | 표시할 위젯 선택·순서 변경 | 중 |
| 위젯 새로고침 버튼 | 개별 위젯 수동 새로고침 | 낮음 |
| 대시보드 E2E 심층 테스트 | 위젯 데이터 정합성 검증 | 중 |

## 테스트 실행 결과 (2026-05-04 · 9차 PDCA — Flow Insights Panel + AI 병목 감지)
- BE vitest: **687/687 PASS** (8차 대비 +14: insights.test.ts 9 단위 + business-flows.routes.test.ts +5 통합)
- FE vitest: **210/210 PASS** (8차 대비 +5: flow-insights-panel.test.tsx 5 RTL)
- 9차 신규 산출물:
  - BE — `apps/backend/src/modules/business-flows/insights.ts` (순수 집계 + AI 프롬프트 빌더 + fallback)
  - BE — `GET /business-flows/:id/insights` 엔드포인트 (활성 사용자 필터 + try/catch fallback)
  - FE — `apps/frontend/src/components/ai/flow-insights-panel.tsx` (단계 카드 + AI 박스, dashboard.tsx 통합)
  - FE — `api.getBusinessFlowInsights` + `FlowInsight`/`FlowInsightStep` 타입 노출 (`apps/frontend/src/lib/api/extended.ts`)
- 커밋: `1400ea7`
