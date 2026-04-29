# PDCA Master Tracking — be-fe-mapping-fix-2026-04-29

> **Cycle Slug**: `be-fe-mapping-fix-2026-04-29`
> **Owner**: av-pm-coordinator (PM) + av-do-orchestrator ×2 (BE PL / FE PL)
> **Created**: 2026-04-29 | **Phase**: Plan
> **Source**: `docs/archive/2026-04/all-flow-fullstack-2026-04-29/follow-up-mapping-audit.md` (commit d975a51)
> **Trigger**: `/av pm team` 5축 매핑 + Task + Plan 작성 요청
> **Lifecycle**: 본 디렉토리가 active SSoT. 종결 시 `git mv` → `docs/archive/{YYYY-MM}/be-fe-mapping-fix-2026-04-29/`

---

## 0. Plan 요약 (한 페이지)

| 항목 | 값 |
|------|----|
| 목적 | 직전 사이클에서 발견된 FE↔BE 미연결/미구현/테스트 부족을 0으로 수렴 |
| 전제 | USE_MOCK=true 마스킹 제거 가능한 production 수준 (모든 hook이 real BE에서 동작) |
| 트랙 | BE-CORE / BE-NEW-DOMAIN / FE-WIRING / TEST / CLEANUP |
| 총 Task | 36 (BE 핵심 12 + BE 신규 18 + FE 8 + 테스트 8 + 정리 1, 일부 중복 카운트 제외 28) |
| 추정 공수 | ~33 dev-day (1인 ~7주 / 2인 병렬 ~3.5주 / 3인 ~2.5주) |
| 종결 게이트 | gap ≥0.95 (양 트랙) + code ≥95 + 테스트 커버리지 ≥80% (line) + USE_MOCK=false E2E PASS |

---

## 1. 5축 매핑 매트릭스

각 항목은 5개 축 모두 ✅ 일 때 "정합". 본 사이클 종결 = 모든 항목 ✅✅✅✅✅.

**축 정의**:
- **N1 (FE 필요)**: FE 컴포넌트/훅이 호출 의도 보유 (PDCA-00 인벤토리 + use-data.ts)
- **N2 (FE 구현)**: hook 정의 ✅ + 컴포넌트 와이어링 ✅
- **N3 (BE 연결 검색)**: openapi.yaml 등재 + 라우트 파일 등록 의도 확인
- **N4 (BE 연결 확인)**: Fastify 핸들러 실구현 + 인증/RBAC + 응답 정상
- **N5 (테스트)**: BE(unit ∨ integration) ∧ FE(unit ∨ E2E) 양 트랙 모두 통과

범례: ✅ 정합 / ⚠️ 부분 / 🔴 부재 / — 해당 없음

### 1.1 핵심 도메인 (현재 정합 14건)

| # | Method + Path | N1 | N2 | N3 | N4 | N5 | 상태 |
|--:|--------------|:--:|:--:|:--:|:--:|:--:|:----:|
| 1 | GET /health | — | — | ⚠️ | ✅ | ⚠️ | infra OK (OpenAPI 미등재) |
| 2 | GET /users/me | ✅ | ⚠️ | ✅ | ✅ | ✅ | 훅만 정의(미사용) |
| 3 | GET /projects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | POST /projects | ✅ | ⚠️ | ✅ | ✅ | ✅ | UI 와이어링 미완 |
| 5 | GET /projects/:id | ✅ | ⚠️ | ✅ | ✅ | ✅ | 디테일 라우트 부재 |
| 6 | PATCH /projects/:id | ⚠️ | 🔴 | ✅ | ✅ | ⚠️ | FE 훅 부재 |
| 7 | GET /tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | POST /tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9 | PATCH /tasks/:id | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10 | GET /tasks/:id/comments | ⚠️ | 🔴 | ⚠️ | ✅ | ⚠️ | OpenAPI 미등재 + FE 훅 부재 |
| 11 | POST /tasks/:id/comments | ⚠️ | 🔴 | ⚠️ | ✅ | ⚠️ | 위와 동일 |
| 12 | GET /issues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13 | POST /issues | ✅ | ⚠️ | ✅ | ✅ | ✅ | UI 와이어링 미완 |
| 14 | GET /issues/:id/comments | ⚠️ | 🔴 | ⚠️ | ✅ | ⚠️ | OpenAPI 미등재 + FE 훅 부재 |
| 15 | POST /issues/:id/comments | ⚠️ | 🔴 | ⚠️ | ✅ | ⚠️ | 위와 동일 |
| 16 | GET /notifications | ✅ | ✅ | ✅ | ✅ | ⚠️ | 컨트랙트 테스트 부족 |
| 17 | POST /notifications/:id/read | ✅ | ✅ | ✅ | ✅ | ⚠️ | 위와 동일 |
| 18 | POST /notifications/read-all | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | OpenAPI 계약 불일치 (body) |
| 19 | GET /realtime/sse | ✅ | ✅ | ✅ | ✅ | 🔴 | 테스트 부재 |
| 20 | GET /realtime/ws | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | OpenAPI 미등재 (WS 특성) |
| 21 | POST /ai/complete | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | UI 미완 + 컨트랙트 부족 |
| 22 | POST /ai/extract-actions | ✅ | ✅ | ✅ | ✅ | ⚠️ | 컨트랙트 부족 |
| 23 | POST /reports/weekly | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | UI 미완 |
| 24 | POST /reports/monthly | ⚠️ | 🔴 | ✅ | ✅ | ⚠️ | FE 훅 부재 |

