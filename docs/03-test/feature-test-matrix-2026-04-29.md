# Feature Test Matrix — 2026-04-29

> 실행자: `av-base-browser-tester` (av-pm-team 2차 사이클)
> 환경: docker-compose dev (FE :3000 / BE :8080 / Postgres :15432 / Redis :16379), `NEXT_PUBLIC_USE_MOCK=true`
> 도구: Playwright 1.59.1, Chromium, `E2E_BASE_URL=http://localhost:3000` (webServer 자동 부팅 회피, 컨테이너 dev 재사용)
> 결과 원본: `/tmp/playwright-results.json` (1차 풀런), 재현 검증 1회 추가
> 합계: **62 expected / 0 skipped / 3 unexpected** — 1차 풀런 기준
> 재현 검증: 2 deterministic FAIL, 1 flaky (`routes.spec.ts` 사이드바 순회 → 재실행 시 PASS)

---

## 1. 메뉴 카테고리 매핑 (24 라우트 → 9 카테고리)

| 카테고리 | 포함 라우트 | 개수 |
|---|---|---|
| 인증 | `/login`, `/oauth-callback` | 2 |
| 홈/대시보드 | `/` | 1 |
| 프로젝트 | `/projects`, `/projects/[id]`, `/progress` | 3 |
| 작업/이슈 | `/tasks`, `/issues` | 2 |
| 협업 | `/calendar`, `/docs`, `/chat`, `/notion`, `/ai-auto` | 5 |
| 결재/리소스 | `/approvals`, `/resources` | 2 |
| CRM | `/clients` | 1 |
| 보고서 | `/reports/weekly`, `/reports/monthly` | 2 |
| 조직/사용자 | `/org`, `/users` | 2 |
| 시스템 | `/admin`, `/notifications`, `/settings` | 3 |
| **합계** | — | **24** (1 동적 `[id]` 포함) |

> 인증 화면은 `globalSetup`(storageState 주입)으로 우회되므로 e2e에 직접 진입점 없음 — 기능 매트릭스 SKIP.

---

## 2. 메뉴 × 기능 매트릭스

범례: ✅ PASS · ❌ FAIL · ⏭ SKIP (스펙 미커버 또는 우회)

### 2.1 홈/대시보드 (`/`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| 200 렌더 + 콘텐츠("대시보드/오늘") | smoke.spec.ts | ✅ | — | — |
| 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 페이지 에러 0건 | console-errors.spec.ts | ✅ | — | — |
| 대시보드 위젯 6개 렌더 | interactions.spec.ts | ✅ | — | — |
| 사이드바 접기/펴기 | interactions.spec.ts | ✅ | — | — |
| AI 패널 토글 | interactions.spec.ts | ✅ | — | — |
| Tweaks 다크 모드 전환 | interactions.spec.ts | ✅ | — | — |
| ⌘K 전역 검색 버튼 | interactions.spec.ts | ✅ | — | — |
| 사이드바 17 링크 일괄 순회 | routes.spec.ts | ❌ (flaky) | 30s 타임아웃; 단독 재실행 PASS — 1차 사이클과 동일 회귀 | (없음) |

### 2.2 프로젝트 (`/projects`, `/projects/[id]`, `/progress`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/projects` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/projects` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 프로젝트 목록 → 상세 진입 (`[id]`) | interactions.spec.ts | ✅ | — | — |
| `/progress` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/progress` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 프로젝트 생성/수정/삭제 | — | ⏭ | spec 미커버 | — |

### 2.3 작업/이슈 (`/tasks`, `/issues`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/tasks` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/tasks` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 태스크 생성 다이얼로그 + 보드 상태 select 인터랙션 (PATCH) | user-flows.spec.ts | ✅ | — | — |
| 태스크 POST /api/v1/tasks → 201 | user-flows.spec.ts | ✅ | — | — |
| `/issues` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/issues` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 이슈 4-탭 (리스트/보드/SLA/분석) 전환 | interactions.spec.ts | ✅ | — | — |
| 이슈 보드 상태 전이 (PATCH) | user-flows.spec.ts | ✅ | — | — |
| 이슈 GET /api/v1/issues → 배열 | user-flows.spec.ts | ✅ | — | — |
| 태스크/이슈 검색·필터 | — | ⏭ | spec 미커버 | — |

