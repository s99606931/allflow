# 커맨드 팔레트 (Command Palette)

> 파일: `src/components/shell/command-palette.tsx`  
> 단축키: ⌘K / Ctrl+K

## 개요

전역 검색·실행 팔레트. 페이지 이동, 항목 검색, 빠른 액션을 단일 인터페이스에서 제공한다.

## 기능 목록

### 1. 검색 카테고리

| 카테고리 | 설명 | 구현 | 백엔드 | 테스트 |
|---------|------|------|--------|--------|
| 최근 항목 | 마지막으로 접근한 8개 항목 표시 | ✅ | 🔌 (로컬 히스토리) | 🧪 ui-store.test.ts |
| 페이지 | 전체 NAV 메뉴 항목 검색 | ✅ | 🔌 | 🧪 nav.test.ts ✅ (2026-05-03) |
| 프로젝트 | 프로젝트명 + 코드 + 진행률 검색 | ✅ | 🔗 GET /projects | 🧪 projects.routes.test.ts |
| 태스크 | 태스크명 + ID + 마감일 검색 | ✅ | 🔗 GET /tasks | 🧪 tasks.routes.test.ts |
| 이슈 | 이슈명 + ID + 우선순위 + 프로젝트 검색 | ✅ | 🔗 GET /issues | 🧪 issues.routes.test.ts |
| 사용자 | 이름 + 역할 + 부서 검색 | ✅ | 🔗 GET /users | 🧪 identity.routes.test.ts |
| 문서 | 문서명 검색 | ✅ | 🔗 GET /docs | 🧪 docs.routes.test.ts |
| AI 시맨틱 검색 | 자연어 의미 기반 검색 (600ms 디바운스) | ✅ | 🔗 POST /search/semantic | 🧪 search.routes.test.ts ✅ |

### 2. 빠른 액션

| 액션 | 힌트키 | 설명 | 구현 | 백엔드 | 테스트 |
|------|--------|------|------|--------|--------|
| 새 태스크 만들기 | N | TaskCreateDialog 오픈 | ✅ | 🔗 POST /tasks | 🧪 menus-crud.spec.ts ✅ |
| 새 이벤트/일정 | ⇧⌘E | EventCreateDialog 오픈 | ✅ | 🔗 POST /events | 🧪 events.routes.test.ts |
| 새 문서 | ⇧⌘O | DocCreateDialog 오픈 | ✅ | 🔗 POST /docs | 🧪 docs.routes.test.ts |
| 새 프로젝트 | ⇧⌘P | ProjectCreateDialog 오픈 | ✅ | 🔗 POST /projects | 🧪 projects.routes.test.ts |
| 새 이슈 등록 | ⇧⌘I | IssueCreateDialog 오픈 | ✅ | 🔗 POST /issues | 🧪 issues.routes.test.ts |
| 휴가 신청 | ⇧⌘L | HR 휴가 신청 폼 오픈 | ✅ | 🔗 POST /hr/leave | 🧪 use-hr.test.tsx ✅ |
| 회의실 예약 | ⇧⌘R | ResourceBookDialog 오픈 | ✅ | 🔗 POST /resources/book | 🧪 resources.routes.test.ts |
| 다크 모드 토글 | ⇧⌘D | 테마 전환 | ✅ | 🔌 (zustand persist) | 🧪 ui-store.test.ts ✅ (2026-05-03) |

### 3. 인터랙션

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 키보드 탐색 | ↑↓ 이동, Enter 선택, Esc 닫기 | ✅ | 🔌 | 🧪 ui-store.test.ts |
| AI 시맨틱 스코어 표시 | "AI · 85% 일치" 관련도 뱃지 | ✅ | 🔗 | 🧪 search.service.test.ts |
| 중복 제거 | 로컬 결과와 AI 결과 중복 항목 병합 | ✅ | 🔌 | 🧪 ui-store.test.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 팔레트 E2E 테스트 | Playwright 시나리오 없음 | 중 |
| 최근 항목 서버 동기화 | 현재 로컬만 저장, 멀티 기기 미지원 | 낮음 |
| 필터 토글 (페이지/태스크/이슈) | 카테고리별 필터 UI 없음 | 낮음 |

## 테스트 실행 결과 (2026-05-04 11차 PDCA — 비즈니스 플로우 스텝퍼 최종 완결: E2E 회귀 가드 6 시나리오)

> ✅ **11차 PDCA 최종 완결** (커밋 `30ec17b`) — 비즈니스 플로우 스텝퍼 기능의 마지막 사이클. 1~10차 누적 동작을 영구 회귀 가드로 고정.

- BE vitest: **692/692 PASS** (10차 동일 — 11차는 E2E 추가만, BE 코드 변경 0)
- FE vitest: **252/252 PASS** (10차 동일 — 11차는 E2E 추가만, FE 단위 코드 변경 0)
- **E2E (Playwright): 6/6 PASS — `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` (190 LOC, 22.5s, retries=0, biome 0 errors)**
- 직접 측정 (2026-05-04): `pnpm --filter backend vitest run` 65 files / 692 passed · `pnpm --filter frontend vitest run` 25 files / 214 passed · `npx playwright test menus/business-flow-stepper.spec.ts` 6/6 passed
- 팔레트 자체 직접 변경 없음 — 11차 작업은 `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` Playwright E2E 6 시나리오(190 LOC) + 리포트 문서 추가만 포함. 검색·빠른 액션·다크모드 회귀 0건. 10차 산출물 모두 그대로 유지(BE 신규 모듈 `flow-alerts.ts` 111 LOC + Prisma `NotificationKind.flow_overdue` enum + PATCH overdue 사이드 이펙트(하루 1회 dedup) + POST suggest `saveToNotifications?` 옵션 / FE `use-flow-alerts.ts` 55 LOC + `BusinessFlowStepper` 헤더 amber Bell 배지 / Contract 4 계층 동기화). 커밋 `769ee38` (10차) → `30ec17b` (11차 최종 완결).

