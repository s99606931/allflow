# 상단 탑바 (Top Bar)

> 파일: `src/components/shell/topbar.tsx`

## 개요

화면 상단에 고정된 글로벌 헤더. AI 패널 토글, 알림, 도움말, 프로필 메뉴를 제공한다.

## 기능 목록

### 1. 실시간 연결 상태 표시

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 연결 상태 닷 | 녹색(연결)/황색(지연)/회색(오프라인) 색상 닷 + 레이블 | ✅ | 🔗 SSE `GET /realtime/sse` | 🧪 use-realtime.test.tsx ✅ (2026-05-03) |
| 상태 레이블 | "온라인" / "재연결 중" / "오프라인" 텍스트 표시 | ✅ | 🔗 | 🧪 use-realtime.test.tsx |

### 2. AI 어시스턴트 토글 버튼

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| AI 패널 열기/닫기 | Sparkles 아이콘 버튼 → 우측 AI 패널 토글 | ✅ | 🔌 (zustand) | 🧪 ui-store.test.ts |
| 활성 상태 강조 | 패널 열림 시 버튼 accent 색상으로 표시 | ✅ | 🔌 | 🧪 ui-store.test.ts |

### 3. 알림 메뉴

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 알림 뱃지 | Bell 아이콘에 읽지 않은 알림 수 표시 (10차 PDCA: `flow_overdue` 알림도 포함되어 카운트됨) | ✅ | 🔗 GET /nav-counts | 🧪 nav.test.ts ✅ (2026-05-03) |
| 알림 드롭다운 | 최근 알림 목록 팝오버 표시. 10차 PDCA에서 `Notification.kind` 가 `mention/sla/ai/system/comment/flow_overdue` 6종 지원 — `flow_overdue` 알림은 PATCH `/business-flows/:id/progress` 사이드 이펙트로 자동 생성됨 (하루 1회 dedup) | ✅ | 🔗 GET /notifications | 🧪 notifications.routes.test.ts ✅ |
| 알림 읽음 처리 | 드롭다운에서 개별 알림 읽음 처리 | ✅ | 🔗 POST /notifications/:id/read | 🧪 notifications.routes.test.ts ✅ |
| 전체 읽음 처리 | "전체 읽음" 버튼 → 모든 알림 읽음 | ✅ | 🔗 POST /notifications/read-all | 🧪 notifications.routes.test.ts ✅ |
| 알림 센터 링크 | "전체 보기" → `/notifications` 이동 (10차 PDCA: BusinessFlowStepper 헤더의 amber Bell 배지도 동일 라우트로 이동) | ✅ | 🔌 | 🧪 ui-store.test.ts |
| **`NotificationKind.flow_overdue` 지원 (10차 PDCA 신규)** | Prisma enum 에 `flow_overdue` 추가 + contract 4 계층 동기화. 알림 드롭다운/센터에 표준 일수 초과 단계 알림이 표시되며 `href = step.screen` 클릭 시 해당 화면으로 이동 | ✅ | 🔗 GET /notifications (응답에 `kind: 'flow_overdue'` 항목 포함) | 🧪 schemas.test.ts (8/8) + business-flows.routes.test.ts (10차 +5) ✅ (2026-05-04) |

### 4. 도움말 메뉴

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 키보드 단축키 표시 | ⌘K, ⌘/, ⌘B, ⌘I 단축키 힌트 | ✅ | 🔌 | 🧪 ui-store.test.ts |
| 문서 링크 | 외부 문서 URL 링크 | ✅ | 🔌 | 🧪 ui-store.test.ts |
| 피드백 전송 링크 | 피드백 폼 URL 링크 | ✅ | 🔌 | 🧪 ui-store.test.ts |
| 앱 버전 표시 | 현재 앱 버전 표시 | ✅ | 🔌 | 🧪 ui-store.test.ts |

