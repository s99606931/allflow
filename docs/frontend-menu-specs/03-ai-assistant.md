# AI 어시스턴트 패널 (AI Assistant Panel)

> 파일: `src/components/shell/ai-panel.tsx`, `src/components/ai/`

## 개요

우측 슬라이드인 패널로 표시되는 워크스페이스 AI 채팅 인터페이스.  
Claude API와 연동하여 스트리밍 응답, RAG, 툴 호출, 멀티모달 첨부를 지원한다.

## 기능 목록

### 1. 패널 컨트롤

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 패널 열기/닫기 | 탑바 Sparkles 버튼 또는 ⌘I 단축키 | ✅ | 🔌 (zustand) | 🧪 ui-store.test.ts |
| 패널 너비 조절 | 좌측 엣지 드래그로 너비 조절 | ✅ | 🔌 (zustand persist) | 🧪 use-resize-drag.test.tsx ✅ (2026-05-03) |
| 대화 초기화 | Trash2 아이콘 버튼 → 현재 대화 삭제 | ✅ | 🔗 DELETE /ai/threads/:id | 🧪 use-ai.test.tsx ✅ (2026-05-03) |
| 스레드 사이드바 토글 | PanelLeft 버튼 → 대화 히스토리 사이드바 | ✅ | 🔌 | 🧪 ui-store.test.ts |

### 2. AI 채팅 인터페이스

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 메시지 전송 | Enter로 전송, Shift+Enter로 줄바꿈 | ✅ | 🔗 POST /ai/complete (SSE 스트리밍) | 🧪 use-ai.test.tsx ✅ (2026-05-03) |
| 스트리밍 응답 | SSE로 토큰 단위 실시간 출력 | ✅ | 🔗 | 🧪 use-ai.test.tsx |
| 마크다운 렌더링 | AI 응답을 마크다운으로 파싱·렌더링 | ✅ | 🔌 (클라이언트 파싱) | 🧪 ui-store.test.ts |
| 인용 뱃지 | 응답에 사용된 문서 출처 표시 | ✅ | 🔗 (RAG 결과 메타) | 🧪 BE integration test |
| 툴 호출 트레이스 | AI가 호출한 도구 목록 펼침/접힘 표시 | ✅ | 🔗 (tool_call 메타) | 🧪 tool-loop.test.ts |
| 토큰 사용량 표시 | prompt↑ + completion↓ = 합계 · 비용 · 모델 | ✅ | 🔗 (usage 메타) | 🧪 BE integration test |
| 추천 질문 칩 | 빈 대화 시 제안 질문 버튼 4개 표시 | ✅ | 🔌 (하드코딩) | 🧪 ui-store.test.ts |
| 로딩 상태 | "생각 중…" 스피너 표시 | ✅ | 🔌 | 🧪 ui-store.test.ts |

### 3. AI 컴포저 (입력창)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 텍스트 입력 | 멀티라인 자동 확장 텍스트에어리어 | ✅ | 🔌 | 🧪 ui-store.test.ts |
| 파일 첨부 | 이미지/파일 첨부 → presigned URL 업로드 | ✅ | 🔗 POST /ai/attachments | 🧪 use-file-attach.test.tsx ✅ (2026-05-03) |
| 음성 입력 | 마이크 버튼 → Web Speech API → 텍스트 변환 | ✅ | 🔌 (브라우저 API) | 🧪 use-voice-input.test.tsx ✅ (2026-05-03) |
| 연결 상태 표시 | "온라인" / "기본 응답 모드" 상태 레이블 | ✅ | 🔗 (LLM 연결 상태) | 🧪 llm-connections.routes.test.ts |

### 4. 스레드 관리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 새 스레드 생성 | + 버튼 → 새 대화 시작 | ✅ | 🔗 POST /ai/threads | 🧪 use-ai.test.tsx ✅ (2026-05-03) |
| 스레드 목록 | 이전 대화 목록 스크롤 | ✅ | 🔗 GET /ai/threads | 🧪 ai-thread.routes.test.ts ✅ |
| 스레드 전환 | 이전 대화 클릭으로 전환 | ✅ | 🔗 GET /ai/threads/:id/messages | 🧪 ai-thread.routes.test.ts ✅ |

### 5. AI 기능 (백엔드 지원)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| RAG (문서 검색) | 워크스페이스 문서를 컨텍스트로 검색 | ✅ | 🔗 (semantic search 통합) | 🧪 search.routes.test.ts ✅ |
| 툴 호출 (내장 도구) | 태스크 조회/생성, 이슈 조회, 캘린더 조회 | ✅ | 🔗 tool-loop.ts + builtin tools | 🧪 tool-loop.test.ts ✅ |
| MCP 연동 | MCP 서버 프로토콜 도구 지원 | ✅ | 🔗 GET/POST /ai/mcp-connections | 🧪 mcp-connection.routes.test.ts ✅ |
| 웹 검색 | Brave/SearxNG 검색 프로바이더 | ✅ | 🔗 (서버사이드 호출) | 🧪 web-search-adapter.test.ts ✅ |
| LLM 모델 선택 | 관리자 콘솔에서 기본 모델 설정 | ✅ | 🔗 GET /llm-connections | 🧪 use-admin.test.tsx ✅ (2026-05-03) |

### 6. 화면별 AI 가이드 위젯 (AiGuideWidget)

> 파일: `src/components/ai/ai-guide-widget.tsx`  
> 각 화면 우하단에 표시되는 컨텍스트 인식 AI 힌트 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 화면별 컨텍스트 힌트 | 현재 화면에 맞는 추천 AI 질문 3개 표시 | ✅ | 🔌 (화면별 하드코딩 힌트) | 🧪 ui-store.test.ts |
| 실데이터 조건 분기 | 데이터 존재 여부에 따라 다른 힌트 표시 | ✅ | 🔗 (useXxx 훅 데이터 활용) | 🧪 BE integration test |
| AI 패널 자동 오픈 | 힌트 클릭 → AI 패널 열기 + 질문 자동 입력 | ✅ | 🔌 | 🧪 ui-store.test.ts |
| 22개 화면 커버리지 | 모든 주요 화면에 AiGuideWidget 탑재 | ✅ | — | 🧪 BE integration test |

### 7. 비즈니스 플로우 스테퍼 (BusinessFlowStepper)

