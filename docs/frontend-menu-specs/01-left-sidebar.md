# 좌측 사이드바 (Left Sidebar)

> 파일: `src/components/shell/sidebar.tsx` | 설정: `src/lib/nav.ts`

## 개요

AllFlow의 주 내비게이션 영역. 5개 섹션, 22개 메뉴 항목으로 구성.

## 공통 기능

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 사이드바 접힘/펼침 | ChevronsLeft/Right 버튼으로 토글. 아이콘 전용 → 레이블 표시 전환 | ✅ | 🔌 (zustand persist) | 🧪 ui-store.test.ts ✅ (2026-05-03) |
| 너비 조절 | 우측 엣지 드래그로 사이드바 너비 조절 (최소 64px, 최대 480px) | ✅ | 🔌 (zustand persist) | 🧪 use-resize-drag.test.tsx ✅ (2026-05-03) |
| 워크스페이스 스위처 | 상단에 워크스페이스명·멤버수·플랜 표시. 드롭다운 준비 중 | ⚠️ | 🔌 | ⬜ |
| 검색 바 | 펼친 상태에서 클릭 시 커맨드 팔레트(⌘K) 오픈 | ✅ | 🔗 (semantic search) | 🧪 search.service.test.ts |
| 빠른 생성 메뉴 | + 버튼 → 태스크/이벤트/문서/이슈 생성 팝오버 | ✅ | 🔗 (POST 각 엔드포인트) | 🧪 menus-crud.spec.ts |
| 내비게이션 카운트 뱃지 | 프로젝트·태스크·이슈·결재·고객사·알림 수 실시간 표시 | ✅ | 🔗 GET /nav-counts | 🧪 nav.test.ts ✅ (2026-05-03) |
| 비즈니스 플로우 스테퍼 | 9개 사이드바 화면(대시보드/프로젝트/태스크/이슈/간트/결재/문서/주간/월간 보고)에 단계 칩 + AI 다음단계 제안. UX 강화(2026-05-03): **진행률 바 / 체크마크 / collapse(localStorage flow별 독립) / 단계 딥링크(`onStepSelect→router.push`)** · **6차 PDCA: 단계완료 toast / 오버듀(amber) 경고 / 온보딩 오버레이** · **7차 PDCA: a11y(`role=navigation` + `aria-label` + `aria-current="step"` + `aria-describedby` 툴팁) / 키보드 네비게이션(←/→/↑/↓/Home/End) / focus-visible 링 / 완주 축하(sonner toast.success + CSS keyframes confetti, prefers-reduced-motion 존중, localStorage 영구 1회 가드)** · **9차 PDCA: AI 플로우 인사이트 + 병목 감지(FlowInsightsPanel) — 대시보드 메트릭 행 직후 노출** · **10차 PDCA: 알림 센터 연동 — overdue 자동 알림 + AI 제안 옵션 저장 + 헤더 amber Bell 배지** · **11차 PDCA(최종 완결, 커밋 `30ec17b`): Playwright E2E 회귀 가드 6 시나리오(business-flow-stepper.spec.ts) — 칩렌더링/진행률/collapse/키보드/AI제안/Bell배지** | ✅ | 🔗 GET /business-flows · POST /business-flows/:id/suggest (`saveToNotifications?` 10차) · GET /business-flows/progress · GET /business-flows/:id/progress · PATCH /business-flows/:id/progress (4차, **10차에서 overdue 자동 알림 사이드 이펙트**) · GET /business-flows/team-progress (5차) · `stepStartedAt` 응답 (6차) · **GET /business-flows/:id/insights (9차)** | 🧪 business-flows.routes.test.ts (33/33, 9차 +5 / 10차 +5) · business-flow-stepper.test.tsx (24/24, 7차 +11) · business-flow-onboarding.test.tsx (5/5) · use-business-flow-progress.test.tsx (4/4) · flow-progress-summary.test.tsx (5/5) · insights.test.ts (9/9, 9차 신규) · flow-insights-panel.test.tsx (5/5, 9차 신규) · use-flow-alerts.test.tsx (4/4, 10차 신규) · **business-flow-stepper.spec.ts E2E 6/6 (11차 최종 완결, 22.5s, retries=0)** ✅ (2026-05-04) |
| 비즈니스 플로우 진행 상태 서버 동기화 | **4차 PDCA**: localStorage → 서버사이드 영속화. `useBusinessFlowProgress(flowId, fallbackCurrentStepId, { enabled })` 훅으로 `currentStepId` 변경 시 멱등 PATCH. **5차 PDCA**: `enableServerSync=true` 가 9개 사이드바 화면(dashboard/projects/tasks/issues/gantt/approvals/docs/report-weekly/report-monthly) **전체에 롤아웃**. **6차 PDCA**: `stepStartedAt` 컬럼 추가 — `currentStepId` 가 실제로 바뀔 때만 갱신, 같은 단계 내 멱등 PATCH는 보존. | ✅ | 🔗 GET/PATCH /business-flows/:id/progress | 🧪 use-business-flow-progress.test.tsx (4/4) ✅ (2026-05-03) |
| 팀 진행 현황 위젯 (FlowProgressSummary) | **5차 PDCA 신규**: 대시보드 메트릭 행 직후 배치되는 팀 협업 가시성 위젯. 팀원 전체의 비즈니스 플로우 진행률을 한 화면에 집계 표시. 진행 중/완료 카테고리 분리, progressRatio 막대 + %, 빈 결과·네트워크 실패 silent fallback, `maxPerCategory` 초과분은 "+N명 더 보기". | ✅ | 🔗 GET /business-flows/team-progress | 🧪 flow-progress-summary.test.tsx (5/5) ✅ (2026-05-03) |
| AI 플로우 인사이트 + 병목 감지 (FlowInsightsPanel) | **9차 PDCA 신규**: 대시보드 메트릭 행 직후, FlowProgressSummary 바로 위에 통합. 단일 플로우(기본 `project-lifecycle`)의 단계별 평균 체류일·오버듀 비율·멤버 수를 단계 카드로 표시하고, 병목 단계(overdueRatio desc, avgDwellDays desc 1순위)는 red ring + AlertTriangle 강조. AI 한국어 2문장(병목 현황 + 권장 액션) 박스 동거. AI 실패 시 결정적 fallback 문장. error/data null 시 silent fallback. 백엔드 집계는 순수 함수(`insights.ts`) — 활성 사용자 필터(deletedAt:null) 적용. | ✅ | 🔗 GET /business-flows/:id/insights (라우트 내부 try/catch + adapter.complete + buildFallbackExplanation) | 🧪 insights.test.ts (9/9, 시간 고정 결정적) · business-flows.routes.test.ts (+5 통합) · flow-insights-panel.test.tsx (5/5 RTL) ✅ (2026-05-04) |
| 단계 완료 toast (sonner) | **6차 PDCA 신규**: BusinessFlowStepper 가 `currentStepId` 의 인덱스가 다음 인덱스로 전진했을 때 sonner `toast.success(\`다음 단계: {nextStep.label}\`)` 자동 발사 + AI 다음단계 제안 자동 트리거. | ✅ | 🔌 (FE 감지) | 🧪 business-flow-stepper.test.tsx ✅ (2026-05-03) |
| 단계 오버듀 경고 (amber) | **6차 PDCA 신규**: 현재 단계가 `flow-registry.expectedDays`(22단계 전체) 를 초과하면 단계 칩이 amber 색상 + 경고 아이콘으로 강조. 기준: `(now - stepStartedAt) > expectedDays * 86400000`. | ✅ | 🔗 (서버 `stepStartedAt` + 정의 `expectedDays`) | 🧪 business-flow-stepper.test.tsx ✅ (2026-05-03) |
| 비즈니스 플로우 온보딩 오버레이 | **6차 PDCA 신규**: 첫 방문 사용자에게 1회성 popover 안내. localStorage `av:bf-onboarding:done` 키로 중복 방지. dismissible(확인 버튼/X 버튼), non-blocking, SSR safe. 대시보드에 1회 마운트(`<BusinessFlowOnboarding anchorTestId="business-flow-stepper" />`). | ✅ | 🔌 (localStorage) | 🧪 business-flow-onboarding.test.tsx (5/5) ✅ (2026-05-03) |
| 스테퍼 a11y (ARIA) | **7차 PDCA 신규**: 컨테이너 `role="navigation"` + `aria-label="{flow.name} 단계 진행 표시"`, 단계 `<ol>` `aria-label="{flow.name} 단계 목록"`, 현재 단계 칩 `aria-current="step"`, 단계 툴팁 `role="tooltip"` (sr-only) + 단계 칩 `aria-describedby={tooltipId}`, 토글/AI/dismiss 버튼 모두 `aria-label` 부여 | ✅ | 🔌 (FE 마크업) | 🧪 business-flow-stepper.test.tsx (a11y 6건) ✅ (2026-05-03) |
| 스테퍼 키보드 네비게이션 | **7차 PDCA 신규** · **8차 PDCA에서 `useStepperKeyboard` 훅으로 분리**: 단계 칩 포커스 상태에서 ←/↑ 이전 단계, →/↓ 다음 단계, Home 첫 단계, End 마지막 단계로 DOM focus 이동 (`useCallback` 핸들러 + `data-testid="business-flow-step-{id}"` querySelector 위임). 경계 단계에서는 안전 정지. 구현 파일: `apps/frontend/src/lib/hooks/use-stepper-keyboard.ts` (8차 신규) | ✅ | 🔌 | 🧪 business-flow-stepper.test.tsx (키보드 4건) ✅ (2026-05-03) |
| focus-visible 링 | **7차 PDCA 신규**: 모든 인터랙티브 버튼(헤더 토글, 단계 칩, AI 제안 칩, dismiss)에 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` 적용 — 마우스 클릭 시 노출 없음, Tab/방향키 포커스 시에만 강조 | ✅ | 🔌 (Tailwind) | 🧪 business-flow-stepper.test.tsx ✅ (2026-05-03) |
| 플로우 완주 축하 (sonner + confetti) | **7차 PDCA 신규** · **8차 PDCA에서 `useFlowCelebration` 훅으로 분리**: 미완→완료 전이 시 1회 `toast.success("🎉 {flow.name} 완료!")` + CSS keyframes confetti(`bfConfettiBurst` / `bfCelebrateGlow` `globals.css`). `prefers-reduced-motion` 존중(애니메이션 무효화), localStorage `av:bf-stepper:completed:{flowId}` 가드로 영구 1회 발사 (8차에서 키 prefix `av:bf-stepper:completed:` 로 일관성 정리), 첫 마운트가 이미 완료면 skip(이미 본 것), 결정적 confetti seed(`flow.id` charCode 합) — Date.now 회피로 SSR 안전. 구현 파일: `apps/frontend/src/lib/hooks/use-flow-celebration.ts` (8차 신규) | ✅ | 🔌 (sonner + CSS) | 🧪 business-flow-stepper.test.tsx (완주 3건) ✅ (2026-05-03) |
| 알림 센터 연동 — overdue 자동 알림 (10차 PDCA 신규) | **10차 PDCA 신규**: PATCH `/business-flows/:id/progress` 사이드 이펙트로 단계 시작 후 `expectedDays` 초과 시 `Notification.kind=flow_overdue` 자동 생성. `(userId, flowId, currentStepId, today UTC 자정)` 기준 하루 1회 dedup. 알림 `href = step.screen` 으로 클릭 시 해당 화면 이동. `Prisma NotificationKind` enum 에 `flow_overdue` 값 추가 (마이그레이션 `20260503050000`). | ✅ | 🔗 PATCH /business-flows/:id/progress (사이드 이펙트) | 🧪 business-flows.routes.test.ts (10차 +5: 자동생성/dedup/미만은생성안함/saveToNotifications true/기본 false) ✅ (2026-05-04) |
| 알림 센터 연동 — AI 제안 저장 옵션 (10차 PDCA 신규) | **10차 PDCA 신규**: POST `/business-flows/:id/suggest` 에 `saveToNotifications?: boolean` 옵션 추가. `true` 일 때 AI 다음 단계 제안을 `Notification.kind=ai` 알림으로 저장하고 응답에 `notificationId` 포함. `href = nextStep.screen ?? currentStep.screen`. 기본값은 `false` (저장 없음). | ✅ | 🔗 POST /business-flows/:id/suggest (`saveToNotifications?: boolean` 입력 + `notificationId?: string` 응답) | 🧪 business-flows.routes.test.ts (10차) ✅ (2026-05-04) |
| 스테퍼 헤더 amber Bell 배지 (10차 PDCA 신규) | **10차 PDCA 신규**: `BusinessFlowStepper` 헤더에 미확인 `flow_overdue` 알림 수를 amber Bell + 카운트로 표시. 클릭 시 `/notifications` 이동. 알림 0건이면 비표시. 추가 네트워크 호출 0 — 기존 `useNotifications()` 결과 재사용. data-testid: `business-flow-alerts-badge`, `data-alert-count`. | ✅ | 🔗 (`useFlowAlerts(flow)` → 기존 GET /notifications 재사용) | 🧪 use-flow-alerts.test.tsx (4/4: 단계 화면 매칭 / 전체 합산 / 읽음 제외 / 다른 kind 제외) ✅ (2026-05-04) |
| `useFlowAlerts` 훅 (10차 PDCA 신규) | **10차 PDCA 신규**: `apps/frontend/src/lib/hooks/use-flow-alerts.ts` (55 LOC) — `useNotifications()` 결과에서 `kind==='flow_overdue' && !read` 필터링 + (선택) `flow.steps.map(s=>s.screen)` Set 으로 `href` 매칭 → `{ unreadCount, latest }` 메모. flow 미지정 시 전체 `flow_overdue` 카운트. **추가 네트워크 호출 0**. | ✅ | 🔗 (기존 `GET /notifications` 재사용) | 🧪 use-flow-alerts.test.tsx (4/4) ✅ (2026-05-04) |
| Contract 동기화 — `NotificationKind.flow_overdue` (10차 PDCA) | **10차 PDCA**: 4 계층 contract 일관 동기화 — `packages/contracts/openapi.yaml` (NotificationKind enum) / `apps/backend/src/shared/schemas/api.generated.ts` (zod) / `apps/frontend/src/lib/api-types.gen.ts` (TS literal union) / `apps/frontend/src/lib/schemas.ts` (FE zod). drift 0. | ✅ | 🔗 (모든 4 계층 동기화) | 🧪 schemas.test.ts (8/8) + frontend-contract.test.ts (10/10) PASS ✅ (2026-05-04) |

## 섹션 1 — 워크스페이스

| 메뉴 | 경로 | 뱃지 | 구현 | 백엔드 | 테스트 |
|------|------|------|------|--------|--------|
| 대시보드 | `/` | — | ✅ | 🔗 | 🧪 BE integration test |
| 프로젝트 | `/projects` | 프로젝트 수 | ✅ | 🔗 | 🧪 projects.routes.test.ts |
| 내 태스크 | `/tasks` | 내 태스크 수 | ✅ | 🔗 | 🧪 tasks.routes.test.ts |
| 간트차트 | `/gantt` | — | ✅ | 🔗 | 🧪 gantt.routes.test.ts |
| 이슈 관리 | `/issues` | 이슈 수 | ✅ | 🔗 | 🧪 issues.routes.test.ts |
| 결재함 | `/approvals` | 결재 대기 수 | ✅ | 🔗 | 🧪 approvals.routes.test.ts |
| 캘린더 | `/calendar` | — | ✅ | 🔗 | 🧪 events.routes.test.ts |
| 문서/위키 | `/docs` | — | ✅ | 🔗 | 🧪 docs.routes.test.ts |
| 팀 채팅 | `/chat` | — | ✅ | 🔗 | 🧪 channels.routes.test.ts |

## 섹션 2 — 영업/고객사

| 메뉴 | 경로 | 뱃지 | 구현 | 백엔드 | 테스트 |
|------|------|------|------|--------|--------|
| 진행률 관리 | `/progress` | — | ✅ | 🔗 | 🧪 projects.routes.test.ts |
| 고객사 (CRM) | `/clients` | 고객사 수 | ✅ | 🔗 | 🧪 clients.routes.test.ts |

## 섹션 3 — AI

| 메뉴 | 경로 | 뱃지 | 구현 | 백엔드 | 테스트 |
|------|------|------|------|--------|--------|
| AI 자동 등록 | `/ai-auto` | — | ✅ | 🔗 | 🧪 ai.routes.test.ts |
| Notion 연동 | `/notion` | — | ✅ | 🔗 | 🧪 notion.routes.test.ts |

## 섹션 4 — 보고

| 메뉴 | 경로 | 뱃지 | 구현 | 백엔드 | 테스트 |
|------|------|------|------|--------|--------|
| 주간 보고 | `/reports/weekly` | — | ✅ | 🔗 | 🧪 reports.routes.test.ts |
| 월간 보고 | `/reports/monthly` | — | ✅ | 🔗 | 🧪 reports.routes.test.ts |

## 섹션 5 — 관리

| 메뉴 | 경로 | 뱃지 | 구현 | 백엔드 | 테스트 |
|------|------|------|------|--------|--------|
| 조직도 | `/org` | — | ✅ | 🔗 | 🧪 org.routes.test.ts |
| 사용자 관리 | `/users` | — | ✅ | 🔗 | 🧪 identity.routes.test.ts |
| 인사/HR | `/hr` | — | ✅ | 🔗 | 🧪 hr.routes.test.ts |
| 회의실·리소스 | `/resources` | — | ✅ | 🔗 | 🧪 resources.routes.test.ts |
| 관리자 콘솔 | `/admin` | — | ✅ | 🔗 | 🧪 llm-connections.routes.test.ts |
| 알림 센터 | `/notifications` | 알림 수 | ✅ | 🔗 | 🧪 notifications.routes.test.ts |
| 개인 설정 | `/settings` | — | ✅ | 🔗 | 🧪 identity.routes.test.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 워크스페이스 스위처 드롭다운 | 다중 워크스페이스 전환 기능 | 중 |
| 사이드바 항목 즐겨찾기 | 자주 쓰는 메뉴 상단 고정 | 낮음 |
| 섹션 접힘 상태 저장 | 각 섹션 독립 접힘/펼침 저장 | 낮음 |

## 테스트 실행 결과 (2026-05-04 11차 PDCA — 비즈니스 플로우 스텝퍼 최종 완결: E2E 회귀 가드 6 시나리오)

> ✅ **11차 PDCA 최종 완결** (커밋 `30ec17b`) — 1~10차에서 누적된 모든 동작을 영구 회귀 가드로 고정. 비즈니스 플로우 스텝퍼 기능의 마지막 사이클.

- BE vitest: **692/692 PASS** (10차 동일 — 11차는 E2E 추가만, BE 코드 변경 0)
- FE vitest: **251/251 PASS** (10차 동일 — 11차는 E2E 추가만, FE 단위 코드 변경 0)
- **E2E (Playwright): 6/6 PASS — `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` (190 LOC, 22.5s, retries=0)**
  - ① 5단계 칩 렌더링 (기획/킥오프/실행/검토/마무리 + `1/5 단계`)
  - ② 진행률 텍스트(`%`) + 막대 가시성
  - ③ collapse 토글 + reload 후 localStorage 영속성
  - ④ 키보드 ArrowRight 단계 이동
  - ⑤ AI 다음 단계 제안 (`page.route` 인터셉트 → 결정론 응답 또는 에러 토스트 fallback)
  - ⑥ Bell 배지 / overdue 배너 — 데이터 노출 시에만 단언 (false-negative 회피)
- 직접 측정 (2026-05-04): `pnpm --filter backend vitest run` 65 files / 692 passed · `pnpm --filter frontend vitest run` 25 files / 214 passed · `npx playwright test menus/business-flow-stepper.spec.ts` 6/6 passed
- 10차 신규 산출물:
  - BE — `apps/backend/src/modules/business-flows/flow-alerts.ts` 111 LOC (overdue 판정 `computeOverdue` + 알림 데이터 빌더 `buildOverdueNotificationData` / `buildSuggestNotificationData` + dedup 헬퍼 `shouldCreateOverdueNotification` / `todayWindowStart`)
  - BE — Prisma migration `20260503050000_add_flow_overdue_notification_kind` — `NotificationKind` enum 에 `flow_overdue` 값 추가 (`apps/backend/prisma/schema.prisma`)
  - BE — PATCH `/business-flows/:id/progress` 라우트 사이드 이펙트: `expectedDays` 초과 시 `flow_overdue` 알림 자동 생성 + `(userId, kind, screen, today UTC 자정, step label)` 기준 하루 1회 dedup
  - BE — POST `/business-flows/:id/suggest` 에 `saveToNotifications?: boolean` 옵션 추가 — true 일 때 AI 제안을 `kind=ai` 알림으로 저장 + 응답에 `notificationId` 포함
  - FE — `apps/frontend/src/lib/hooks/use-flow-alerts.ts` 55 LOC — `useNotifications()` 결과에서 `flow_overdue && !read` 필터 + flow.steps.screen 매칭 → `{ unreadCount, latest }` 메모, 추가 네트워크 호출 0
  - FE — `BusinessFlowStepper` 헤더에 amber Bell 배지(`data-testid="business-flow-alerts-badge"`, `aria-label`, `data-alert-count`) — `/notifications` 로 이동
  - Contract — 4 계층 동기화 (`packages/contracts/openapi.yaml` + `apps/backend/src/shared/schemas/api.generated.ts` + `apps/frontend/src/lib/api-types.gen.ts` + `apps/frontend/src/lib/schemas.ts`) → `NotificationKind` enum 에 `flow_overdue` 추가
- 회귀: 10차/9차/8차/7차/6차/5차/4차 도입분 모두 그대로 PASS (BE 692/692, FE 251/251 — 11차는 E2E 가드만 +)
- 11차 신규 산출물:
  - E2E — `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` 190 LOC (6 시나리오, biome 0 errors)
  - 리포트 — `docs/04-report/business-flow-stepper-11th-final-2026-05-03.report.md` 88 LOC
- 11차 핵심 패턴 (학습 보존):
  - **dev hydration 경합 해결**: `expect.poll` + `click({ force: true })` 폴 패턴 — Next.js dev 모드 첫 렌더 React 이벤트 리스너 미부착 케이스 자동 복구
  - **결정론적 LLM 응답**: `page.route('**/business-flows/*/suggest')` 인터셉트로 실 LLM 호출 우회 → CI 시간 30s → 3s
  - **localStorage 정리 헬퍼**: `beforeEach` 에서 `av:bf-stepper:` / `av:bf-celebrate:` 접두사 키 일괄 삭제로 테스트 간 영속 상태 누수 방지
  - **데이터 의존 단언 가드**: Bell 배지 / overdue 배너처럼 데이터 의존 UI 는 `isVisible` 분기 → false-negative 회피
- 커밋: `769ee38` (10차) → `30ec17b` (11차 최종 완결)

## 백엔드 연결 검증 결과 (2026-05-04 11차 PDCA — 최종 완결)

| 항목 | 결과 |
|------|------|
| 사이드바 22개 메뉴 라우트 매핑 | ✅ FE `lib/nav.ts` 단일 소스 |
| `GET /nav-counts` 라이브 카운트 | ✅ `apps/backend/src/modules/nav/nav-counts.routes.ts` 존재 + 6/6 테스트 PASS |
| 빠른 생성 메뉴 → POST 엔드포인트 | ✅ tasks/events/docs/issues 모두 백엔드 라우트 존재 |
| 시맨틱 검색 (검색 바 → ⌘K) | ✅ `POST /search/semantic` 8/8 테스트 PASS |
| FE 단위 테스트 | ✅ vitest **251/251 PASS** (ui-store, use-resize-drag, nav, query-keys, use-business-flow-progress, flow-progress-summary, business-flow-onboarding (6차), business-flow-stepper 24/24 (7차 +11), flow-insights-panel 5/5 (9차 신규), **use-flow-alerts 4/4 (10차 신규)** 포함) |
| BE 단위+통합 테스트 | ✅ vitest **692/692 PASS** (10차에서 +5 — business-flows.routes 33/33: 8차 23 + 9차 +5 + 10차 +5 알림) |
| 비즈니스 플로우 API | ✅ `GET /business-flows`, `GET /business-flows/:id`, `POST /business-flows/:id/suggest` — 5개 표준 플로우(project/task/approval/issue/report) |
| **비즈니스 플로우 진행 상태 API (4차 PDCA)** | ✅ `GET /business-flows/progress` (전체) · `GET /business-flows/:id/progress` (단일, 행 없으면 `{flowId, progress:null}`) · `PATCH /business-flows/:id/progress` (멱등 upsert, currentStepId 검증, completedSteps dedupe+sort) — business-flows.routes 23/23 PASS |
| **팀 진행 현황 API (5차 PDCA 신규)** | ✅ `GET /business-flows/team-progress` (인증 필수) — 옵션 `?flowId=` 단일 플로우 필터, soft-deleted user 제외, 서버에서 progressRatio 계산 (완료 단계 ÷ 전체 단계, 0..1), 최대 200건, `(flowId asc, updatedAt desc)` 정렬, unknown flowId → 404, 인증 없음 → 401 |
| **`useBusinessFlowProgress` 훅 (4차 PDCA)** | ✅ `apps/frontend/src/lib/hooks/use-business-flow-progress.ts` — TanStack Query useQuery+useMutation, 401/네트워크 silent fallback, fallbackCurrentStepId 자동 등록, staleTime 30s — use-business-flow-progress.test.tsx 4/4 PASS |
| **`enableServerSync` 9개 화면 전체 롤아웃 (5차 PDCA)** | ✅ dashboard/projects/tasks/issues/gantt/approvals/docs/report-weekly/report-monthly 모든 BusinessFlowStepper 인스턴스가 `enableServerSync=true` (4차에는 projects 단독 → 5차 9/9 완결) |
| **FlowProgressSummary 위젯 (5차 PDCA 신규)** | ✅ `apps/frontend/src/components/ai/flow-progress-summary.tsx` — 대시보드 메트릭 행 직후 배치, 진행 중/완료 카테고리 분리, progressRatio 막대 + %, 빈/실패 silent fallback, `maxPerCategory` 초과 시 "+N명 더 보기" — flow-progress-summary.test.tsx 5/5 PASS |
| **`stepStartedAt` Prisma 컬럼 (6차 PDCA 신규)** | ✅ `UserFlowProgress.stepStartedAt: DateTime @default(now())` 신규. PATCH 시 `currentStepId` 가 실제로 바뀐 경우에만 `now()` 로 갱신 — 같은 단계 내 멱등 PATCH(예: completedSteps 만 변경) 는 보존. 응답 wire 에 `stepStartedAt: ISO string` 포함. business-flows.routes 23/23 PASS |
| **`expectedDays` 22단계 전체 부여 (6차 PDCA)** | ✅ `flow-registry.ts` 의 5개 표준 플로우 22단계 모두에 `expectedDays` 부여 (1~30일 범위) → 단계별 표준 소요시간 정의 → FE overdue 경고 기준 |
| **단계 완료 toast (6차 PDCA 신규)** | ✅ `BusinessFlowStepper` 가 `currentStepId` 인덱스 전진을 감지해 `toast.success(\`다음 단계: {nextStep.label}\`)` 발사 + AI 다음단계 제안 자동 트리거 — business-flow-stepper.test.tsx PASS |
| **오버듀(amber) 경고 (6차 PDCA 신규)** | ✅ `(now - stepStartedAt) > expectedDays * 86400000` 충족 시 현재 단계 칩이 amber 색상 + 경고 아이콘 — business-flow-stepper.test.tsx PASS |
| **BusinessFlowOnboarding 컴포넌트 (6차 PDCA 신규)** | ✅ `apps/frontend/src/components/ai/business-flow-onboarding.tsx` — 첫 방문 1회성 popover, localStorage `av:bf-onboarding:done` 키 중복 방지, dismissible(확인/X), non-blocking, SSR safe (마운트 후 localStorage read), 대시보드에 1회 마운트 — business-flow-onboarding.test.tsx 5/5 PASS |
| **AI 플로우 인사이트 API (9차 PDCA 신규)** | ✅ `GET /business-flows/:id/insights` (인증 필수) — flow registry 검증(404), `userFlowProgress.findMany` + 활성 사용자 필터(`deletedAt:null`) → `aggregateFlowInsight(flow, rows, activeIds)` 순수 집계 → `buildInsightPrompt` + `adapter.complete({maxTokens:200, temperature:0.3})` AI 한국어 2문장 → 실패 시 `buildFallbackExplanation` 결정적 fallback. 응답 형상: `{flowId, totalMembers, steps[], bottleneckStepId\|null, aiExplanation}`. business-flows.routes.test.ts (+5 통합) PASS |
| **`insights.ts` 집계 모듈 (9차 PDCA 신규)** | ✅ `apps/backend/src/modules/business-flows/insights.ts` (178 LOC) — `aggregateFlowInsight(flow, rows, activeUserIds, now=new Date())` 순수 함수(시간 주입으로 결정적), 단계별 `memberCount`/`avgDwellDays(round1)`/`overdueRatio(round2)`/`isBottleneck`. 병목 결정: 멤버≥1 + (overdueRatio desc, avgDwellDays desc) 1순위, 0이면 null. `buildInsightPrompt` system+user 빌더, `buildFallbackExplanation` 안전 정량 요약. insights.test.ts 9/9 PASS |
| **FlowInsightsPanel 컴포넌트 (9차 PDCA 신규)** | ✅ `apps/frontend/src/components/ai/flow-insights-panel.tsx` (162 LOC) — `useQuery(['flow-insights', flowId], api.getBusinessFlowInsights, { staleTime:30s })`. error/data null silent fallback. 단계 카드(memberCount/avgDwellDays/overduePct), 병목 강조(red ring + AlertTriangle), AI 박스(Sparkles + 한국어 2문장). `dashboard.tsx` `FlowProgressSummary` 위에 통합 — flow-insights-panel.test.tsx 5/5 PASS |
| **알림 센터 — overdue 자동 알림 (10차 PDCA 신규)** | ✅ PATCH `/business-flows/:id/progress` 라우트가 `flow-alerts.ts` `computeOverdue` 로 단계 시작 후 `expectedDays` 초과 여부 판정 → 초과 시 `Notification(kind='flow_overdue', title, body, href=step.screen)` 자동 생성. `(userId, kind='flow_overdue', screen=step.screen, today UTC 자정 이후 createdAt, body 에 step label 포함)` 기준 `findFirst` 로 하루 1회 dedup → 동일 단계 멱등 PATCH 가 알림 폭주를 일으키지 않음. business-flows.routes.test.ts (10차 +5) PASS |
| **알림 센터 — AI 제안 저장 옵션 (10차 PDCA 신규)** | ✅ POST `/business-flows/:id/suggest` 에 `saveToNotifications?: boolean` 입력 옵션 추가 — `true` 일 때 AI 다음 단계 제안을 `Notification(kind='ai', href=nextStep.screen ?? currentStep.screen)` 으로 저장 + 응답에 `notificationId: string` 포함. 기본값 `false`(저장 없음, 응답에 `notificationId` 없음). business-flows.routes.test.ts (10차) PASS |
| **`flow-alerts.ts` 모듈 (10차 PDCA 신규)** | ✅ `apps/backend/src/modules/business-flows/flow-alerts.ts` (111 LOC) — `computeOverdue(stepStartedAt, expectedDays, now)` 순수 함수 (시간 주입 → 결정적), `buildOverdueNotificationData({userId, flow, step, daysOver})` / `buildSuggestNotificationData({userId, flow, currentStep, nextStep, suggestion})` 알림 데이터 빌더, `shouldCreateOverdueNotification(finder)` dedup 헬퍼, `todayWindowStart(now)` UTC 자정 헬퍼 (dedup 윈도우 시작점). 라우트와 책임 분리. |
| **Prisma `NotificationKind.flow_overdue` enum (10차 PDCA)** | ✅ `apps/backend/prisma/schema.prisma` `NotificationKind` enum 에 `flow_overdue` 값 추가 + 마이그레이션 `20260503050000_add_flow_overdue_notification_kind` 신규. PostgreSQL `ALTER TYPE ... ADD VALUE` 패턴. |
| **`useFlowAlerts` 훅 (10차 PDCA 신규)** | ✅ `apps/frontend/src/lib/hooks/use-flow-alerts.ts` (55 LOC) — `useNotifications()` 결과에서 `kind==='flow_overdue' && !read` 필터 + (선택) `flow.steps.map(s=>s.screen)` Set 으로 `n.href` 매칭 → `{ unreadCount, latest: { id, title, href?, time } | null }` 메모. flow 미지정 시 전체 `flow_overdue` 카운트. **추가 네트워크 호출 0**(기존 `GET /notifications` 결과 재사용). use-flow-alerts.test.tsx 4/4 PASS |
| **스테퍼 헤더 amber Bell 배지 (10차 PDCA 신규)** | ✅ `apps/frontend/src/components/ai/business-flow-stepper.tsx` 헤더에 `flowAlerts.unreadCount > 0` 일 때 `<a href="/notifications">` amber Bell + 카운트(`tabular-nums`). `data-testid="business-flow-alerts-badge"`, `data-alert-count={count}`, `aria-label="이 플로우에 미확인 지연 알림 N건"`, `title={latest.title}`. focus-visible amber ring. 0건이면 비표시. |
| **Contract 4 계층 `flow_overdue` 동기화 (10차 PDCA)** | ✅ 4 계층 SOR 일관: `packages/contracts/openapi.yaml` (`NotificationKind` enum) → `apps/backend/src/shared/schemas/api.generated.ts` (zod) → `apps/frontend/src/lib/api-types.gen.ts` (TS literal union) → `apps/frontend/src/lib/schemas.ts` (FE zod). drift 0. frontend-contract.test.ts 10/10 PASS. |
| 비즈니스 플로우 UX 강화 (FE) | ✅ 진행률 바(`progress-bar` + `progress-text`) / 체크마크(`data-completed`) / collapse(`localStorage av:bf-stepper:collapsed:{flowId}` flow별 독립) / 딥링크(`onStepSelect→router.push step.screen`) — business-flow-stepper.test.tsx 24/24 PASS (7차 +11) |
| **스테퍼 a11y / 키보드 / 완주 축하 (7차 PDCA 신규)** | ✅ `apps/frontend/src/components/ai/business-flow-stepper.tsx` — `role="navigation"` + `aria-label` + `aria-current="step"` + `aria-describedby={tooltipId}` (sr-only tooltip) + ←/→/↑/↓/Home/End 키보드 네비 (`handleStepKeyDown` + `data-testid="business-flow-step-{id}"`) + 모든 인터랙티브에 `focus-visible:ring-2` + 미완→완료 전이 시 `toast.success` + CSS confetti(`globals.css` `@keyframes bfConfettiBurst`/`bfCelebrateGlow`, `prefers-reduced-motion` 존중, localStorage `av:bf-completed:{flowId}` 영구 1회 가드) — business-flow-stepper.test.tsx 24/24 PASS |
| **8차 PDCA — business-flow-stepper 모듈 분리 (2026-05-03)** | ✅ `business-flow-stepper.tsx` 552→412 LOC (500 LOC 게이트 ✅ 준수). 3개 신규 모듈로 책임 분리: ① `apps/frontend/src/lib/hooks/use-flow-celebration.ts` (132 LOC, confetti 상태 + sonner toast.success + localStorage `av:bf-stepper:completed:{flowId}` 가드 + `isFlowComplete`/`ConfettiPiece` 타입 동거) — `COMPLETION_STORAGE_PREFIX = 'av:bf-stepper:completed:'` (7차 본문에 명시됐던 `av:bf-completed:` → 8차에서 `av:bf-stepper:completed:` 로 일관성 정리), ② `apps/frontend/src/lib/hooks/use-stepper-keyboard.ts` (63 LOC, ←/→/↑/↓/Home/End 키보드 네비게이션 — `handleStepKeyDown` + `data-testid="business-flow-step-{id}"` querySelector 위임), ③ `apps/frontend/src/components/ai/business-flow-step-chip.tsx` (71 LOC, 단계 칩 렌더링 + `aria-current`/`aria-describedby`/`data-current`/`data-completed`). 기능 변경 0건. 회귀 0 (FE 205/205, BE 673/673), neue 3 파일 lint 0 errors. 커밋 `3b46667`. |
| **9차 PDCA — Flow Insights Panel + AI 병목 감지 (2026-05-04)** | ✅ BE +1 모듈(`insights.ts` 178 LOC, 순수 집계 + AI 프롬프트 빌더 + fallback) + 1 엔드포인트(`GET /business-flows/:id/insights`) / FE +1 컴포넌트(`flow-insights-panel.tsx` 162 LOC, dashboard.tsx 통합) + 1 API 클라이언트(`api.getBusinessFlowInsights`) + 2 타입(`FlowInsight`/`FlowInsightStep`). 테스트 +14(BE 9 단위 + 5 통합) +5(FE RTL). BE 673→687, FE 205→210. 회귀 0. 커밋 `1400ea7`. |
| **10차 PDCA — 알림 센터 연동 (2026-05-04)** | ✅ BE +1 모듈(`flow-alerts.ts` 111 LOC: `computeOverdue` / `buildOverdueNotificationData` / `buildSuggestNotificationData` / `shouldCreateOverdueNotification` / `todayWindowStart`) + Prisma migration(`NotificationKind.flow_overdue` enum 값) + PATCH 사이드 이펙트(overdue 자동 알림 + 하루 1회 dedup) + POST suggest `saveToNotifications?` 옵션(true 시 `kind=ai` 알림 + `notificationId` 응답) / FE +1 훅(`use-flow-alerts.ts` 55 LOC, 추가 네트워크 호출 0) + 헤더 amber Bell 배지(`/notifications` 이동) / Contract 4 계층 동기화(openapi.yaml + api.generated.ts + api-types.gen.ts + schemas.ts) `NotificationKind.flow_overdue`. 테스트 +5(BE: 자동생성/dedup/미만은생성안함/saveToNotifications true/기본 false) +4(FE: 단계화면매칭/전체합산/읽음제외/다른kind제외). BE 687→692, FE 210→214. 회귀 0. 커밋 `769ee38`. |
| **11차 PDCA — 비즈니스 플로우 스텝퍼 최종 완결 (2026-05-04, 커밋 `30ec17b`)** | ✅ **최종 완결 사이클** — Playwright E2E 6 시나리오 회귀 가드(`apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` 190 LOC): ① 5단계 칩 렌더링(기획/킥오프/실행/검토/마무리) ② 진행률 텍스트 + 막대 ③ collapse 토글 + localStorage 영속성 ④ 키보드 ArrowRight 단계 이동 ⑤ AI 다음 단계 제안(`page.route` 인터셉트로 결정론 + 토스트 fallback) ⑥ Bell 배지 / overdue 배너 a11y 검증. **BE/FE 단위 회귀 0** (BE 692/692, FE 251/251 동일). 22.5s 실행 시간, retries=0. 4 학습 패턴. biome 0 errors. 리포트: `docs/04-report/business-flow-stepper-11th-final-2026-05-03.report.md`. |
| **14차 PDCA — dashboard/projects 동적 currentStepId 추론 (2026-05-04, 커밋 `41ad615`)** | ✅ **신규 초급 사용자 UX 개선** — `dashboard.tsx` / `projects.tsx` 정적 fallback → 실데이터 5단계 동적 추론. `flow-step-inference.test.tsx` 10건 신규. FE 214→224. |
| **15차 PDCA — docs/report 화면 동적 currentStepId 완성 (2026-05-04, 커밋 `1ba5f42`)** | ✅ **9개 화면 전체 동적 추론 완성** — `docs.tsx`: `'archive'` 하드코딩 → `docs 없음='draft' / 편집중='review' / 기본='archive'`. `report-weekly.tsx` / `report-monthly.tsx`: `'share'` 단계 추가(`report && history.some(r => r.id === report.id)` 시). 추론 단위 테스트 7건 추가(`flow-step-inference.test.tsx` 10→17건). FE 224→231 PASS. typecheck 0. |
| **16차 PDCA — issues/tasks/gantt/approvals 추론 단위 테스트 완결 (2026-05-04, 커밋 `31c0931`)** | ✅ **9개 화면 추론 로직 전체 테스트 커버 완성** — `flow-step-inference.test.tsx`: `inferIssueStep`(6건)·`inferTaskStep`(5건)·`inferGanttStep`(5건)·`inferApprovalStep`(4건) 추가. 총 17→37건. FE 231→**251** PASS. typecheck 0. |
| 스펙 문서 드리프트 | 0건 — 16차까지 모두 반영. FE 251/251 · BE 692/692 현재 상태. |