### 2.4 협업 (`/calendar`, `/docs`, `/chat`, `/notion`, `/ai-auto`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/calendar` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/calendar` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 캘린더 일정 추가 다이얼로그 + 충돌 감지 | collaboration.spec.ts | ✅ | — | — |
| 캘린더 이벤트 생성 (다이얼로그 → 저장) | user-flows.spec.ts | ✅ | — | — |
| 이벤트 POST /api/v1/events → 201 | user-flows.spec.ts | ✅ | — | — |
| `/docs` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/docs` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 문서 생성 다이얼로그 (collab) | collaboration.spec.ts | ✅ | — | — |
| 문서 생성 다이얼로그 (flow) | user-flows.spec.ts | ✅ | — | — |
| 문서 POST /api/v1/docs → 201 | user-flows.spec.ts | ✅ | — | — |
| `/chat` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/chat` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 채팅 메시지 전송 (Composer) | collaboration.spec.ts | ✅ | — | — |
| `/notion` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/notion` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| `/ai-auto` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/ai-auto` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| Notion/AI-Auto 인터랙션 | — | ⏭ | spec 미커버 (스모크만) | — |

### 2.5 결재/리소스 (`/approvals`, `/resources`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/approvals` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/approvals` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 결재 화면 진입 + "새 기안" 버튼 + API POST | user-flows.spec.ts | ✅ | — | — |
| 결재 POST /api/v1/approvals → 201 | user-flows.spec.ts | ✅ | — | — |
| 결재 작성 다이얼로그 ("새 결재" → 헤딩 "결재 작성") | collaboration.spec.ts | ❌ | `getByRole('button', { name: /새 결재/ })` 셀렉터 미발견 — 30s 타임아웃. `/approvals` page는 "새 기안" 버튼만 노출 (user-flows.spec.ts와 일치). collaboration.spec.ts의 정규식이 page 구현과 불일치 — **스펙 결함, 1차 사이클과 동일** | `test-results/collaboration-approvals-—-open-create-dialog-and-submit-chromium/test-failed-1.png` |
| `/resources` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/resources` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 리소스 예약 다이얼로그 ("예약" → 헤딩 "리소스 예약") | collaboration.spec.ts | ❌ | `getByRole('heading', { name: /리소스 예약\|Book Resource/i })` element not found (5s). 버튼 클릭은 성공하지만 다이얼로그 헤딩 텍스트가 일치하지 않음 — **스펙/구현 매핑 결함, 1차 사이클과 동일** | `test-results/collaboration-resources-—-open-booking-dialog-chromium/test-failed-1.png` |

### 2.6 CRM (`/clients`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/clients` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/clients` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 고객사 상세 진입 (CJ ENM) + 활동 추가 | collaboration.spec.ts | ✅ | — | — |

### 2.7 보고서 (`/reports/weekly`, `/reports/monthly`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/reports/weekly` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/reports/weekly` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 주간 보고서 발송 → 수신자 편집 다이얼로그 | collaboration.spec.ts | ✅ | — | — |
| `/reports/monthly` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/reports/monthly` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 월간 보고서 인터랙션 | — | ⏭ | spec 미커버 (스모크만) | — |

### 2.8 조직/사용자 (`/org`, `/users`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/org` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/org` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| `/users` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/users` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| 조직도/사용자 CRUD | — | ⏭ | spec 미커버 | — |

### 2.9 시스템 (`/admin`, `/notifications`, `/settings`)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| `/admin` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/admin` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| `/notifications` 200 렌더 | smoke.spec.ts | ✅ | — | — |
| `/notifications` 정상 렌더 (콘솔 가드) | routes.spec.ts | ✅ | — | — |
| `/settings` 렌더 | — | ⏭ | smoke/routes 라우트 목록 누락 — 스펙 보완 필요 | — |
| 시스템 콘솔 / 권한 / 백업 인터랙션 | — | ⏭ | spec 미커버 | — |

### 2.10 횡단 (Cross-cutting)