> 파일: `src/components/ai/business-flow-stepper.tsx` (412 LOC, 8차 PDCA 모듈 분리 후)  
> 8차 PDCA 분리 모듈:
> - `src/lib/hooks/use-flow-celebration.ts` (132 LOC) — confetti 상태 + sonner toast.success + localStorage 가드 + `isFlowComplete`/`ConfettiPiece` 타입
> - `src/lib/hooks/use-stepper-keyboard.ts` (63 LOC) — ←/→/↑/↓/Home/End 키보드 네비게이션 hook
> - `src/components/ai/business-flow-step-chip.tsx` (71 LOC) — 단계 칩 렌더링 + ARIA + data-* 속성
>
> 9개 사이드바 화면(대시보드/프로젝트/태스크/이슈/간트/결재/문서/주간보고/월간보고)에 탑재되어 5개 표준 플로우(project/task/approval/issue/report)의 현재 단계와 AI 다음 단계 제안을 제공한다.

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 플로우 목록 조회 | 5개 표준 플로우 + 단계 정의 | ✅ | 🔗 GET /business-flows | 🧪 business-flows.routes.test.ts ✅ |
| 단일 플로우 조회 | 특정 플로우의 단계 상세 | ✅ | 🔗 GET /business-flows/:id | 🧪 business-flows.routes.test.ts ✅ |
| AI 다음 단계 제안 | 현재 단계 + 화면 systemContext → AI 1요청으로 다음 액션 제안. **10차 PDCA: `saveToNotifications?: boolean` 옵션 추가** — `true` 시 AI 제안을 `Notification(kind='ai', href=nextStep.screen ?? currentStep.screen)` 으로 저장 + 응답에 `notificationId` 포함. 기본값 `false`. | ✅ | 🔗 POST /business-flows/:id/suggest (10차: `saveToNotifications?: boolean` 입력 + `notificationId?: string` 응답) | 🧪 business-flows.routes.test.ts ✅ (10차 +5: saveToNotifications true / 기본 false 등) |
| **AI 플로우 인사이트 + 병목 감지 (9차 PDCA 신규)** | 단일 플로우의 단계별 평균 체류일/오버듀 비율/멤버 수 + 병목 단계 + AI 한국어 2문장 설명. 별도 컴포넌트 `FlowInsightsPanel` 로 노출 (10번 섹션 참조). | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts (9 단위) · business-flows.routes.test.ts (+5 통합) · flow-insights-panel.test.tsx (5 RTL) ✅ (2026-05-04) |
| 현재 단계 강조 | 화면별 도메인 신호(상태/카운트)로 currentStepId 추론 | ✅ | 🔌 (FE 추론) | 🧪 business-flow-stepper.test.tsx ✅ (2026-05-03) |
| **진행 상태 서버사이드 영속화 (4차 PDCA)** | localStorage → DB(`UserFlowProgress` 모델). 본인 전체/단일 플로우 조회 + 멱등 PATCH(upsert). 디바이스/세션 간 동기화. | ✅ | 🔗 GET /business-flows/progress · GET /business-flows/:id/progress · PATCH /business-flows/:id/progress | 🧪 business-flows.routes.test.ts (19/19, 진행 상태 7건 + 팀 진행 5건 포함) ✅ (2026-05-03) |
| **`useBusinessFlowProgress` 훅 (4차 PDCA)** | TanStack Query 기반 서버 동기화 훅. `currentStepId` 변경 시 멱등 PATCH 자동 호출. 401/네트워크 오류는 silent fallback (UI 동작 유지). | ✅ | 🔗 (위 3개 API 호출) | 🧪 use-business-flow-progress.test.tsx (4/4) ✅ (2026-05-03) |
| **9개 화면 `enableServerSync=true` 전체 롤아웃 (5차 PDCA)** | 4차에서 `projects.tsx` 단독 적용되었던 `enableServerSync` prop이 9개 사이드바 화면(dashboard/projects/tasks/issues/gantt/approvals/docs/report-weekly/report-monthly) **전체에 롤아웃**. BusinessFlowStepper의 `useBusinessFlowProgress({ enabled })` 가드로 비활성 시 네트워크 호출 0건, 활성 시 멱등 PATCH로 디바이스/세션 간 진행 상태 동기화 완성. | ✅ | 🔗 (위 3개 API 호출) | 🧪 business-flow-stepper.test.tsx (13/13) ✅ (2026-05-03) |
| **진행률 바** | currentIdx ÷ totalSteps 비율을 헤더 하단 0.5px 바 + `· {n}%` 텍스트로 표시. 접혀 있어도 항상 노출 → 한눈에 진척 파악 | ✅ | 🔌 | 🧪 business-flow-stepper.test.tsx (progress bar/percentage) ✅ |
| **체크마크 (완료 단계)** | past 단계는 `CheckCircle2` 아이콘 + accent 컬러 + `data-completed="true"`. current 는 ring 강조, future 는 dashed 보더 | ✅ | 🔌 | 🧪 business-flow-stepper.test.tsx (data-completed 검증) ✅ |
| **collapse / expand** | 헤더의 ChevronUp/Down 토글로 본문 접기. `localStorage`(`av:bf-stepper:collapsed:{flowId}`)에 flow별 독립 저장 → 새 마운트 시 복원. 접혀도 진행률 바·헤더는 유지 | ✅ | 🔌 (localStorage) | 🧪 business-flow-stepper.test.tsx (collapse + restore + per-flow isolation) ✅ |
| **단계 딥링크** | 단계 칩 클릭 → `onStepSelect(step)` → 호출자가 `step.screen` 으로 router.push. AI 제안의 nextStep 칩도 동일 핸들러 재사용 | ✅ | 🔌 (router.push) | 🧪 business-flow-stepper.test.tsx (onStepSelect / nextStep) ✅ |
| **단계 완료 toast (6차 PDCA 신규)** | `currentStepId` 가 다음 인덱스로 전진하면 sonner `toast.success(\`다음 단계: {nextStep.label}\`)` 자동 발사 + AI 다음단계 제안 자동 트리거 (failure 시 `toast.error`). | ✅ | 🔌 (sonner) | 🧪 business-flow-stepper.test.tsx ✅ (2026-05-03) |
| **오버듀 amber 경고 (6차 PDCA 신규)** | `(now - stepStartedAt) > expectedDays * 86400000` 충족 시 현재 단계 칩 amber 색상 + `AlertTriangle` 아이콘 + `data-overdue="true"`. 기준값은 `flow-registry.ts` 22단계 전체 `expectedDays` 정의. | ✅ | 🔗 (서버 `stepStartedAt` + 정의 `expectedDays`) | 🧪 business-flow-stepper.test.tsx ✅ (2026-05-03) |
| **`stepStartedAt` Prisma 컬럼 (6차 PDCA 신규)** | `UserFlowProgress.stepStartedAt: DateTime @default(now())`. PATCH 시 `currentStepId` 가 실제로 바뀐 경우에만 `now()` 로 갱신 — 같은 단계 내 멱등 PATCH(예: completedSteps 만 변경) 는 보존되어 overdue 계산 누적이 깨지지 않는다. | ✅ | 🔗 GET/PATCH /business-flows/:id/progress (응답 wire 에 `stepStartedAt: ISO string` 포함) | 🧪 business-flows.routes.test.ts (23/23, 6차 +4: stepStartedAt 갱신/보존/overdue 비교) ✅ |
| **a11y — ARIA 마크업 (7차 PDCA 신규)** | 컨테이너 `role="navigation"` + `aria-label="{flow.name} 단계 진행 표시"`, 단계 `<ol>` `aria-label="{flow.name} 단계 목록"`, 현재 단계 칩 `aria-current="step"`, 단계 툴팁 `<span role="tooltip" id={tooltipId}>` (sr-only) + 단계 칩 `aria-describedby={tooltipId}` 로 연결, 토글/AI/dismiss 버튼 `aria-label` 부여 | ✅ | 🔌 (FE 마크업) | 🧪 business-flow-stepper.test.tsx (a11y 6건) ✅ (2026-05-03) |
| **키보드 네비게이션 (7차 PDCA 신규 · 8차 모듈 분리)** | 단계 칩 포커스 상태에서 → / ↓ 다음 단계, ← / ↑ 이전 단계, Home 첫 단계, End 마지막 단계로 DOM focus 이동. `useCallback` 핸들러(`handleStepKeyDown`) + `data-testid="business-flow-step-{id}"` querySelector 위임. 경계 단계는 안전 정지. **8차에서 `useStepperKeyboard({ steps, listRef })` 훅으로 분리** (`apps/frontend/src/lib/hooks/use-stepper-keyboard.ts`, 63 LOC) — `RefObject<HTMLOListElement \| null>` 입력으로 `<ol>` ref 주입, `focusStepByOffset` 내부 헬퍼로 경계 클램프. | ✅ | 🔌 | 🧪 business-flow-stepper.test.tsx (키보드 4건) ✅ (2026-05-03) |
| **focus-visible 링 (7차 PDCA 신규)** | 모든 인터랙티브 버튼(헤더 토글, 단계 칩, AI 제안 칩, dismiss)에 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` 적용 — 마우스 클릭은 노출 없음, Tab/방향키 포커스 시에만 강조 | ✅ | 🔌 (Tailwind) | 🧪 business-flow-stepper.test.tsx ✅ |
| **플로우 완주 축하 (7차 PDCA 신규 · 8차 모듈 분리)** | 미완→완료 전이 시 1회 `toast.success("🎉 {flow.name} 완료!")` + CSS keyframes confetti(`bfConfettiBurst` / `bfCelebrateGlow` `globals.css`). `prefers-reduced-motion` 존중(애니메이션 무효화), localStorage `av:bf-stepper:completed:{flowId}` 가드로 영구 1회 발사 (8차에서 키 prefix 일관성 정리: `av:bf-completed:` → `av:bf-stepper:completed:`), 첫 마운트가 이미 완료면 skip(이미 본 것), 결정적 confetti seed(`flow.id` charCode 합) — `Date.now` 회피로 SSR 안전. **8차에서 `useFlowCelebration` 훅으로 분리** (`apps/frontend/src/lib/hooks/use-flow-celebration.ts`, 132 LOC). `isFlowComplete(steps, currentStepId, completedSet)` 헬퍼 + `ConfettiPiece` 인터페이스 동거 export. | ✅ | 🔌 (sonner + CSS) | 🧪 business-flow-stepper.test.tsx (완주 3건) ✅ (2026-05-03) |

#### UX 강화 사양 (2026-05-03)

- 진행률 바: `data-testid="business-flow-progress-bar"` (외부 wrapper) + 내부 div `width: {pct}%` (transition-all 300ms)
- 진행률 텍스트: `data-testid="business-flow-progress-text"`, 형식 `· {pct}%`
- 토글 버튼: `data-testid="business-flow-toggle"`, `aria-expanded` 토글, ChevronUp(펼침)/Down(접힘)
- 단계 칩 상태: `data-current="true"` | `data-completed="true"` 로 e2e 검증 가능
- localStorage 키 prefix: `av:bf-stepper:collapsed:` (flow.id 별 격리)
- 접근성: 모든 클릭 가능 요소에 `cursor-pointer` + `aria-label` 부여, 진행률 바는 `aria-hidden`(텍스트 fallback 제공)

#### 4차 PDCA — 진행 상태 서버사이드 영속화 사양

- **데이터 모델 (Prisma)**: `UserFlowProgress { userId, flowId, currentStepId, completedSteps: String[], updatedAt }`, compound unique `userId_flowId`
- **API 3종**:
  - `GET /business-flows/progress` → `{ progress: ProgressWire[] }` (본인 전체, `updatedAt desc`)
  - `GET /business-flows/:id/progress` → `ProgressWire` 또는 `{ flowId, progress: null }` (행 없으면 null 정규화)
  - `PATCH /business-flows/:id/progress` → 멱등 upsert. 입력: `{ currentStepId, completedSteps?: string[] }`. 서버는 `currentStepId`/`completedSteps` 모두 `flow.steps`에 존재하는 id만 받고, `completedSteps`는 `dedupeSorted` 정규화. 잘못된 id → `ValidationError`.
- **인증**: 모두 `app.authenticate` preHandler. `req.user!.id` 로 본인 데이터만 접근.
- **FE 훅 시그니처**: `useBusinessFlowProgress(flowId, fallbackCurrentStepId, { enabled? })` → `{ currentStepId, completedSteps, isLoading, setProgress }`
- **자동 등록**: 페이지 진입 시 서버에 행이 없으면 `fallbackCurrentStepId`로 즉시 PATCH (`useEffect` 가드).
- **테스트 매트릭스**: BE 14개 (목록/단일/null폴백/멱등/잘못된step/인증) · FE 4개 (서버 fetch · PATCH 호출 · null 폴백 · enabled=false)

### 8. 팀 진행 현황 위젯 (FlowProgressSummary) — 5차 PDCA 신규

> 파일: `src/components/ai/flow-progress-summary.tsx`
> 대시보드 메트릭 행 직후 배치되어 팀 협업 가시성을 제공하는 신규 위젯.
> 4차 PDCA에서 사용자 본인 진행 상태를 영속화한 데에 이어, 5차 PDCA에서는 팀원 전체의 플로우 진행 현황을 한 화면에 집계 표시한다.

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 팀 진행 상태 집계 조회 | 팀원 전체 `UserFlowProgress`를 단일 호출로 집계, 결과 최대 200건 (`flowId asc, updatedAt desc`) | ✅ | 🔗 GET /business-flows/team-progress | 🧪 business-flows.routes.test.ts (5/5 신규) ✅ |
| 카테고리 분리 (진행 중 / 완료) | `progressRatio === 1` 이면 완료, 그 외 진행 중. 위젯에서 두 컬럼으로 분리 표시 | ✅ | 🔌 (FE 분류) | 🧪 flow-progress-summary.test.tsx ✅ |
| 진행률 막대 + % | progressRatio (서버 계산: 완료 단계 ÷ 전체 단계, 0..1)를 막대 + 퍼센트 텍스트로 시각화 | ✅ | 🔗 (서버 progressRatio) | 🧪 flow-progress-summary.test.tsx ✅ |
| 단일 플로우 필터 | `flowId` prop 전달 시 `?flowId=` 쿼리로 BE 필터링. unknown flowId → 404 | ✅ | 🔗 GET /business-flows/team-progress?flowId= | 🧪 flow-progress-summary.test.tsx (flowId 전달 / BE 404 분기) ✅ |
| 빈 결과 / 네트워크 실패 silent fallback | 결과 0건 또는 fetch 실패 시 위젯 자체를 숨기지 않고 안내 문구로 fallback (UI 흐름 유지) | ✅ | 🔌 | 🧪 flow-progress-summary.test.tsx (빈 / 실패) ✅ |
| 오버플로우 "+N명 더 보기" | 카테고리당 `maxPerCategory` 초과분은 더보기 링크로 축약 | ✅ | 🔌 | 🧪 flow-progress-summary.test.tsx ✅ |
| Soft-deleted user 제외 | BE 단계에서 soft-deleted user 의 진행 상태는 결과에서 제외 | ✅ | 🔗 (서버 필터) | 🧪 business-flows.routes.test.ts (활성 사용자만 + progressRatio 계산) ✅ |
| 인증 가드 | 인증 없으면 401 | ✅ | 🔗 (`app.authenticate` preHandler) | 🧪 business-flows.routes.test.ts (401) ✅ |

#### 5차 PDCA — 팀 진행 현황 사양

- **신규 BE 엔드포인트**: `GET /business-flows/team-progress`
  - 응답: `{ team: TeamFlowProgressEntry[] }`
  - `TeamFlowProgressEntry`: `{ userId, flowId, currentStepId, completedSteps, progressRatio, updatedAt, user: { id, name, email, avatarUrl? } }`
  - 옵션 쿼리 `?flowId=` 단일 플로우 필터 (unknown flowId → 404)
  - 인증 필수(`app.authenticate`), soft-deleted user 제외, 결과 최대 200건, 정렬 `(flowId asc, updatedAt desc)`
  - `progressRatio` 서버 계산: `completedSteps.length / flow.steps.length` (0..1)
- **FE API 클라이언트**: `api.getTeamFlowProgress(flowId?)` — `apps/frontend/src/lib/api/extended.ts`
- **위젯 props**: `<FlowProgressSummary flowId? maxPerCategory? />` — `flowId` 미지정 시 모든 플로우 집계, `maxPerCategory` 기본값 초과분은 "+N명 더 보기"
- **배치 위치**: `dashboard.tsx` 메트릭 행 직후 1회 (`<FlowProgressSummary />`)
- **9개 화면 `enableServerSync` 롤아웃**: dashboard / projects / tasks / issues / gantt / approvals / docs / report-weekly / report-monthly — 4차의 projects 단독 → 5차 9/9 완결
- **테스트 매트릭스**:
  - BE 5개 신규: 빈 결과 / 활성 사용자만 + progressRatio 계산 / 단일 플로우 필터 / unknown flowId 404 / 401 인증
  - FE 5개 신규(flow-progress-summary.test.tsx): 빈 결과 / 카테고리 분리(진행 중·완료) / flowId prop 전달 / 네트워크 실패 silent fallback / 오버플로우 +N

### 9. 비즈니스 플로우 온보딩 오버레이 (BusinessFlowOnboarding) — 6차 PDCA 신규

> 파일: `src/components/ai/business-flow-onboarding.tsx`
> 첫 방문 사용자에게 BusinessFlowStepper 의 사용 방법을 1회성 popover 로 안내한다.
> 대시보드(`dashboard.tsx`)에 1회 마운트되며, localStorage 키로 중복 방지된다.

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 1회성 표시 | 첫 마운트 시 `localStorage['av:bf-onboarding:done']` 미설정이면 popover 표시. 한 번 닫히면 다시 표시되지 않음 | ✅ | 🔌 (localStorage) | 🧪 business-flow-onboarding.test.tsx (5/5) ✅ |
| dismiss (확인 버튼) | "확인했어요" 버튼 클릭 → 팝오버 닫힘 + localStorage 키 set | ✅ | 🔌 | 🧪 business-flow-onboarding.test.tsx ✅ |
| dismiss (X 버튼) | 우상단 X 아이콘 → 동일 dismiss 동작 | ✅ | 🔌 | 🧪 business-flow-onboarding.test.tsx ✅ |
| non-blocking popover | modal 아님 — 페이지 인터랙션을 막지 않는 우하단 fixed popover (`role="dialog"`, `aria-labelledby`) | ✅ | 🔌 | 🧪 business-flow-onboarding.test.tsx (role/aria) ✅ |
| SSR safe | 마운트 후 `useEffect` 에서만 localStorage read → hydration mismatch 회피, `typeof window === 'undefined'` 가드 | ✅ | 🔌 | 🧪 business-flow-onboarding.test.tsx ✅ |
| anchor 표시 | `anchorTestId` prop 으로 안내 대상 영역 식별 (data-anchor 속성) — 향후 spotlight/포커스 효과 확장 여지 | ✅ | 🔌 | 🧪 business-flow-onboarding.test.tsx ✅ |

#### 6차 PDCA — BusinessFlowOnboarding 사양

- **컴포넌트 props**: `<BusinessFlowOnboarding anchorTestId? className? />`
- **localStorage 키**: `av:bf-onboarding:done` — 값 `'1'` 이면 표시 생략
- **마운트 위치**: `apps/frontend/src/components/screens/dashboard.tsx` 에 `<BusinessFlowOnboarding anchorTestId="business-flow-stepper" />` 1회 (다른 화면에서는 BusinessFlowStepper 사용 시에도 dashboard 가 게이트키퍼 — 첫 방문 흐름이 항상 dashboard 부터 시작한다는 가정)
- **안내 내용**: ① 단계 클릭 → 화면 이동, ② AI 다음 단계 제안, ③ 표준일수 초과 → amber 경고 (3개 bullet)
- **접근성**: `role="dialog"`, `aria-labelledby="bf-onboarding-title"`, `data-testid="business-flow-onboarding"`, dismiss 버튼 `data-testid="business-flow-onboarding-dismiss"` / `business-flow-onboarding-close`
- **테스트 매트릭스 (5개)**: 첫 방문 시 표시 / dismiss 후 localStorage 기록 / 재마운트 시 표시 안 함 / X 버튼 dismiss / SSR(window undefined) 시 표시 안 함

#### 6차 PDCA — flow-registry.expectedDays 22단계 전체 부여

- **소스**: `apps/backend/src/modules/business-flows/flow-registry.ts`
- **5개 표준 플로우 22단계 모두 `expectedDays` 부여**: project (5단계, 5+3+30+3+2=43일) / task (3단계, 1+5+2=8일) / approval (3단계, 1+2+1=4일) / issue (4단계, 1+1+1+1=4일) / report (3단계, 7+2+1=10일)
- **사용처**: FE BusinessFlowStepper 가 `expectedDays` × 86_400_000ms 로 overdue 임계값 계산 → `(now - stepStartedAt) > 임계` 시 amber 경고
- **회귀 가드**: `expectedDays` 가 누락되거나 0 이면 overdue 항상 false (안전 fallback)

#### 7차 PDCA — a11y · 키보드 · 완주 축하 사양

- **마크업 / ARIA**:
  - 컨테이너 `role="navigation"` + `aria-label={`${flow.name} 단계 진행 표시`}`
  - 단계 `<ol>` `aria-label={`${flow.name} 단계 목록`}`
  - 단계 칩 `aria-current={isCurrent ? 'step' : undefined}` + `aria-describedby={tooltipId}`
  - 단계 툴팁: `<span id={tooltipId} role="tooltip" className="sr-only">{description} · {screen}</span>` (`useId` 로 SSR/CSR 일관 ID 생성)
  - 토글/AI 제안/dismiss 모든 인터랙티브 버튼에 `aria-label`
- **키보드 네비게이션**:
  - 핸들러: `handleStepKeyDown(event, idx)` — `useCallback`
  - 키: `ArrowRight`/`ArrowDown` → +1, `ArrowLeft`/`ArrowUp` → -1, `Home` → 0, `End` → length-1
  - 포커스 위임: `stepListRef` `<ol>` 내 `[data-testid="business-flow-step-{id}"]` querySelector → `.focus()`
  - `event.preventDefault()` 로 페이지 스크롤 차단
  - 경계(첫/마지막 단계)에서 wrap 없이 안전 정지
- **focus-visible 링**: Tailwind 클래스 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`(필요 시 `focus-visible:ring-offset-1`) — 모든 인터랙티브 버튼/링크
- **완주 축하**:
  - 트리거: `prevFlowCompleteRef.current === false` 이면서 `flowComplete === true` 인 전이 시점만 (첫 마운트 `prev===null` 또는 이미 완료 유지 `prev===true` 는 skip)
  - localStorage: `av:bf-completed:{flowId}` (read/write 헬퍼 함수, `try/catch` 로 SSR/QuotaExceeded 방어)
  - sonner: `toast.success(\`🎉 ${flow.name} 완료!\`, { description: '모든 단계를 마쳤습니다. 회고와 보고서로 마무리해 보세요.' })`
  - confetti: `generateConfetti(seed)` — `seed = flow.id.charCodeAt 합` 으로 결정적 (Date.now 회피 → SSR/테스트 결정성), 16개 조각, `--bf-x/--bf-y/--bf-r` CSS 변수 + `position:absolute`
  - 글로우: 헤더 영역에 `bf-celebrate` 클래스 1.6s × 2회
  - reduce-motion: `@media (prefers-reduced-motion: reduce)` 에서 `bf-celebrate { animation: none; }` + `.bf-confetti-piece { display: none; }`
  - 정리: 두 개의 `setTimeout` (confetti `CONFETTI_DURATION_MS + 200`, glow `CELEBRATE_GLOW_DURATION_MS`) 모두 `clearTimeout` cleanup