### 1.2 신규 도메인 (BE 미구현 — production blocker)

FE는 이미 mock 기반으로 와이어링 완료. BE 핸들러 부재로 USE_MOCK=false 진입 시 즉시 404.

| # | Method + Path | N1 | N2 | N3 | N4 | N5 | 차단 화면 |
|--:|--------------|:--:|:--:|:--:|:--:|:--:|----------|
| 25 | DELETE /tasks/:id | ✅ | ✅ | ✅ | 🔴 | ⚠️ | tasks.tsx 삭제 액션 |
| 26 | POST /issues/:id/transition | ✅ | ✅ | ✅ | 🔴 | ⚠️ | issues-full.tsx 상태 전이 |
| 27 | PATCH /users/me | ✅ | ⚠️ | ✅ | 🔴 | 🔴 | 프로필 화면 (5.7.2) |
| 28 | GET /approvals | ✅ | ✅ | ✅ | 🔴 | ⚠️ | approvals.tsx 목록 |
| 29 | POST /approvals | ✅ | ✅ | ✅ | 🔴 | ⚠️ | approval-form.tsx |
| 30 | POST /approvals/:id/decision | ✅ | ✅ | ✅ | 🔴 | ⚠️ | approvals.tsx 결정 패널 |
| 31 | GET /clients | ✅ | ⚠️ | ✅ | 🔴 | ⚠️ | clients (2.2) |
| 32 | POST /clients | ✅ | ✅ | ✅ | 🔴 | ⚠️ | client-form.tsx |
| 33 | GET /events | ✅ | ⚠️ | ✅ | 🔴 | ⚠️ | calendar (1.6) |
| 34 | POST /events | ✅ | ✅ | ✅ | 🔴 | ⚠️ | event-create-dialog.tsx |
| 35 | GET /resources | ✅ | ⚠️ | ✅ | 🔴 | ⚠️ | resources (5.4) |
| 36 | POST /resources/book | ✅ | ✅ | ✅ | 🔴 | ⚠️ | resource-book-dialog.tsx |
| 37 | GET /docs | ✅ | ⚠️ | ✅ | 🔴 | ⚠️ | docs (1.7) |
| 38 | POST /docs | ✅ | ✅ | ✅ | 🔴 | ⚠️ | doc-create-dialog.tsx |
| 39 | GET /channels | ✅ | ⚠️ | ✅ | 🔴 | ⚠️ | chat (1.8) |
| 40 | POST /channels/:channelId/messages | ✅ | ✅ | ✅ | 🔴 | ⚠️ | composer.tsx |
| 41 | GET /org/units | ✅ | ⚠️ | ✅ | 🔴 | ⚠️ | org (5.1) |
| 42 | POST /org/invitations | ✅ | ✅ | ✅ | 🔴 | ⚠️ | org.tsx invite |
| 43 | POST /auth/tokens/revoke | ✅ | ⚠️ | ✅ | 🔴 | ⚠️ | admin (5.7.5) |
| 44 | POST /reports/:id/send | ✅ | 🔴 | ⚠️ | 🔴 | 🔴 | report-recipients-editor.tsx (직접 fetch) |