### 5. 사용자(프로필) 메뉴

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 프로필 정보 표시 | 이름·역할·부서·이메일 표시 | ✅ | 🔗 GET /users/me | 🧪 use-data.test.tsx ✅ (2026-05-03) |
| 계정 설정 링크 | `/settings` 이동 | ✅ | 🔌 | 🧪 ui-store.test.ts |
| 로그아웃 | 세션 종료 후 로그인 페이지 이동 | ✅ | 🔌 next-auth `signOut()` | 🧪 auth.routes.test.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 알림 클릭 시 해당 화면 딥링크 | 알림 항목 클릭 → 관련 태스크/이슈로 이동 | 중 |
| 알림 드롭다운 E2E 테스트 | Playwright 커버리지 없음 | 중 |
| 글로벌 검색 바 (탑바) | 사이드바 검색과 중복 여부 검토 필요 | 낮음 |

## 테스트 실행 결과 (2026-05-04 11차 PDCA — 비즈니스 플로우 스텝퍼 최종 완결: E2E 회귀 가드 6 시나리오)

> ✅ **11차 PDCA 최종 완결** (커밋 `30ec17b`) — 비즈니스 플로우 스텝퍼 기능의 마지막 사이클. 1~10차 누적 동작을 영구 회귀 가드로 고정.

- BE vitest: **692/692 PASS** (10차 동일 — 11차는 E2E 추가만, BE 코드 변경 0)
- FE vitest: **252/252 PASS** (10차 동일 — 11차는 E2E 추가만, FE 단위 코드 변경 0)
- **E2E (Playwright): 6/6 PASS — `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` (190 LOC, 22.5s, retries=0)**
- 직접 측정 (2026-05-04): `pnpm --filter backend vitest run` 65 files / 692 passed · `pnpm --filter frontend vitest run` 25 files / 214 passed · `npx playwright test menus/business-flow-stepper.spec.ts` 6/6 passed
- 탑바 자체 직접 변경 없음 — 11차는 `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` E2E 신규(190 LOC)만 추가. 탑바 SSE/알림/프로필 회귀 0건. 10차 BE `flow-alerts.ts`(111 LOC) + Prisma `NotificationKind.flow_overdue` enum + PATCH 사이드 이펙트(overdue 자동 알림) + POST suggest `saveToNotifications?` 옵션 / FE `use-flow-alerts.ts`(55 LOC) + `BusinessFlowStepper` 헤더 amber Bell 배지 / Contract 4 계층 동기화 모두 그대로 유지. 탑바 알림 드롭다운/센터는 `Notification.kind: flow_overdue` 항목을 자연스럽게 표시(스키마 호환). 커밋 `769ee38` (10차) → `30ec17b` (11차 최종 완결).

## 백엔드 연결 검증 결과 (2026-05-04 11차 PDCA — 최종 완결)