- **`globals.css` 신규 keyframes** (`apps/frontend/src/app/globals.css`):
  - `@keyframes bfConfettiBurst` (1.4s cubic-bezier, opacity 1→0, translate/scale/rotate via CSS 변수)
  - `@keyframes bfCelebrateGlow` (1.6s, box-shadow 0 → 6px rgba(99,102,241,0.18) → 0)
  - `.bf-confetti-piece` (8×8px, border-radius 2px, pointer-events:none, position:absolute)
  - `.bf-celebrate` (animation: bfCelebrateGlow 1.6s ease-out 2)
  - `@media (prefers-reduced-motion: reduce)` 양쪽 무효화
- **테스트 매트릭스 (총 11건, 13→24)**:
  - a11y 6: `role="navigation"` + `aria-label` 존재, `aria-current="step"` 현재 단계만, `aria-describedby` 툴팁 연결, 단계 `<ol>` `aria-label`, 토글 버튼 `aria-label`, AI/dismiss 버튼 `aria-label`
  - 키보드 4: ArrowRight 다음 단계 포커스, ArrowLeft 이전 단계 포커스, Home 첫 단계, End 마지막 단계
  - 완주 1: 미완→완료 전이 시 toast.success 호출 + localStorage `av:bf-stepper:completed:{flowId}` set + 재마운트 시 재발사 안 함 (8차에서 키 prefix `av:bf-stepper:completed:` 로 일관성 정리)