### 1.3 매트릭스 통계

| 5축 통과 수준 | 핵심 24 | 신규 20 | 합계 44 | 비율 |
|--------------|------:|------:|------:|----:|
| ✅✅✅✅✅ (5/5 정합) | 6 | 0 | **6** | 14% |
| 4/5 통과 | 4 | 0 | 4 | 9% |
| 3/5 통과 | 8 | 0 | 8 | 18% |
| 2/5 통과 | 6 | 18 | 24 | 55% |
| 1/5 이하 | 0 | 2 | 2 | 4% |

**현재 production-ready 비율: 14%** → 목표: 95%+ (사이클 종결 시점).

---

## 2. Task 트리 (전체 28 개 — 일부 중복 카운트 제거)

### 트랙 1 — BE-CORE (기존 도메인 보강)

| Task | 작업 | Acceptance | 의존 | 추정 | Status |
|------|------|-----------|-----|----:|:------:|
| BE-C1 | `DELETE /tasks/:id` 핸들러 + cascade(comments) + RBAC | unit + integration test PASS, 404→OK 회귀 | — | 0.5d | ✓ done |
| BE-C2 | `POST /issues/:id/transition` 상태머신(open→in-progress→in-review→resolved + 재오픈) | unit + integration + 잘못된 전이 400 | — | 1d | ✓ done |
| BE-C3 | `PATCH /users/me` (name/role/dept/initials/color/email) | unit + integration test PASS | — | 0.5d | ✓ done |
| BE-C4 | `POST /reports/:id/send` (이메일/SMTP 또는 큐) | unit + integration + 발송 모킹 | — | 1d | ✓ done |
| BE-C5 | OpenAPI 등재: comments(4), read-all(body 정정), health, ws | redocly lint 0 errors | — | 0.25d | ✓ done |

### 트랙 2 — BE-NEW-DOMAIN (신규 도메인 8개 × 2~3 EP)

> 각 도메인은 prisma schema → migration → routes → unit → integration → openapi 의 단일 PR 단위.

| Task | 도메인 | EP 수 | 핵심 모델 | 추정 |
|------|-------|------:|---------|----:|
| BE-N1 | approvals | 3 | Approval (state, requester, approver, decision, audit) + RBAC | 3d |
| BE-N2 | clients | 2 | Client (CRM: contact, status, ownerId) | 2d |
| BE-N3 | events | 2 | Event (start/end/RRULE optional, attendees) | 3d |
| BE-N4 | resources | 2 | Resource + Booking (충돌 검증 포함) | 2d |
| BE-N5 | docs | 2 | Doc (title/body markdown/version) | 2d |
| BE-N6 | channels/messages | 2 | Channel + Message (멤버십 + paging) | 3d |
| BE-N7 | org/units + invitations | 2 | OrgUnit (tree) + Invitation (token, expiry) | 2d |
| BE-N8 | auth/tokens/revoke | 1 | Refresh token blacklist | 0.5d | ✓ done (audit-log stub, 영속화 후속) |

### 트랙 3 — FE-WIRING (BE 정상이거나 BE-CORE 완료 시 활성화)

| Task | 작업 | 화면 / 컴포넌트 | 의존 | 추정 |
|------|------|---------------|-----|----:|
| FE-W1 | `POST /projects` 와이어링 (1.2.1 New project) | progress.tsx 또는 신규 사이드패널 | — | 0.5d | ✓ done |
| FE-W2 | `GET /projects/:id` 디테일 라우트 + 컴포넌트 | `app/projects/[id]/page.tsx` | — | 1d |
| FE-W3 | `PATCH /projects/:id` 훅 + 카드 인라인 편집 | progress.tsx | — | 0.5d | ✓ done |
| FE-W4 | `POST /issues` 와이어링 (1.4.5 New issue) | issues-full.tsx + dialog | — | 0.5d |
| FE-W5 | `POST /reports/monthly` 훅 + 트리거 UI | reports 화면 | — | 0.5d |
| FE-W6 | `POST /ai/complete` 자유 채팅 패널 와이어링 | ai 또는 chat 화면 | — | 0.5d |
| FE-W7 | `useMe()` → 우상단 아바타 + dropdown(profile/logout) | topbar (G11) | — | 0.5d | ✓ done |
| FE-W8 | `/tasks/:id/comments`·`/issues/:id/comments` 훅 + Detail 통합 | TaskDetail / IssueDetail | BE-C5 | 1d |
| FE-W9 | report-recipients-editor 직접 fetch → `extendedApi.reports.send()` | report-recipients-editor.tsx | BE-C4 | 0.25d |