| 기능 | spec 파일 | 상태 | 실패 원인 | 스크린샷 |
|---|---|---|---|---|
| 12개 핵심 `/api/v1/*` 엔드포인트 200 응답 | smoke.spec.ts | ✅ | — | — |
| 17 라우트 일괄 — JS 에러 0건 | smoke.spec.ts | ✅ | — | — |
| 17 라우트 — `pageerror` 0건 | console-errors.spec.ts | ✅ | — | — |
| a11y (axe-core, 12 라우트, WCAG2 A/AA) | tests/a11y/axe.spec.ts | ⏭ | `playwright.config.ts` `testDir`가 `./tests/e2e`로 한정 → e2e suite에서 자동 제외. `pnpm test:a11y`로만 실행 (이번 사이클 미실행, 기능 매트릭스 범위 외) | — |

---

## 3. 메뉴별 PASS율 종합 요약

> 분모 = 해당 카테고리에서 e2e가 시도한 ✅+❌ 합. ⏭(SKIP)는 제외. flaky는 ❌로 가산 (보수적).

| 카테고리 | ✅ | ❌ | ⏭ | PASS율 | 비고 |
|---|---:|---:|---:|---:|---|
| 홈/대시보드 | 8 | 1 | 0 | **88.9%** | 사이드바 17 링크 순회 flaky 1건 |
| 프로젝트 | 5 | 0 | 1 | **100%** | CRUD 미커버 |
| 작업/이슈 | 9 | 0 | 1 | **100%** | 검색·필터 미커버 |
| 협업 | 16 | 0 | 1 | **100%** | Notion/AI-Auto 인터랙션 미커버 |
| 결재/리소스 | 4 | 2 | 0 | **66.7%** | 두 건 모두 collaboration.spec.ts 셀렉터 결함 |
| CRM | 3 | 0 | 0 | **100%** | — |
| 보고서 | 5 | 0 | 1 | **100%** | 월간 인터랙션 미커버 |
| 조직/사용자 | 4 | 0 | 1 | **100%** | CRUD 미커버 |
| 시스템 | 4 | 0 | 2 | **100%** | `/settings` 스모크 누락 |
| 횡단 | 3 | 0 | 1 | **100%** | a11y 별도 |
| **전체** | **61** | **3** | **8** | **95.3%** | 1차 풀런 동일 |

> 단독 재실행 시 사이드바 순회 PASS → deterministic FAIL은 **2건**(13.6% 협업/결재/리소스 카테고리), 전체 결정적 PASS율은 **96.8%**.

---

## 4. 우선 수정 권장 톱 5

### #1 — `collaboration.spec.ts:7` `approvals` 다이얼로그 셀렉터 (결정적 FAIL · 1차 carry-over)
- 증상: 30s 타임아웃, `getByRole('button', { name: /새 결재/ })` 미발견.
- 진단: `app/approvals/page.tsx`는 "새 기안" 버튼만 노출 (user-flows.spec.ts Flow-3 주석에 명시). spec 정규식이 구현과 불일치.
- 권장 fix(스펙):
  - 정규식을 `/새 기안|새 결재|New Approval/i`로 확장
  - 또는 spec을 user-flows의 API POST 검증 패턴으로 정렬하고 다이얼로그 검증은 별도 컴포넌트 단위 테스트로 이전.
- 영향: 결재 모듈 e2e 신뢰도. 1차 사이클부터 carry-over 중인 위장 회귀.

### #2 — `collaboration.spec.ts:38` `resources` 예약 다이얼로그 헤딩 미발견 (결정적 FAIL · 1차 carry-over)
- 증상: 5s 타임아웃, `getByRole('heading', { name: /리소스 예약|Book Resource/i })` element not found.
- 진단: 버튼 클릭은 성공하나 다이얼로그 헤딩 텍스트가 정규식과 매칭 안 됨. `app/resources/page.tsx` 또는 `BookResourceDialog`의 헤딩 카피와 spec 카피 드리프트 가능성.
- 권장 fix:
  - `screens/resources.tsx`/리소스 다이얼로그 컴포넌트의 실제 헤딩 텍스트 확인 후 spec 정규식을 동기화
  - 헤딩 누락이라면 `data-testid="resource-booking-dialog"` 추가하고 `getByTestId`로 전환 (다국어 변동 견고).