#### 8차 PDCA — business-flow-stepper 모듈 분리 사양 (2026-05-03)

> 목표: 7차 PDCA로 `business-flow-stepper.tsx` 가 552 LOC 까지 증가 → 500 LOC 코드 품질 게이트(`av-base-code-quality-gates.md` §1.3) 위반 직전. 기능 변경 0건으로 책임 분리 → 412 LOC 로 수렴.

- **컴포넌트 메인**: `apps/frontend/src/components/ai/business-flow-stepper.tsx` — 552 → **412 LOC** (게이트 ✅ < 500)
  - 잔존 책임: BusinessFlow 데이터 fetch (`api.getBusinessFlow`), suggest mutation, 진행 상태 prop wiring, collapse state, overdue 계산, 마크업 컴포지션
- **분리 파일 1 — `apps/frontend/src/lib/hooks/use-flow-celebration.ts` (132 LOC)**:
  - export `useFlowCelebration({ flowId, flowName, flowComplete })` → `{ celebrating: boolean, confetti: ConfettiPiece[] }`
  - export `isFlowComplete(steps, currentStepId, completedSet | null)` 헬퍼 — 서버 동기화 모드면 `completedSteps` 가 모든 step.id 포함, 아니면 `currentStepId === lastStepId`
  - export `interface ConfettiPiece { id, color, x, y, rotate, delay }`
  - 내부: `COMPLETION_STORAGE_PREFIX = 'av:bf-stepper:completed:'`, `CONFETTI_COUNT = 14`, `CONFETTI_DURATION_MS = 1400`, `CELEBRATE_GLOW_DURATION_MS = 3200`, `generateConfetti(seed)` 결정적 의사난수 (Date.now 회피), `readCelebratedState`/`writeCelebratedState` `try/catch` 가드(SSR + QuotaExceeded)
  - 트리거: `prevFlowCompleteRef.current === false && flowComplete === true` 전이 시점만 (첫 마운트 prev=null 또는 이미 완료 prev=true 는 skip)
- **분리 파일 2 — `apps/frontend/src/lib/hooks/use-stepper-keyboard.ts` (63 LOC)**:
  - export `useStepperKeyboard({ steps, listRef })` → `{ handleStepKeyDown(event, idx) }`
  - 입력: `steps: BusinessFlowStep[]`, `listRef: RefObject<HTMLOListElement | null>`
  - 키 매핑: `ArrowRight`/`ArrowDown` → +1, `ArrowLeft`/`ArrowUp` → -1, `Home` → 절대 0, `End` → 절대 length-1
  - 위임 셀렉터: `[data-testid="business-flow-step-{step.id}"]` → `.focus()`
  - 경계 보호: `focusStepByOffset` 가 `targetIdx < 0 || targetIdx >= steps.length` 시 early return (wrap 없음)