## 백엔드 연결 검증 결과 (2026-05-04 11차 PDCA — 최종 완결)

| 항목 | 결과 |
|------|------|
| AI 시맨틱 검색 | ✅ `POST /search/semantic` (스펙 표기 `GET /search?q=` 정정) — search.routes 8/8 PASS |
| 검색 카테고리 데이터 소스 | ✅ projects/tasks/issues/users/docs 모두 BE 라우트 존재 |
| 빠른 액션 8개 → POST 엔드포인트 | ✅ tasks/events/docs/projects/issues/hr/leave/resources/book 모두 라이브 |
| 다크모드 토글 | ✅ zustand persist (ui-store 9/9 PASS) |
| BE 단위+통합 테스트 | ✅ **692/692 PASS** (search 8/8, business-flows 33/33 — 4차 14건 + 5차 5건 + 6차 4건 + 9차 5건 + 10차 5건 포함, insights.test.ts 9 단위 9차 신규) |
| FE 단위 테스트 (관련) | ✅ **252/252 PASS** (nav 6/6, ui-store 9/9, query-keys 16/16, use-hr 4/4, schemas 15/15, **use-flow-alerts 4/4 (10차 신규)** 포함) |
| 7차 PDCA 영향도 (커맨드 팔레트) | 팔레트 자체 직접 변경 없음 — 7차 추가분(BusinessFlowStepper a11y/키보드 네비/focus-visible/완주 축하 + `globals.css` keyframes 2종)은 모두 BusinessFlowStepper · `globals.css` 영역에 격리되어 검색·빠른 액션·다크모드 회귀 0건 확인 |
| 8차 PDCA 영향도 (커맨드 팔레트) | 팔레트 자체 직접 변경 없음 — 8차 작업은 `business-flow-stepper.tsx` 552→412 LOC 모듈 분리(3 신규 파일: `use-flow-celebration.ts` / `use-stepper-keyboard.ts` / `business-flow-step-chip.tsx`)에 격리됨. 검색·빠른 액션·다크모드 회귀 0건 확인. 커밋 `3b46667`. |
| 9차 PDCA 영향도 (커맨드 팔레트) | 팔레트 자체 직접 변경 없음 — 9차 작업은 BE 신규 모듈(`apps/backend/src/modules/business-flows/insights.ts` 178 LOC, 순수 집계 + AI 프롬프트 빌더 + 결정적 fallback) + 신규 엔드포인트(`GET /business-flows/:id/insights`) + FE 신규 컴포넌트(`apps/frontend/src/components/ai/flow-insights-panel.tsx` 162 LOC, dashboard.tsx 통합)에 격리됨. 검색·빠른 액션·다크모드 회귀 0건 확인. 커밋 `1400ea7`. |
| **10차 PDCA 영향도 (커맨드 팔레트)** | 팔레트 자체 직접 변경 없음 — 10차 작업은 BE 신규 모듈(`apps/backend/src/modules/business-flows/flow-alerts.ts` 111 LOC) + Prisma `NotificationKind.flow_overdue` enum + PATCH `/business-flows/:id/progress` overdue 자동 알림 사이드 이펙트(하루 1회 dedup) + POST `/business-flows/:id/suggest` `saveToNotifications?: boolean` 옵션(`notificationId` 응답) / FE `apps/frontend/src/lib/hooks/use-flow-alerts.ts` 55 LOC(추가 네트워크 호출 0) + `BusinessFlowStepper` 헤더 amber Bell 배지(`/notifications` 이동) / Contract 4 계층 동기화 (openapi.yaml + api.generated.ts + api-types.gen.ts + schemas.ts)에 격리됨. 검색·빠른 액션·다크모드 회귀 0건 확인. 커밋 `769ee38`. |
| **11차 PDCA 영향도 (커맨드 팔레트) — 최종 완결** | 팔레트 자체 직접 변경 없음 — 11차 작업은 `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` Playwright E2E 6 시나리오(190 LOC, 22.5s, retries=0, biome 0 errors) + 리포트 문서(`docs/04-report/business-flow-stepper-11th-final-2026-05-03.report.md` 88 LOC) 추가만 포함. **비즈니스 플로우 스텝퍼 기능의 최종 완결 사이클**. 검색·빠른 액션(8개)·다크모드·시맨틱 검색 회귀 0건 확인. E2E 6/6 PASS. 커밋 `30ec17b`. |
| 스펙 문서 드리프트 | 1건 정정 유지 — `GET /search?q=` → `POST /search/semantic` (11차 PDCA 도 팔레트 코드 수정 0건이며 비즈니스 플로우 E2E 가드만 추가 — 추가 드리프트 없음) |