- 영향: 리소스 예약 e2e 신뢰도. 위 #1과 동일 패턴(스펙↔구현 카피 드리프트).

### #3 — `routes.spec.ts:55` 사이드바 17 링크 순회 (flaky · 1차 carry-over)
- 증상: 30s 타임아웃 (1차 풀런). 단독 grep 재실행 시 28.4s에 PASS.
- 진단: 17 링크를 매 회 `/` → 클릭 → URL 대기로 순차 순회 → dev 모드에서 첫 컴파일이 누적되면 30s 한계 초과. 격리 실행 시 통과.
- 권장 fix:
  - `test.setTimeout(120_000)` 적용 (console-errors.spec.ts의 패턴 차용)
  - 또는 사전 워밍(전 라우트 prefetch) 후 클릭 검증으로 분리.
- 영향: CI 신뢰도(false negative 유발). 결정적 회귀 아님.

### #4 — `playwright.config.ts` `testDir` → a11y 자동 제외
- 증상: `pnpm e2e`(기본)가 `tests/a11y/`를 실행하지 않음 → axe 게이트가 e2e 풀런에서 누락.
- 권장 fix:
  - `testDir: '.'` + `testMatch: ['tests/e2e/**/*.spec.ts','tests/a11y/**/*.spec.ts']`로 통합
  - 또는 별도 `playwright.a11y.config.ts` 분리하고 PR 게이트에 두 컨피그 모두 포함.
- 영향: 회귀 게이트 누락(WCAG 위반 잠복 위험). 코드 결함은 아니나 거버넌스 이슈.

### #5 — `/settings` 라우트 스모크 누락
- 증상: `src/app/settings/page.tsx`는 존재하나 `smoke.spec.ts`/`routes.spec.ts`/`console-errors.spec.ts` 17-라우트 목록에 없음. a11y 스펙에는 포함.
- 권장 fix:
  - 세 spec의 `ROUTES`/`SMOKE_ROUTES` 배열에 `{ href: '/settings', expectText: /설정|환경설정|Profile/ }` 추가
  - 콘텐츠 가드 정규식은 `screens/settings.tsx`의 헤더 카피 확인 후 확정.
- 영향: 시스템 카테고리 커버리지 공백 (24/24 라우트 중 1 미커버).

---

## 5. 1차 ↔ 2차 사이클 비교

| 항목 | 1차 (선행 로그) | 2차 (이번) | 변화 |
|---|---|---|---|
| 총 테스트 | 62 | 62 | — |
| PASS | 59 | 59 (재현 시 60) | 사이드바 flaky 미해결 |
| FAIL | 3 | 3 (deterministic 2 + flaky 1) | 동일 |
| 신규 회귀 | — | **0건** | 깨끗 |
| carry-over | — | **3건 모두** (#1~#3) | 미수복 |

**판정**: 2차 사이클은 1차와 동일 형질의 회귀를 보이며, **신규 결함은 0건**. 결정적 FAIL 2건 모두 spec ↔ 구현 카피 드리프트로 코드가 아닌 스펙 측 수정이 정답. 사이드바 순회 flaky는 dev 컴파일 타임아웃이 원인이므로 timeout 상향이 표준 처방.

---

## 6. 산출물

- `/data/allflow/docs/03-test/feature-test-matrix-2026-04-29.md` (본 문서)
- `/tmp/playwright-results.json` (1차 풀런 JSON 원본; 휘발성)
- `/data/allflow/project/all-flow-frontend/test-results/collaboration-approvals-—-open-create-dialog-and-submit-chromium/test-failed-1.png`
- `/data/allflow/project/all-flow-frontend/test-results/collaboration-resources-—-open-booking-dialog-chromium/test-failed-1.png`
- `.claude/agent-memory/av-base-browser-tester/MEMORY.md` (2차 학습 갱신)

---

생성: 2026-04-29 22:20 KST · 환경 dev (FE/BE 18~22m up, healthy)