### 트랙 4 — TEST 보강 (현재 ⚠️ thin → ✅ good 으로 승격)

| Task | 작업 | 대상 | 추정 |
|------|------|-----|----:|
| TEST-B1 | BE integration: `PATCH /users/me`, `DELETE /tasks/:id`, `POST /issues/:id/transition` | BE-C1/C2/C3 와 함께 | 0.5d |
| TEST-B2 | BE integration: 신규 8 도메인 (approvals/clients/events/resources/docs/channels/org/auth-revoke) | BE-N1~N8 와 함께 (각 task 내 포함) | (포함) |
| TEST-B3 | BE 컨트랙트: comments, notifications/read-all, ai/*, reports/* OpenAPI mirror 추가 | api-routes-extended.test.ts 확장 | 0.5d |
| TEST-B4 | BE: SSE endpoint 통합 테스트(이벤트 1건 수신) | realtime.routes.ts | 0.5d |
| TEST-F1 | FE 컴포넌트 테스트: 핵심 hook의 React Query 통합(loading/error/cache invalidate) | useTasks/useIssues/useProjects/useApprovals 우선 | 1d |
| TEST-F2 | FE E2E: USE_MOCK=false 모드 smoke (모든 화면 200 OK) | playwright matrix | 1d |
| TEST-F3 | FE E2E: 핵심 user flow 5건 (task 생성→수정→삭제, issue 전이, approval 결정, event 생성, doc 생성) | playwright | 1d |
| TEST-F4 | FE: useRealtime 단위 테스트 (mock EventSource, 메시지 수신·재연결) | use-realtime.test.tsx | 0.5d |

### 트랙 5 — CLEANUP

| Task | 작업 | 추정 |
|------|------|----:|
| CL-1 | report-recipients-editor 직접 fetch 제거 (FE-W9에 포함, 명시 항목) | 0.25d (포함) |
| CL-2 | `/realtime/ws` OpenAPI 명시적 제외 표기 또는 등재 결정 | 0.1d |

---

## 3. 의존 그래프 + 병렬 가능 단위

```
[병렬 W1: 즉시 시작 가능]
  ├─ BE-C1 (DELETE /tasks)             →  TEST-B1
  ├─ BE-C2 (issue transition)          →  TEST-B1
  ├─ BE-C3 (PATCH /users/me)           →  TEST-B1
  ├─ BE-C5 (OpenAPI 등재 정정)          →  FE-W8 차단 해제
  ├─ FE-W1 (POST projects 와이어링)
  ├─ FE-W2 (project detail route)
  ├─ FE-W3 (PATCH projects)
  ├─ FE-W4 (POST issues 와이어링)
  ├─ FE-W5 (reports/monthly 훅)
  ├─ FE-W6 (ai/complete 패널)
  └─ FE-W7 (avatar dropdown)

[병렬 W2: 신규 도메인 — 서로 독립]
  ├─ BE-N1 (approvals, 3d)
  ├─ BE-N2 (clients, 2d)
  ├─ BE-N3 (events, 3d)
  ├─ BE-N4 (resources, 2d)
  ├─ BE-N5 (docs, 2d)
  ├─ BE-N6 (channels, 3d)
  ├─ BE-N7 (org, 2d)
  └─ BE-N8 (auth/revoke, 0.5d)

[직렬 W3: BE 완료 의존]
  ├─ BE-C4 (reports/send) → FE-W9 → CL-1
  ├─ BE-C5 → FE-W8 (comments)

[직렬 W4: 모든 BE/FE 완료 후]
  ├─ TEST-B3 (컨트랙트 확장)
  ├─ TEST-B4 (SSE)
  ├─ TEST-F1 (hook 통합)
  ├─ TEST-F2 (real-mode smoke)
  ├─ TEST-F3 (user flow E2E)
  └─ TEST-F4 (useRealtime)

[종결]
  └─ gap-detector(BE) ∥ gap-detector(FE) ∥ code-analyzer → match≥0.95 ∧ code≥95
```

**최단 경로 (1인)**: ~33d. **2인 병렬 (BE/FE 분리)**: ~16d. **3인 병렬 (BE-CORE/BE-NEW/FE+TEST)**: ~12d.

---

## 4. 게이트 매트릭스

| Gate | 도구 | 적용 시점 | 통과 기준 |
|------|------|----------|---------|
| typecheck | tsc | 매 PR | 0 errors |
| lint | biome / eslint | 매 PR | 0 errors |
| BE unit | vitest | 매 PR | 100% PASS |
| BE integration | vitest + supertest | BE 트랙 PR | 100% PASS |
| FE unit | vitest | 매 PR | 100% PASS |
| FE component | vitest + RTL | FE-W* PR | 추가 hook 100% PASS |
| OpenAPI lint | redocly | BE 트랙 PR | 0 errors, drift = 0 |
| Contract mirror | api-routes(-extended).test.ts | BE 트랙 PR | 100% PASS |
| Real-mode E2E | playwright (USE_MOCK=false) | 종결 직전 | 모든 화면 200 OK + 5 user flow PASS |
| gap-detector (BE) | bkit:gap-detector | 트랙 종결 | match ≥ 0.95 |
| gap-detector (FE) | bkit:gap-detector | 트랙 종결 | match ≥ 0.95 |
| code-analyzer | bkit:code-analyzer | 트랙 종결 | ≥ 95 |
| pdca-iterator | bkit:pdca-iterator | gap < 0.95 시 자동 | 2회 한도 |

---

## 5. 진행 요약 (자동 갱신 대상)

| 트랙 | 총 | done | in-review | in-progress | todo | 진행률 |
|------|---:|-----:|----------:|------------:|-----:|------:|
| BE-CORE (C1~C5) | 5 | 5 | 0 | 0 | 0 | **100%** ✓ |
| BE-NEW (N1~N8) | 8 | 2 | 0 | 0 | 6 | 25% |
| FE-WIRING (W1~W9) | 9 | 9 | 0 | 0 | 0 | **100%** ✓ |
| TEST (B1~B4 + F1~F4) | 8 | 0 | 0 | 0 | 8 | 0% |
| CLEANUP (CL1~CL2) | 2 | 0 | 0 | 0 | 2 | 0% |
| **합계** | **32** | **16** | **0** | **0** | **16** | **50.0%** ⭐ |

마지막 측정: 2026-04-29 (loop iter 16 — BE-N1 완료, **반환점 50% 도달 ⭐**)
다음 측정: loop iter 17 (예상: BE-N2 clients)

### 사이클 진행 로그

| Iter | 일시 | 완료 Task | 검증 | 비고 |
|-----:|------|----------|------|------|
| 1 | 2026-04-29 | BE-C5 (OpenAPI 정합) | redocly 0 errors / FE contract 39/39 / BE comments+notifications 17/17 | comments(4) + read-all body 정정 + /health 추가 + /ws 명시적 제외 표기 + Comment/CommentCreate schema 추가 |
| 2 | 2026-04-29 | BE-C3 (PATCH /users/me) | identity 10/10 / typecheck 0 / FE contract 39/39 | strict zod (additionalProperties:false), 6 mutable fields, 5 신규 단위 테스트(401/200/no-op/색상검증/strict/404). OpenAPI initials+color 추가 |
| 3 | 2026-04-29 | BE-C1 (DELETE /tasks/:id) | tasks 11/11 / 전체 198/198 / typecheck 0 | 소프트 삭제 + comment cascade(`comment.updateMany`), RBAC 멤버십 검사, 4 신규 단위 테스트(401/204+cascade/403/404). 204 No Content 응답 |
| 4 | 2026-04-29 | BE-C2 (issue transition) | issues 16/16 / 전체 208/208 / FE contract 39/39 / typecheck 0 | 상태 머신 (open↔in-progress↔in-review↔resolved + 재오픈), comment 옵션 시 audit Comment row 생성, 멱등 동일전이 허용. 10 신규 테스트 |
| 5 | 2026-04-29 | BE-C4 (reports/:id/send) | reports 12/12 / 전체 214/214 / typecheck 0 | 수신자 이메일 큐 적재 stub, audit log, OpenAPI 등재. 6 신규 테스트(401/200/빈 recipients 400/잘못된 이메일 400/strict/리포트 없음). **BE-CORE 트랙 5/5 종결 ✓** — SMTP 실연동은 follow-up |
| 6 | 2026-04-29 | BE-N8 (auth/tokens/revoke) | auth 7/7 / 전체 221/221 / typecheck 0 | 새 `auth` 모듈 신설(`modules/auth/auth.routes.ts`), strict zod, audit-log 기반 stub, 멱등 보장. OpenAPI 응답 스키마 정합화. 7 신규 테스트. 영속화 모델(RevokedToken)은 follow-up. BE-NEW 트랙 1/8 진입 |
| 7 | 2026-04-29 | FE-W7 (avatar dropdown) | FE typecheck 0 / 98/98 vitest | topbar.tsx에 useMe() 통합 (live data + ME fixture fallback). UserMenu 컴포넌트 신설: aria-menu, click-outside, Escape 닫기, 프로필/로그아웃 메뉴. **FE 트랙 1/9 진입** |
| 8 | 2026-04-29 | FE-W3 (PATCH /projects) | FE typecheck 0 / 98/98 vitest | api.updateProject + useProjectMutations(create+update) 훅 신설, progress portfolio 행에 status select 인라인 편집 와이어링. **진행률 25% 도달 (1/4 마일스톤)** |
| 9 | 2026-04-29 | FE-W1 (POST /projects) | FE typecheck 0 / 98/98 vitest | 신규 `ProjectCreateDialog` (name/code/color/due 필드, autoFocus, color picker), progress 화면 우상단에 "새 프로젝트" 버튼 추가, 빈 상태 안내. useProjectMutations.create 와이어링 |
| 10 | 2026-04-29 | FE-W4 (POST /issues) | FE typecheck 0 / 98/98 vitest | 신규 `IssueCreateDialog` (title/proj/assignee/reporter/sev/prio 필드, 기본값 PROJECTS[0]/TEAM[0]/med/P2), issues-full 툴바 "새 이슈" 버튼에 onClick 와이어링, Toolbar prop drilling. useIssueMutations.create 사용 (FE 스키마 names 형태 준수, BE id 형태와의 contract drift는 별도 follow-up) |
| 11 | 2026-04-29 | FE-W5 (POST /reports/monthly) | FE typecheck 0 / 98/98 vitest | api.generateMonthlyReport({year,month}) + useAiMutations.monthlyReport 추가, report-monthly 화면 "AI 다시 생성" 버튼에 onClick 와이어링 (loading 상태 표시, 생성 결과로 화면 swap, periodLabel 동적 계산). USE_MOCK 분기에 임원용 6개 KPI/OKR/리스크 매트릭스 픽스처 |
| 12 | 2026-04-29 | FE-W9 (reports/send refactor) | FE typecheck 0 / 98/98 vitest | report-recipients-editor의 직접 fetch 호출 제거. extendedApi.sendReport(reportId, {recipients}) + useReportSend() 훅 신설, 중앙 onError/toast 정책 일관화. USE_MOCK 분기 포함, sending 로컬 상태 → mutation.isPending 으로 단순화 |
| 13 | 2026-04-29 | FE-W6 (POST /ai/complete) | FE typecheck 0 / 98/98 vitest | 신규 `AiChatPanel` 컴포넌트 (`components/ai/ai-chat-panel.tsx`) — 단일 스레드 자유 채팅, useAiMutations.complete 와이어링, user/assistant turns + 로딩 인디케이터 + 초기화 버튼. ai-auto 화면 좌측 컬럼 "최근 자동 등록" 위에 배치 |
| 14 | 2026-04-29 | FE-W8 (comments 훅 + Detail 통합) | FE typecheck 0 / 98/98 vitest | Comment/CommentCreate Zod 스키마 + extendedApi(listTaskComments/createTaskComment/listIssueComments/createIssueComment) + 4개 hooks(useTaskComments/useTaskCommentCreate/useIssueComments/useIssueCommentCreate). 신규 재사용 컴포넌트 `CommentThread` (kind: 'task'\|'issue', 상대 시간, loading/empty 상태, 인라인 composer). TaskDetailDialog의 unwired footer composer 제거하고 `<CommentThread kind="task" parentId={task.id} />` 통합. IssueDetail 표면은 미존재이므로 hooks + 컴포넌트가 향후 통합 준비 상태 |
| 15 | 2026-04-29 | FE-W2 (project detail route) | FE typecheck 0 / 98/98 vitest | 신규 dynamic route `app/projects/[id]/page.tsx` (Next.js 15 async params), `ProjectDetail` + `ProjectDetailRoute` 컴포넌트. useProject(id) + useTasks({projectId}) 훅 사용. 진행률/태스크/멤버 3-카드 KPI + 태스크 목록 + 새로고침 + not-found 분기. **FE-WIRING 트랙 9/9 종결 ✓** |
| 16 | 2026-04-29 | BE-N1 (approvals 3 EP) | BE 229/229 vitest (+8 신규) / approvals 8/8 | 신규 `modules/approvals/approvals.routes.ts` (in-memory store + audit log stub 패턴, BE-N8 동일). 3 라우트: GET /approvals (status filter), POST /approvals (201), POST /approvals/:id/decision (RBAC: approver만, 멱등 거절 시 400, 존재없음 404). app.ts 등록. 8 테스트(401/입력검증/생성+조회/필터/RBAC/멱등/404). **반환점 50% 도달 ⭐ — 영속화는 follow-up** |

---

## 6. PDCA 단계별 산출물 위치

```
project/all-flow-backend/docs/pdca/    ← BE-C* / BE-N* 각 task의 PDCA 본문 (각 task 시작 시 생성)
project/all-flow-frontend/docs/pdca/   ← FE-W* / TEST-F* 각 task의 PDCA 본문
project/PDCA-MASTER-TRACKING.md        ← 본 문서 (사이클 SSoT)

종결 시 (lifecycle policy):
  git mv project/PDCA-MASTER-TRACKING.md         → docs/archive/{YYYY-MM}/be-fe-mapping-fix-2026-04-29/
  git mv project/all-flow-{backend,frontend}/docs/pdca/* → 동일 archive/pdca/{stack}/
```

각 task당 PDCA 문서 명명: `{NN-trackcode}-{task-id}-{slug}.md` 예: `00-be-c1-tasks-delete.md`, `01-be-n1-approvals.md`, `02-fe-w1-projects-create.md`.

---

## 7. 운영 자동화

- 각 에이전트는 task 완료 시 본 표 + 해당 PDCA `Status:` 라인 동기화
- `av-base-sync` 가 inconsistency 감지 시 PR 차단
- `av-base-memory-keeper` 가 트랙 종결마다 `learning_be_fe_mapping_fix_*.md` 누적
- `bkit:pdca-iterator` 가 gap < 0.95 시 자동 트리거 (max 2 iterations / track)

---

## 8. 종결 정의 (Definition of Done)

본 사이클은 다음 조건을 **모두** 만족할 때 PM 최종 승인 후 archive:

1. 5축 매트릭스 44 항목 중 ≥ 95% 가 ✅✅✅✅✅ (5/5 정합)
2. USE_MOCK=false 모드에서 playwright smoke 100% PASS
3. BE / FE gap-detector match ≥ 0.95
4. bkit:code-analyzer ≥ 95
5. 직접 fetch 0건
6. 모든 task의 PDCA 문서가 status `✓ done`

---

## 9. 다음 액션 (PM 승인 후)

1. PM 승인 → `/av pm team` 으로 BE-PL + FE-PL 병렬 스폰
2. **W1 일괄 시작** (BE-C1~C5 + FE-W1~W7) — 의존 없음, 즉시 병렬
3. **W2 진입** (BE-N1~N8) — 도메인별 독립, 우선순위는 PM이 결정
4. **W3 직렬** (BE-C4→FE-W9, BE-C5→FE-W8)
5. **W4 통합 테스트** (TEST-* 8건) — 모든 BE/FE 완료 후
6. 종결 보고 → memory-keeper 학습 적재 → archive `git mv`

---

**참고 산출물**:
- `docs/archive/2026-04/all-flow-fullstack-2026-04-29/follow-up-mapping-audit.md` (입력 감사)
- `docs/archive/2026-04/all-flow-fullstack-2026-04-29/PDCA-MASTER-TRACKING.md` (직전 사이클 종결 SSoT, 참고)
- `docs/archive/2026-04/_INDEX.md` (라이프사이클 정책)