- **분리 파일 3 — `apps/frontend/src/components/ai/business-flow-step-chip.tsx` (71 LOC)**:
  - export `BusinessFlowStepChip({ step, idx, totalSteps, isCurrent, isPast, isFuture, tooltipId, onSelect, onKeyDown })`
  - 마크업: `<li><button>` 단계 칩 + 마지막 칩 외에는 우측 `ArrowRight` 분리자 (`aria-hidden`)
  - ARIA/data-*: `aria-current={isCurrent ? 'step' : undefined}`, `aria-describedby={tooltipId}`, `aria-label="${idx+1}/${totalSteps} ${step.label}${stateLabel}"`, `data-testid="business-flow-step-${step.id}"`, `data-current="true"|undefined`, `data-completed="true"|undefined`
  - focus-visible: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1`
  - 아이콘: past=`CheckCircle2`, current/future=`Circle` (current 는 불투명, future 는 50% opacity)
- **검증 매트릭스**:
  - FE 205/205 PASS (회귀 0, business-flow-stepper.test.tsx 24/24 그대로 — 테스트 코드 변경 0)
  - BE 673/673 PASS (BE 변경 0)
  - 신규 3 파일 lint 0 errors, typecheck 0 errors
  - 코드 품질 게이트: stepper.tsx 412 LOC < 500 ✅
- **localStorage 키 prefix 정합화**: 7차에서 본문 spec 에 `av:bf-completed:{flowId}` 표기 → 8차에서 분리된 `use-flow-celebration.ts` 가 실제로 사용하는 `av:bf-stepper:completed:{flowId}` prefix 로 정합화 (테스트도 같은 prefix 사용 → drift 0)
- **커밋**: `3b46667 refactor(fe): business-flow-stepper 8차 PDCA — 3 모듈로 분리 (552→412 LOC)`

### 10. AI 플로우 인사이트 + 병목 감지 (FlowInsightsPanel) — 9차 PDCA 신규

> 파일: `apps/frontend/src/components/ai/flow-insights-panel.tsx` (162 LOC)
> BE 집계 모듈: `apps/backend/src/modules/business-flows/insights.ts` (178 LOC, 순수 함수 + AI 프롬프트 빌더 + 결정적 fallback)
> 배치: `apps/frontend/src/components/screens/dashboard.tsx` 메트릭 행 직후, FlowProgressSummary 위에 통합. 기본 분석 대상: `project-lifecycle`.

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 단계별 평균 체류일 (avgDwellDays) | `(now - stepStartedAt)` 평균을 단계 카드별로 소수 1자리 표기. 멤버 0이면 0. | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts ✅ |
| 단계별 오버듀 비율 (overdueRatio) | `dwellDays > step.expectedDays` 인 멤버 비율(0..1, 100% 환산 표기). expectedDays 없으면 0. | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts ✅ |
| 단계별 멤버 수 (memberCount) | 현재 그 단계에 머물고 있는 활성 사용자 수 (deletedAt:null) | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts ✅ |
| 병목 단계 강조 (red ring + AlertTriangle) | (overdueRatio desc, avgDwellDays desc) 1순위. 멤버가 모두 0이면 `bottleneckStepId=null`. | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts (정렬 결정성) · flow-insights-panel.test.tsx ✅ |
| AI 한국어 2문장 설명 박스 (Sparkles) | (1) 병목 현황 요약, (2) 매니저 권장 액션. 라우트 내부 try/catch + adapter.complete(`maxTokens:200, temperature:0.3`). 실패 시 결정적 fallback(`buildFallbackExplanation`) → 위젯 항상 렌더 보장. | ✅ | 🔗 GET /business-flows/:id/insights | 🧪 insights.test.ts (프롬프트 빌더 + fallback) · business-flows.routes.test.ts ✅ |
| silent fallback (loading/error) | `isLoading` 시 Loader2 스피너만, `error || data===null` 이면 위젯 비표시 — 대시보드 회귀 차단 | ✅ | 🔌 (TanStack Query) | 🧪 flow-insights-panel.test.tsx ✅ |

#### 9차 PDCA — Flow Insights 사양

- **신규 BE 모듈**: `apps/backend/src/modules/business-flows/insights.ts` (178 LOC) — `aggregateFlowInsight(flow, rows, activeUserIds, now=new Date())` 순수 함수 (시간 주입 → 결정적 단위 테스트), `buildInsightPrompt(flow, insight)` system+user 프롬프트 빌더, `buildFallbackExplanation(flow, insight)` 정량 정보 기반 한국어 2문장 fallback
- **신규 BE 엔드포인트**: `GET /business-flows/:id/insights` (인증 필수)
  - flow 미존재 → `NotFoundError` 404
  - `prisma.userFlowProgress.findMany({ where: { flowId } })` + `prisma.user.findMany({ id IN, deletedAt: null })` 활성 사용자 필터
  - `aggregateFlowInsight(flow, rows, activeIds)` → AI 호출 → 실패 시 fallback
  - 응답: `{ flowId, totalMembers, steps: FlowInsightStep[], bottleneckStepId: string|null, aiExplanation: string }`
- **신규 FE 컴포넌트**: `apps/frontend/src/components/ai/flow-insights-panel.tsx` (162 LOC)
  - `useQuery(['flow-insights', flowId], api.getBusinessFlowInsights, { staleTime: 30s })`
  - `error || data === null` 이면 `return null` (silent fallback)
  - 단계 카드: 멤버 수, 평균 체류일, 오버듀 % — 병목 단계만 red ring + AlertTriangle 아이콘
  - AI 박스: Sparkles 아이콘 + 한국어 2문장
  - data-testid: `flow-insights-panel`
- **신규 FE API 클라이언트**: `apps/frontend/src/lib/api/extended.ts`
  - `api.getBusinessFlowInsights(flowId): Promise<FlowInsight>`
  - export `interface FlowInsight { flowId, totalMembers, steps, bottleneckStepId, aiExplanation }`
  - export `interface FlowInsightStep { stepId, label, memberCount, avgDwellDays, overdueRatio, isBottleneck }`
- **dashboard.tsx 통합**: `<FlowInsightsPanel />` 1회 마운트 — 메트릭 행 직후, FlowProgressSummary 바로 위
- **정책 요약**:
  - 평균 체류일 = `(now - stepStartedAt)` 평균 (현 단계 머무는 멤버만 집계)
  - 오버듀 비율 = `dwellDays > expectedDays` 인 멤버 비율 (expectedDays 없거나 0이면 항상 0)
  - 병목 결정 = 멤버≥1 + (overdueRatio desc, avgDwellDays desc) 1순위 / 모두 0이면 null
  - AI 호출 실패 / 빈 응답 / adapter 미등록 → fallback 문장
  - soft-deleted 사용자 제외 → 통계 노이즈 차단
- **테스트 매트릭스 (총 19건 신규)**:
  - BE 9 단위 (`insights.test.ts`, 시간 고정 결정적): 멤버 0 / 단일 단계 / 다단계 균형 / 오버듀 정렬 / expectedDays=0 우회 / fallback 문장(빈 팀 / 병목 있음) / 프롬프트 빌더 분기 2건
  - BE 5 통합 (`business-flows.routes.test.ts` +5): 인증 필수 / unknown flow 404 / 빈 데이터 → 빈 단계 + fallback / 활성 사용자 필터 / AI 응답 사용 (mock adapter)
  - FE 5 RTL (`flow-insights-panel.test.tsx`): isLoading 스피너 / error null 폴백 / 병목 강조 ring + AlertTriangle / AI 텍스트 렌더 / 단계 카드 멤버 수·% 표기
- **회귀**: 8차 도입분(stepper 모듈 분리) 그대로 PASS, 4·5·6·7차 도입분 모두 그대로 PASS
- **커밋**: `1400ea7 feat(business-flow): 9차 PDCA — Flow Insights Panel + AI 병목 감지`

### 12. Playwright E2E 회귀 가드 (BusinessFlowStepper) — 11차 PDCA 최종 완결

> 파일: `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` (190 LOC, 6 시나리오)
> 리포트: `docs/04-report/business-flow-stepper-11th-final-2026-05-03.report.md` (88 LOC)
> 커밋: `30ec17b test(business-flow): 11차 PDCA 최종 완결 — E2E 회귀 가드 6 시나리오`
> 결과: **6/6 PASS · 22.5s · retries=0 · biome 0 errors**
>
> 1~10차에서 누적된 모든 BusinessFlowStepper 동작을 영구 회귀 가드로 고정. **비즈니스 플로우 스텝퍼 기능의 최종 완결 사이클** — 더 이상의 사이클 추가 없이 본 6 시나리오가 영구 안전망 역할을 한다.

| # | 시나리오 | 검증 자산 | 구현 | 테스트 |
|---|---------|----------|------|--------|
| 1 | 5단계 칩 렌더링 | `기획`/`킥오프`/`실행`/`검토`/`마무리` 라벨 + `1/5 단계` 텍스트 | ✅ | 🧪 business-flow-stepper.spec.ts ✅ |
| 2 | 진행률 텍스트 + 막대 | `data-testid="business-flow-progress-text"` (`%` 포함) + `data-testid="business-flow-progress-bar"` 가시성 | ✅ | 🧪 business-flow-stepper.spec.ts ✅ |
| 3 | collapse 토글 + reload 영속성 | `data-collapsed` 속성 + `aria-expanded` 토글 + `localStorage av:bf-stepper:collapsed:{flowId}` reload 후 유지 | ✅ | 🧪 business-flow-stepper.spec.ts ✅ |
| 4 | 키보드 → 단계 이동 | `ArrowRight` 키로 `document.activeElement` 전환 (다음 단계 칩) | ✅ | 🧪 business-flow-stepper.spec.ts ✅ |
| 5 | AI 다음 단계 제안 | `page.route('**/business-flows/*/suggest')` 인터셉트 → `data-testid="business-flow-suggestion"` 노출 또는 `AI 다음 단계 제안을 가져오지 못했습니다` 토스트 fallback | ✅ | 🧪 business-flow-stepper.spec.ts ✅ |
| 6 | Bell 배지 / overdue 배너 | 데이터 노출 시에만 `aria-label="이 플로우에 미확인 지연 알림 N건"` + `data-testid="business-flow-overdue-warning"` `표준 일수` 텍스트 검증 (false-negative 회피) | ✅ | 🧪 business-flow-stepper.spec.ts ✅ |

#### 11차 PDCA — E2E 회귀 가드 사양

- **테스트 진입점**: `/projects` 페이지 (BusinessFlowStepper 가 mount 되는 9개 화면 중 가장 안정적인 진입점)
- **beforeEach 셋업**:
  - `goto(PROJECTS, { waitUntil: 'domcontentloaded' })`
  - `expect(stepper).toBeVisible({ timeout: 30_000 })` — Next.js dev hydration 대기
  - `expect(progressText).toBeVisible({ timeout: 15_000 })` — 완전한 hydration 보장
  - localStorage 정리: `av:bf-stepper:` / `av:bf-celebrate:` 접두사 키 일괄 삭제 (테스트 간 영속 상태 누수 방지)
- **콘솔 에러 가드**: `_helpers.ts NOISY` 필터 적용 (기존 메뉴 E2E 와 동일 정책)
- **핵심 학습 패턴 (11차에서 신규 정립)**:
  1. **dev hydration 경합 해결** — `expect.poll` + `click({ force: true })` 폴 패턴: Next.js dev 모드 첫 렌더에서 React 이벤트 리스너가 미부착된 case 자동 복구. `await expect.poll(async () => { await toggle.click({ force: true }).catch(()=>{}); return await stepper.getAttribute('data-collapsed'); }, { timeout: 10_000, intervals: [500, 1000, 1500] }).toBe('true')`
  2. **결정론적 LLM 응답** — `page.route('**/business-flows/*/suggest', async (route) => { await route.fulfill({ status: 200, body: JSON.stringify({ flowId, currentStep, nextStep, suggestion, adapter: 'mock-e2e' }) }) })`: 실 LLM 호출 우회 → CI 시간 30s → 3s 단축, 테스트 결과 안정
  3. **localStorage 정리 헬퍼** — `beforeEach` 에서 `for (key of localStorage) if (key.startsWith('av:bf-stepper:') || key.startsWith('av:bf-celebrate:')) remove(key)`: collapse / celebration 영속 상태 누수 방지
  4. **데이터 의존 단언 가드** — `if (await bell.isVisible({ timeout: 1_000 }).catch(() => false)) { await expect(bell).toHaveAttribute('aria-label', /미확인 지연 알림/) }`: Bell 배지/overdue 배너처럼 데이터 의존 UI 는 `isVisible` 분기 → 시드 상태에 따른 false-negative 회피
- **갭 분석 (final)**: 11차 누적 기능(스텝 칩/진행률/collapse/키보드/AI 제안/Bell 배지/overdue/축하/onboarding/insights/team progress) 모두 구현 + 단위 테스트 + (신규) E2E 가드. 데이터 흐름(FE catalog ↔ BE flow-registry mirror) 정합. **누락 시나리오 없음 — 11차 PRD Acceptance 항목 모두 가드**.
- **코드 품질 (스코프 한정)**: `business-flow-stepper.tsx` 434 LOC < 500 LOC 게이트 ✅, biome 0 errors

### 11. 알림 센터 연동 (Flow Alerts) — 10차 PDCA 신규

> BE 모듈: `apps/backend/src/modules/business-flows/flow-alerts.ts` (111 LOC, overdue 판정 + 알림 데이터 빌더 + dedup 헬퍼)
> FE 훅: `apps/frontend/src/lib/hooks/use-flow-alerts.ts` (55 LOC, 추가 네트워크 호출 0)
> 헤더 배지: `apps/frontend/src/components/ai/business-flow-stepper.tsx` 헤더에 amber Bell — `/notifications` 이동
> 협업 업무 진행 플로우 시각화 + AI 다음 단계 제안의 알림 센터 연동. 단계 표준 일수(`expectedDays`) 초과를 알림 센터에 자동 누적, AI 제안을 옵션 저장, 스테퍼 헤더 즉시 카운트.

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| overdue 자동 알림 (PATCH 사이드 이펙트) | PATCH `/business-flows/:id/progress` 사이드 이펙트로 `flow-alerts.computeOverdue(stepStartedAt, expectedDays, now)` → 초과 시 `Notification(kind='flow_overdue', title="{flow.name} — \"{step.label}\" 단계 지연", body="표준 일수 ... 초과", href=step.screen)` 자동 생성 | ✅ | 🔗 PATCH /business-flows/:id/progress (사이드 이펙트) | 🧪 business-flows.routes.test.ts (10차 +5: 자동 생성) ✅ |
| 하루 1회 dedup | `(userId, kind='flow_overdue', screen=step.screen, today UTC 자정 이후 createdAt, body 에 step label 포함)` 기준 `findFirst` 로 동일 사용자/단계/날짜의 중복 알림 차단 | ✅ | 🔗 PATCH /business-flows/:id/progress | 🧪 business-flows.routes.test.ts (10차 +5: dedup) ✅ |
| AI 제안 저장 옵션 | POST `/business-flows/:id/suggest` 에 `saveToNotifications?: boolean` 옵션 — `true` 시 AI 응답을 `Notification(kind='ai', href=nextStep.screen ?? currentStep.screen)` 으로 저장 + 응답에 `notificationId: string` 포함. 기본값 `false`(저장 없음) | ✅ | 🔗 POST /business-flows/:id/suggest | 🧪 business-flows.routes.test.ts (10차 +5: saveToNotifications true / 기본 false) ✅ |
| `useFlowAlerts(flow?)` 훅 | `useNotifications()` 결과에서 `kind==='flow_overdue' && !read` 필터 + (선택) `flow.steps.map(s=>s.screen)` Set 으로 `n.href` 매칭 → `{ unreadCount, latest: { id, title, href?, time } \| null }` 메모. **추가 네트워크 호출 0** | ✅ | 🔗 (기존 `GET /notifications` 재사용) | 🧪 use-flow-alerts.test.tsx (4/4) ✅ |
| 헤더 amber Bell 배지 | `BusinessFlowStepper` 헤더에 `flowAlerts.unreadCount > 0` 일 때 amber Bell + 카운트(`tabular-nums`) — 클릭 시 `/notifications` 이동. `data-testid="business-flow-alerts-badge"`, `aria-label`, focus-visible amber ring | ✅ | 🔌 (FE 마크업) | 🧪 use-flow-alerts.test.tsx + business-flow-stepper.test.tsx ✅ |
| Contract 4 계층 동기화 | `NotificationKind` enum 에 `flow_overdue` 추가 — `packages/contracts/openapi.yaml` SOR + Prisma `NotificationKind` enum + `apps/backend/src/shared/schemas/api.generated.ts` zod + `apps/frontend/src/lib/api-types.gen.ts` TS literal union + `apps/frontend/src/lib/schemas.ts` FE zod | ✅ | 🔗 (4 계층 SOR) | 🧪 schemas.test.ts (8/8) + frontend-contract.test.ts (10/10) PASS ✅ |

#### 10차 PDCA — 알림 센터 연동 사양

- **신규 BE 모듈**: `apps/backend/src/modules/business-flows/flow-alerts.ts` (111 LOC)
  - `computeOverdue(stepStartedAt, expectedDays, now=new Date()): { overdue, daysElapsed, daysOver }` — 순수 함수 (시간 주입 → 결정적). `expectedDays` 미정의/0 이면 비활성 (안전 fallback).
  - `buildOverdueNotificationData({ userId, flow, step, daysOver })` — `kind: 'flow_overdue'`, `title: "{flow.name} — \"{step.label}\" 단계 지연"`, `body: "표준 일수({step.expectedDays}일)를 {daysOver}일 초과했습니다. {step.action}을 진행해 주세요."`, `href: step.screen`
  - `buildSuggestNotificationData({ userId, flow, currentStep, nextStep, suggestion })` — `kind: 'ai'`, `title: "{flow.name} — 다음 단계 제안: {nextStep.label}"` 또는 `"{flow.name} 마무리 제안"`, `body: suggestion`, `href: nextStep?.screen ?? currentStep.screen`
  - `shouldCreateOverdueNotification(finder)` — 호출자가 prisma `findFirst` 결과를 주입, `null` 이면 새로 생성, 아니면 dedup
  - `todayWindowStart(now=new Date()): Date` — `setUTCHours(0,0,0,0)` 으로 UTC 자정. dedup 윈도우 시작점.
- **PATCH `/business-flows/:id/progress` 사이드 이펙트** (`apps/backend/src/modules/business-flows/business-flows.routes.ts`):
  - 진행 상태 upsert 직후 `currentStepId` 의 step 정의 + `stepStartedAt` 으로 `computeOverdue` 호출
  - overdue=true 이면 `prisma.notification.findFirst({ where: { userId, kind:'flow_overdue', href: step.screen, createdAt: { gte: todayWindowStart() }, body: { contains: step.label } } })` 로 dedup 검사
  - 없으면 `buildOverdueNotificationData` 결과로 `prisma.notification.create`
  - 기존 `200 OK` 응답에 영향 없음 (사이드 이펙트만 추가)
- **POST `/business-flows/:id/suggest` 옵션 추가**:
  - 입력 zod: `{ currentStepId: string, screen?: string, saveToNotifications?: boolean }`
  - `saveToNotifications === true` 일 때만 AI 응답 후 `prisma.notification.create({ data: buildSuggestNotificationData(...) })` 호출 → 응답에 `notificationId: string` 포함
  - 기본값(`false`/미지정): 응답에 `notificationId` 없음 (`undefined`)
- **신규 Prisma migration**: `apps/backend/prisma/migrations/20260503050000_add_flow_overdue_notification_kind/migration.sql` — `ALTER TYPE "NotificationKind" ADD VALUE 'flow_overdue'`
- **신규 FE 훅**: `apps/frontend/src/lib/hooks/use-flow-alerts.ts` (55 LOC)
  - `useFlowAlerts(flow?: BusinessFlow): FlowAlertsResult`
  - `useMemo` 로 필터 + 정렬(`Date.parse(b.time) - Date.parse(a.time)` desc) + top 1 추출
  - flow 미지정 시 전체 `flow_overdue` 카운트 (대시보드 등 전역 사용 가능)
  - **추가 네트워크 호출 0** — 기존 `useNotifications()` 결과 재사용
- **BusinessFlowStepper 헤더 통합** (`apps/frontend/src/components/ai/business-flow-stepper.tsx`):
  - `const flowAlerts = useFlowAlerts(flow)` 첫 import
  - 헤더에 `flowAlerts.unreadCount > 0` 일 때 `<a href="/notifications" data-testid="business-flow-alerts-badge" data-alert-count={count} aria-label="이 플로우에 미확인 지연 알림 N건" title={latest.title}>` 노출
  - amber Bell 아이콘(`size={10}`) + 카운트 (`tabular-nums`)
  - amber 색상 (border `amber-500/40`, bg `amber-500/10`, text `amber-700 dark:amber-400`)
  - focus-visible amber ring
  - 0건이면 비표시 — AI 제안 버튼이 `ml-auto` 로 자연 fallback
- **Contract 4 계층 동기화**:
  - `packages/contracts/openapi.yaml`: `NotificationKind: { enum: [mention, sla, ai, system, comment, flow_overdue] }`
  - `apps/backend/src/shared/schemas/api.generated.ts`: `kind: z.enum(["mention", "sla", "ai", "system", "comment", "flow_overdue"])`
  - `apps/frontend/src/lib/api-types.gen.ts`: `kind: "mention" | "sla" | "ai" | "system" | "comment" | "flow_overdue"`
  - `apps/frontend/src/lib/schemas.ts`: `kind: z.enum(['mention', 'sla', 'ai', 'system', 'comment', 'flow_overdue'])`
- **테스트 매트릭스 (총 9건 신규)**:
  - BE 5 통합 (`business-flows.routes.test.ts` +5):
    1. PATCH 후 expectedDays 초과 → flow_overdue 알림 자동 생성
    2. 같은 단계 PATCH 다시 → 같은 날 dedup (알림 1건만 유지)
    3. expectedDays 미만이면 알림 없음
    4. POST suggest `saveToNotifications: true` → kind=ai 알림 생성 + 응답 notificationId
    5. 기본값 false → 알림 미생성 + 응답 notificationId 없음
  - FE 4 단위 (`use-flow-alerts.test.tsx`):
    1. 단계 화면 매칭 (flow.steps.screen Set 으로 href 매칭)
    2. 전체 합산 (flow 미지정 시)
    3. 읽음(`read===true`) 알림 제외
    4. 다른 kind (`mention`/`sla`/`ai`/`system`/`comment`) 제외
- **회귀**: 9차 도입분(`flow-insights-panel.tsx`, `insights.ts`, GET insights 엔드포인트) 그대로 PASS, 4·5·6·7·8차 도입분 모두 그대로 PASS, frontend-contract 10/10 PASS
- **커밋**: `769ee38 feat(business-flow): 10차 PDCA — 알림 센터 연동 (overdue 자동 + AI 제안 저장 + FE useFlowAlerts)`

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 추천 질문 칩 동적화 | 현재 화면/데이터 기반 동적 추천 (현재 하드코딩) | 중 |
| AI 패널 E2E 테스트 | ai-panel Playwright 커버리지 없음 | 중 |
| 대화 내보내기 | 스레드를 MD/PDF로 내보내기 | 낮음 |
| 스레드 검색 | 이전 대화 내용 검색 | 낮음 |
| 음성 출력 (TTS) | AI 응답 음성 읽기 | 낮음 |

## 테스트 실행 결과 (2026-05-04 11차 PDCA — 비즈니스 플로우 스텝퍼 최종 완결: E2E 회귀 가드 6 시나리오)

> ✅ **11차 PDCA 최종 완결** (커밋 `30ec17b`) — 비즈니스 플로우 스텝퍼 기능의 마지막 사이클. 1~10차 누적 동작을 영구 회귀 가드로 고정.

- BE vitest: **692/692 PASS** (10차 동일 — 11차는 E2E 추가만, BE 코드 변경 0)
- FE vitest: **252/252 PASS** (10차 동일 — 11차는 E2E 추가만, FE 단위 코드 변경 0)
- **E2E (Playwright): 6/6 PASS — `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` (190 LOC, 22.5s, retries=0, biome 0 errors)**
- 직접 측정 (2026-05-04): `pnpm --filter backend vitest run` 65 files / 692 passed · `pnpm --filter frontend vitest run` 25 files / 214 passed · `npx playwright test menus/business-flow-stepper.spec.ts` 6/6 passed
- 10차 신규 산출물:
  - BE — `apps/backend/src/modules/business-flows/flow-alerts.ts` 111 LOC (`computeOverdue` 순수 함수 + `buildOverdueNotificationData` / `buildSuggestNotificationData` 데이터 빌더 + `shouldCreateOverdueNotification` / `todayWindowStart` dedup 헬퍼)
  - BE — Prisma migration `20260503050000_add_flow_overdue_notification_kind` (`NotificationKind` enum 에 `flow_overdue` 추가)
  - BE — PATCH `/business-flows/:id/progress` 사이드 이펙트 — `expectedDays` 초과 시 `flow_overdue` 알림 자동 생성 + `(userId, kind, screen, today UTC 자정, body 에 step label)` 기준 하루 1회 dedup
  - BE — POST `/business-flows/:id/suggest` 에 `saveToNotifications?: boolean` 옵션 — `true` 일 때 AI 제안을 `kind=ai` 알림으로 저장 + 응답 `notificationId`
  - FE — `apps/frontend/src/lib/hooks/use-flow-alerts.ts` 55 LOC (추가 네트워크 호출 0)
  - FE — `BusinessFlowStepper` 헤더 amber Bell 배지 (`/notifications` 이동, `data-testid="business-flow-alerts-badge"`)
  - Contract — 4 계층 동기화 (`openapi.yaml` + `api.generated.ts` + `api-types.gen.ts` + `schemas.ts`) `NotificationKind.flow_overdue`
- 회귀: 10차 도입분(`flow-alerts.ts`, Prisma `NotificationKind.flow_overdue`, PATCH overdue 사이드 이펙트, POST suggest `saveToNotifications?`, `useFlowAlerts`, 헤더 amber Bell 배지, 4 계층 contract 동기화) 모두 그대로 PASS, 9차/8차/7차/6차/5차/4차 도입분 모두 그대로 PASS, frontend-contract 10/10 PASS
- 11차 신규 산출물:
  - E2E — `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` 190 LOC (6 시나리오, biome 0 errors)
  - 리포트 — `docs/04-report/business-flow-stepper-11th-final-2026-05-03.report.md` 88 LOC
- 11차 핵심 패턴 (학습 보존):
  - **dev hydration 경합 해결**: `expect.poll` + `click({ force: true })` 폴 패턴 — Next.js dev 모드 첫 렌더 React 이벤트 리스너 미부착 케이스 자동 복구
  - **결정론적 LLM 응답**: `page.route('**/business-flows/*/suggest')` 인터셉트로 실 LLM 호출 우회 → CI 시간 30s → 3s
  - **localStorage 정리 헬퍼**: `beforeEach` 에서 `av:bf-stepper:` / `av:bf-celebrate:` 접두사 키 일괄 삭제 → 테스트 간 영속 상태 누수 방지
  - **데이터 의존 단언 가드**: Bell 배지 / overdue 배너처럼 데이터 의존 UI 는 `isVisible` 분기 → false-negative 회피
- 커밋: `769ee38` (10차) → `30ec17b` (11차 최종 완결)

## 백엔드 연결 검증 결과 (2026-05-04 11차 PDCA — 최종 완결)

| 항목 | 결과 |
|------|------|
| AI 채팅 (SSE) | ✅ `POST /ai/complete` (실제 엔드포인트 — `/ai/chat` 아님). FE `lib/hooks/use-ai.ts` SSE accumulator 패턴 |
| AI 스레드 CRUD | ✅ `/ai/threads` GET/POST/DELETE + `/ai/threads/:id/messages` GET — ai-thread.routes 9/9 PASS |
| 첨부파일 | ✅ `POST /ai/attachments` — ai-attachment.routes 4/4 PASS |
| MCP 연동 | ✅ `/ai/mcp-connections` — mcp-connection.routes 8/8 PASS |
| LLM 모델 | ✅ `/llm-connections` — llm-connections.routes 다수 PASS |
| RAG / 시맨틱 검색 | ✅ `POST /search/semantic` — search.routes 8/8 PASS |
| 웹 검색 | ✅ Brave/SearxNG provider — web-search-adapter 테스트 통과 |
| 툴 호출 루프 | ✅ tool-loop.ts 3/3 + extract-actions 8/8 PASS |
| FE 단위 테스트 | ✅ use-ai 9/9, use-file-attach 8/8, use-voice-input 6/6, use-resize-drag 6/6, use-admin 3/3, **business-flow-stepper 24/24 (7차 +11: a11y 6 + 키보드 4 + 완주 축하 1)**, use-business-flow-progress 4/4, flow-progress-summary 5/5, business-flow-onboarding 5/5 (6차 신규) PASS |
| 비즈니스 플로우 API | ✅ `GET /business-flows`, `GET /business-flows/:id`, `POST /business-flows/:id/suggest` (10차: `saveToNotifications?: boolean` 옵션 + `notificationId?: string` 응답) — 9개 화면(대시보드·프로젝트·태스크·이슈·간트·결재·문서·주간보고·월간보고) 통합 |
| **비즈니스 플로우 진행 상태 API (4차 PDCA 3건)** | ✅ `GET /business-flows/progress` (전체) · `GET /business-flows/:id/progress` (단일, 행 없으면 `{flowId, progress:null}`) · `PATCH /business-flows/:id/progress` (멱등 upsert, currentStepId 검증, completedSteps dedupe+sort, **6차 PDCA: `stepStartedAt` 응답 wire 포함 + `currentStepId` 실제 변경 시에만 갱신**) — business-flows.routes 23/23 PASS |
| **팀 진행 현황 API (5차 PDCA 신규)** | ✅ `GET /business-flows/team-progress` — 옵션 `?flowId=` 단일 플로우 필터, soft-deleted user 제외, 서버에서 progressRatio 계산 (완료 단계 ÷ 전체 단계, 0..1), 결과 최대 200건, `(flowId asc, updatedAt desc)` 정렬, unknown flowId → 404, 인증 없음 → 401, 응답 `{ team: TeamFlowProgressEntry[] }` (6차 PDCA: `stepStartedAt` 도 응답에 포함) |
| **`useBusinessFlowProgress` 훅 (4차 PDCA)** | ✅ `apps/frontend/src/lib/hooks/use-business-flow-progress.ts` — TanStack Query useQuery+useMutation, 401/네트워크 silent fallback, fallbackCurrentStepId 자동 등록(useEffect 가드), staleTime 30s — use-business-flow-progress.test.tsx 4/4 PASS |
| **`enableServerSync=true` 9개 화면 전체 롤아웃 (5차 PDCA)** | ✅ dashboard/projects/tasks/issues/gantt/approvals/docs/report-weekly/report-monthly 모든 BusinessFlowStepper 인스턴스가 활성화. 4차 단독 적용(projects) → 5차 9/9 완결 |
| **FlowProgressSummary 위젯 (5차 PDCA 신규)** | ✅ `apps/frontend/src/components/ai/flow-progress-summary.tsx` — 대시보드 메트릭 행 직후 배치, 진행 중/완료 카테고리 분리, progressRatio 막대 + %, 빈/실패 silent fallback, `maxPerCategory` 초과 시 "+N명 더 보기" — flow-progress-summary.test.tsx 5/5 PASS |
| **`api.getTeamFlowProgress` (5차 PDCA 신규)** | ✅ `apps/frontend/src/lib/api/extended.ts` — `getTeamFlowProgress(flowId?)` + `TeamFlowProgressEntry` 타입 export |
| **`stepStartedAt` Prisma 컬럼 (6차 PDCA 신규)** | ✅ `UserFlowProgress.stepStartedAt: DateTime @default(now()) @map("step_started_at")` — `apps/backend/prisma/schema.prisma`. PATCH 라우트가 `currentStepId` 가 실제로 바뀐 경우에만 `now()` 로 갱신 (같은 단계 내 멱등 PATCH 보존). 응답 wire 에 `stepStartedAt: ISO string` 추가. business-flows.routes 23/23 PASS |
| **`flow-registry.expectedDays` 22단계 전체 (6차 PDCA)** | ✅ `apps/backend/src/modules/business-flows/flow-registry.ts` — 5개 표준 플로우의 22단계 전체에 `expectedDays` 부여 (1~30일). 합계: project 43일 / task 8일 / approval 4일 / issue 4일 / report 10일 |
| **단계 완료 toast / overdue amber 경고 (6차 PDCA)** | ✅ `apps/frontend/src/components/ai/business-flow-stepper.tsx` — sonner `toast.success(\`다음 단계: {label}\`)` 자동 + AI 자동 제안 + `(now - stepStartedAt) > expectedDays * 86_400_000` overdue 칩 amber 색상 — business-flow-stepper.test.tsx 24/24 PASS |
| **BusinessFlowOnboarding 컴포넌트 (6차 PDCA)** | ✅ `apps/frontend/src/components/ai/business-flow-onboarding.tsx` — 1회성 popover, localStorage `av:bf-onboarding:done` 키, dismissible, non-blocking, SSR safe — business-flow-onboarding.test.tsx 5/5 PASS |
| **스테퍼 a11y / 키보드 / 완주 축하 (7차 PDCA 신규)** | ✅ `apps/frontend/src/components/ai/business-flow-stepper.tsx` — `role="navigation"` + `aria-label` + `aria-current="step"` + `aria-describedby={tooltipId}` (sr-only `role="tooltip"`) + `useId` ID 생성 + 키보드 핸들러 ←/→/↑/↓/Home/End (`handleStepKeyDown` + `data-testid="business-flow-step-{id}"` 위임 focus) + 모든 인터랙티브에 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` + 미완→완료 전이 시 `toast.success` + CSS confetti — business-flow-stepper.test.tsx 24/24 PASS (7차 +11) |
| **`globals.css` 신규 keyframes (7차 PDCA 신규)** | ✅ `apps/frontend/src/app/globals.css` — `@keyframes bfConfettiBurst` (1.4s, translate/scale/rotate via `--bf-x`/`--bf-y`/`--bf-r` CSS 변수), `@keyframes bfCelebrateGlow` (1.6s, box-shadow halo), `.bf-confetti-piece` (8×8 absolute), `.bf-celebrate` (1.6s × 2), `@media (prefers-reduced-motion: reduce)` 양쪽 무효화. 외부 confetti 라이브러리 의존성 0 |
| **완주 축하 영구 1회 가드 (7차 PDCA 신규)** | ✅ localStorage 키 `av:bf-completed:{flowId}` — `readCelebratedState`/`writeCelebratedState` 헬퍼(SSR/QuotaExceeded `try/catch`). 첫 마운트가 이미 완료 상태(`prev===null` 후 `flowComplete===true`)는 skip → 새 사용자 첫 진입 시 즉시 발사 회피, 미완→완료 전이 시점만 발사 |
| 8차 PDCA — business-flow-stepper 모듈 분리 (2026-05-03) | ✅ `business-flow-stepper.tsx` 552→412 LOC (게이트 ✅ < 500). 3 신규 모듈: `use-flow-celebration.ts` (132 LOC) / `use-stepper-keyboard.ts` (63 LOC) / `business-flow-step-chip.tsx` (71 LOC). localStorage 키 prefix 정합화: `av:bf-completed:` → `av:bf-stepper:completed:`. 커밋 `3b46667`. |
| 9차 PDCA — Flow Insights Panel + AI 병목 감지 (2026-05-04) | ✅ BE +1 모듈(`insights.ts` 178 LOC, 순수 집계 + AI 프롬프트 빌더 + 결정적 fallback) + 1 신규 엔드포인트(`GET /business-flows/:id/insights`, 활성 사용자 필터 + adapter.complete + fallback) / FE +1 컴포넌트(`flow-insights-panel.tsx` 162 LOC, dashboard.tsx 통합) + 1 API 클라이언트(`api.getBusinessFlowInsights`) + 2 타입(`FlowInsight`/`FlowInsightStep`). 테스트 +14 BE(9 단위 `insights.test.ts` + 5 통합 `business-flows.routes.test.ts`) +5 FE(`flow-insights-panel.test.tsx` RTL). BE 673→687, FE 205→210. 회귀 0. 커밋 `1400ea7`. |
| **10차 PDCA — 알림 센터 연동 (2026-05-04)** | ✅ BE +1 모듈(`flow-alerts.ts` 111 LOC: `computeOverdue` 순수 함수 + `buildOverdueNotificationData`/`buildSuggestNotificationData` 데이터 빌더 + `shouldCreateOverdueNotification`/`todayWindowStart` dedup 헬퍼) + Prisma migration `20260503050000_add_flow_overdue_notification_kind` (`NotificationKind.flow_overdue` enum) + PATCH `/business-flows/:id/progress` 사이드 이펙트(overdue 자동 알림 + 하루 1회 dedup) + POST `/business-flows/:id/suggest` `saveToNotifications?: boolean` 옵션(true 시 `kind=ai` 알림 + `notificationId` 응답) / FE +1 훅(`use-flow-alerts.ts` 55 LOC, 추가 네트워크 호출 0) + `BusinessFlowStepper` 헤더 amber Bell 배지(`/notifications` 이동) / Contract 4 계층 동기화(`openapi.yaml` SOR + Prisma + zod + TS literal union + FE zod) `NotificationKind.flow_overdue` 추가. 테스트 +5 BE(자동생성/dedup/미만은생성안함/saveToNotifications true/기본 false) +4 FE(단계화면매칭/전체합산/읽음제외/다른kind제외). BE 687→692, FE 210→214. 회귀 0. 커밋 `769ee38`. |
| **11차 PDCA — 비즈니스 플로우 스텝퍼 최종 완결 (2026-05-04, 커밋 `30ec17b`)** | ✅ Playwright E2E 6 시나리오 회귀 가드. BE 692/692, FE 252/252 동일. |
| **14차 PDCA — dashboard/projects 동적 currentStepId 추론 (2026-05-04, 커밋 `41ad615`)** | ✅ **초급 사용자 UX 개선** — `dashboard.tsx` / `projects.tsx` 정적 fallback 단계 ID를 실데이터 기반 동적 추론으로 교체. `flow-step-inference.test.tsx` 10건 신규. FE 214→**224** PASS. |
| 스펙 문서 드리프트 | 0건 — 14차까지 모두 반영. BE 692/692 · FE 252/252 현재 상태. |