| 항목 | 결과 |
|------|------|
| SSE 실시간 연결 | ✅ `GET /realtime/sse` (Fastify 라우트) — use-realtime 5/5 PASS |
| 알림 카운트 | ✅ `GET /nav-counts` 6/6 PASS |
| 알림 목록/읽음/전체읽음 | ✅ notifications.routes.test.ts 다수 PASS |
| 사용자 프로필 | ✅ `GET /users/me` (identity.routes.ts) — use-data 7/7 PASS |
| 로그아웃 | ✅ next-auth `signOut()` 클라이언트 처리 (BE 별도 엔드포인트 불필요) |
| BE 합계 | ✅ vitest **692/692 PASS** (10차 +5) |
| FE 합계 | ✅ vitest **252/252 PASS** (10차 +4) |
| **NotificationKind enum 6종 (10차 PDCA)** | ✅ `mention / sla / ai / system / comment / flow_overdue` — `packages/contracts/openapi.yaml` SOR + Prisma schema + 4 계층 zod/TS 동기화 완료 |
| **알림 자동 생성 (10차 PDCA)** | ✅ PATCH `/business-flows/:id/progress` 사이드 이펙트 — `expectedDays` 초과 시 `flow_overdue` 알림 자동 생성 + `(userId, kind, screen, today UTC 자정)` 하루 1회 dedup. business-flows.routes.test.ts 10차 +5 통과 |
| 7차 PDCA 영향도 (탑바) | 탑바 자체 직접 변경 없음 — 7차 추가분(스테퍼 a11y/키보드/focus-visible/완주 축하 + `globals.css` keyframes)은 모두 `BusinessFlowStepper` 컴포넌트와 `globals.css` 에 격리되어 본 메뉴 SSE/알림/프로필 회귀 0건 확인 |
| 8차 PDCA 영향도 (탑바) | 탑바 자체 직접 변경 없음 — 8차 작업은 `business-flow-stepper.tsx` 552→412 LOC 리팩토링과 3개 신규 모듈(`use-flow-celebration.ts` 132 LOC / `use-stepper-keyboard.ts` 63 LOC / `business-flow-step-chip.tsx` 71 LOC) 분리에 격리됨. 탑바 SSE/알림/프로필 회귀 0건. 커밋 `3b46667`. |
| **9차 PDCA 영향도 (탑바)** | 탑바 자체 직접 변경 없음 — 9차 작업은 BE 신규 모듈(`apps/backend/src/modules/business-flows/insights.ts` 178 LOC, 순수 집계 + AI 프롬프트 빌더 + 결정적 fallback) + 신규 엔드포인트(`GET /business-flows/:id/insights`) + FE 신규 컴포넌트(`apps/frontend/src/components/ai/flow-insights-panel.tsx` 162 LOC, dashboard.tsx 통합)에 격리됨. 탑바 SSE/알림/프로필/도움말 회귀 0건. 커밋 `1400ea7`. |
| **10차 PDCA 영향도 (탑바)** | 탑바 컴포넌트 자체 직접 변경 없음 — 10차 작업은 BE 신규 모듈(`apps/backend/src/modules/business-flows/flow-alerts.ts` 111 LOC) + Prisma `NotificationKind.flow_overdue` enum + PATCH `/business-flows/:id/progress` overdue 자동 알림 사이드 이펙트(하루 1회 dedup) + POST `/business-flows/:id/suggest` `saveToNotifications?` 옵션(`notificationId` 응답) / FE `apps/frontend/src/lib/hooks/use-flow-alerts.ts` 55 LOC(추가 네트워크 0) + `BusinessFlowStepper` 헤더 amber Bell 배지 / Contract 4 계층 동기화(openapi.yaml + api.generated.ts + api-types.gen.ts + schemas.ts) `NotificationKind.flow_overdue` 추가 — 모두 비즈니스 플로우/스테퍼/알림 모듈에 격리됨. **탑바 알림 드롭다운/센터는 schema 호환성으로 자동으로 `flow_overdue` 알림을 표시** (별도 코드 변경 없음). 탑바 SSE/알림/프로필/도움말 회귀 0건. 커밋 `769ee38`. |
| **11차 PDCA 영향도 (탑바) — 최종 완결** | 탑바 컴포넌트 자체 직접 변경 없음 — 11차 작업은 `apps/frontend/tests/e2e/menus/business-flow-stepper.spec.ts` Playwright E2E 6 시나리오(190 LOC) + 리포트 문서 추가만 포함. **비즈니스 플로우 스텝퍼 기능의 최종 완결 사이클**. 탑바 SSE/알림/프로필/도움말 회귀 0건. E2E 6/6 PASS (22.5s, retries=0). 커밋 `30ec17b`. |
| 스펙 문서 드리프트 | 3건 정정 유지 — `/auth/me` → `/users/me`, `/auth/logout` → next-auth signOut, `PATCH /notifications/:id` → `POST /notifications/:id/read` (11차 PDCA 도 탑바 코드 수정 0건이며 E2E 회귀 가드 추가만 — 추가 드리프트 없음) |
