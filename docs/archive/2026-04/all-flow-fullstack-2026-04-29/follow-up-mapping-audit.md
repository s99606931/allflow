# FE ↔ BE 1:1 Mapping Audit — Follow-up

> **Type**: Read-only audit (action 후속 결정 대기)
> **Scope**: all-flow 사이클 종결 직후의 FE/BE 연계 정합성 검증
> **Date**: 2026-04-29
> **Trigger**: `/av pm team` — 누락된 FE↔BE 연결과 추가 개발 후보 식별
> **Methodology**: 2× Explore 에이전트 병렬 인벤토리 → 1:1 매트릭스 합성 → 갭 분류

---

## 0. 한 줄 요약

**FE는 BE를 앞서 갔다.** OpenAPI에 선언되고 FE 훅·컴포넌트도 와이어링 완료되었지만 BE 코드 핸들러가 없는 엔드포인트가 **15건**. 개발 중에는 `USE_MOCK=true` 로 마스킹되어 정상 동작처럼 보이지만, **real 모드 첫 진입 시 404 또는 mock-only 화면이 발생**.

| 카테고리 | 건수 | 심각도 | 비고 |
|---------|----:|:------:|------|
| 🔴 BE 미구현 (FE는 호출 중) | **15** | High | real 모드 즉시 404 |
| 🟡 OpenAPI 미수록 (BE 구현 + FE 호출) | **3** | Medium | 계약 누락 (comments × 2 + read-all) |
| 🟡 OpenAPI 계약 불일치 | **1** | Medium | `/notifications/read-all` body 시그니처 |
| 🟢 직접 fetch (anti-pattern) | **1** | Low | `/reports/{id}/send` |
| 🟢 BE 구현 + FE 미사용 (dead) | **0** | — | comments는 FE에서 곧 사용 예정 |
| 🟢 정합 (BE↔FE 양방 정상) | **20** | — | 핵심 도메인 그대로 동작 |

**총 BE 핸들러 23개** (openapi 등재 10 + 미등재 13) **/ 총 FE 호출 35개** (real + mock 합산)

---

## 1. 1:1 매핑 매트릭스 (전체)

범례:
- **B** = BE 코드 핸들러 존재 / **O** = OpenAPI 등재 / **F** = FE 훅 정의 / **U** = FE 컴포넌트 와이어링(사용처 존재)
- ✅ 정합 / ⚠️ 부분 갭 / 🔴 결함

| # | Method + Path | B | O | F | U | 상태 | 호출처 (대표) | BE 파일 | 비고 |
|--:|--------------|:-:|:-:|:-:|:-:|:----:|--------------|--------|------|
| 1 | `GET /health` | ✅ | ❌ | ❌ | ❌ | ⚠️ | infra | health.routes.ts:11 | OpenAPI 미등재(허용) |
| 2 | `GET /users/me` | ✅ | ✅ | ✅ | ❌ | ⚠️ | `useMe()` 정의만 | identity.routes.ts:16 | 컴포넌트 미사용 |
| 3 | `PATCH /users/me` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | `useProfileMutations.update` (decoration 5.7.2) | — | **BE 미구현** |
| 4 | `GET /projects` | ✅ | ✅ | ✅ | ✅ | ✅ | progress.tsx:6,16 | projects.routes.ts:56 | — |
| 5 | `POST /projects` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | (decoration 1.2.1) | projects.routes.ts:90 | UI 와이어링 미완 |
| 6 | `GET /projects/:id` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | (decoration 1.2.2) | projects.routes.ts:120 | 라우트 자체 부재 |
| 7 | `PATCH /projects/:id` | ✅ | ✅ | ❌ | ❌ | ⚠️ | — | projects.routes.ts:138 | FE 훅 부재 |
| 8 | `GET /tasks` | ✅ | ✅ | ✅ | ✅ | ✅ | tasks.tsx:7 / ai-auto.tsx:6 | tasks.routes.ts:83 | — |
| 9 | `POST /tasks` | ✅ | ✅ | ✅ | ✅ | ✅ | tasks.tsx:26 / chat.tsx:10 | tasks.routes.ts:106 | — |
| 10 | `PATCH /tasks/:id` | ✅ | ✅ | ✅ | ✅ | ✅ | tasks.tsx:26 (inline edit) | tasks.routes.ts:143 | — |
| 11 | `DELETE /tasks/:id` | 🔴 | ✅ | ✅ | ✅ | 🔴 | tasks.tsx:26 (delete action) | — | **BE 미구현** |
| 12 | `GET /tasks/:id/comments` | ✅ | ❌ | ❌ | ❌ | ⚠️ | (FE 훅 부재) | comments.routes.ts:48 | OpenAPI 미등재 + FE 미사용 |
| 13 | `POST /tasks/:id/comments` | ✅ | ❌ | ❌ | ❌ | ⚠️ | (FE 훅 부재) | comments.routes.ts:56 | 위와 동일 |
| 14 | `GET /issues` | ✅ | ✅ | ✅ | ✅ | ✅ | issues-full.tsx:7,45 | issues.routes.ts:94 | — |
| 15 | `POST /issues` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | (decoration 1.4.5) | issues.routes.ts:116 | UI 와이어링 미완 |
| 16 | `POST /issues/:id/transition` | 🔴 | ✅ | ✅ | ✅ | 🔴 | issues-full.tsx:301 | — | **BE 미구현** |
| 17 | `GET /issues/:id/comments` | ✅ | ❌ | ❌ | ❌ | ⚠️ | (FE 훅 부재) | comments.routes.ts:77 | OpenAPI 미등재 |
| 18 | `POST /issues/:id/comments` | ✅ | ❌ | ❌ | ❌ | ⚠️ | (FE 훅 부재) | comments.routes.ts:85 | 위와 동일 |
| 19 | `GET /notifications` | ✅ | ✅ | ✅ | ✅ | ✅ | notifications.tsx:6,28 | notifications.routes.ts:51 | — |
| 20 | `POST /notifications/:id/read` | ✅ | ✅ | ✅ | ✅ | ✅ | notifications.tsx:29 | notifications.routes.ts:68 | — |
| 21 | `POST /notifications/read-all` | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | notifications.tsx:29 | notifications.routes.ts:88 | **계약 불일치**: OpenAPI는 `{ids[]}` body, BE는 body 없음(전체 unread) |
| 22 | `GET /realtime/sse` | ✅ | ✅ | ✅ | ✅ | ✅ | useRealtime | realtime.routes.ts:21 | — |
| 23 | `GET /realtime/ws` | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | (fallback) | realtime.ws.ts:39 | OpenAPI 미등재 (WS 특성) |
| 24 | `POST /ai/complete` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | (decoration) | ai.routes.ts:56 | 컴포넌트 와이어링 미완 |
| 25 | `POST /ai/extract-actions` | ✅ | ✅ | ✅ | ✅ | ✅ | ai-auto.tsx:6,48 | ai.routes.ts:79 | — |
| 26 | `POST /reports/weekly` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | (decoration 4.1) | reports.routes.ts:56 | UI 미완 |
| 27 | `POST /reports/monthly` | ✅ | ✅ | ❌ | ❌ | ⚠️ | — | reports.routes.ts:93 | FE 훅 부재 |
| 28 | `POST /reports/:id/send` | 🔴 | ⚠️ | 🔴 | ✅ | 🔴 | report-recipients-editor.tsx:62 (**direct fetch**) | — | **BE 미구현 + FE 직접 fetch (anti-pattern)** |
| 29 | `GET /approvals` | 🔴 | ✅ | ✅ | ✅ | 🔴 | approvals.tsx:5 | — | **BE 미구현** |
| 30 | `POST /approvals` | 🔴 | ✅ | ✅ | ✅ | 🔴 | approval-form.tsx:16,30 | — | **BE 미구현** |
| 31 | `POST /approvals/:id/decision` | 🔴 | ✅ | ✅ | ✅ | 🔴 | approvals.tsx:166 | — | **BE 미구현** |
| 32 | `GET /clients` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | (decoration 2.2) | — | **BE 미구현** |
| 33 | `POST /clients` | 🔴 | ✅ | ✅ | ✅ | 🔴 | client-form.tsx:9,21 | — | **BE 미구현** |
| 34 | `GET /events` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | (decoration 1.6) | — | **BE 미구현** |
| 35 | `POST /events` | 🔴 | ✅ | ✅ | ✅ | 🔴 | event-create-dialog.tsx:14,31 | — | **BE 미구현** |
| 36 | `GET /resources` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | (decoration 5.4) | — | **BE 미구현** |
| 37 | `POST /resources/book` | 🔴 | ✅ | ✅ | ✅ | 🔴 | resource-book-dialog.tsx:14,33 | — | **BE 미구현** |
| 38 | `GET /docs` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | (decoration 1.7) | — | **BE 미구현** |
| 39 | `POST /docs` | 🔴 | ✅ | ✅ | ✅ | 🔴 | doc-create-dialog.tsx:13,23 | — | **BE 미구현** |
| 40 | `GET /channels` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | (decoration 1.8) | — | **BE 미구현** |
| 41 | `POST /channels/:channelId/messages` | 🔴 | ✅ | ✅ | ✅ | 🔴 | composer / chat.tsx:10 | — | **BE 미구현** |
| 42 | `GET /org/units` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | (decoration 5.1) | — | **BE 미구현** |
| 43 | `POST /org/invitations` | 🔴 | ✅ | ✅ | ✅ | 🔴 | org.tsx:6,22 | — | **BE 미구현** |
| 44 | `POST /auth/tokens/revoke` | 🔴 | ✅ | ✅ | ⚠️ | 🔴 | (decoration 5.7.5) | — | **BE 미구현** |

**합계**: BE 핸들러 23 (정합 14 + 부분갭 9) + BE 미구현 15.

---

## 2. 갭 분류 — 추가 개발 후보 (우선순위)

### 🔴 P0 — 핵심 도메인 BE 누락 (사용자 클릭 즉시 404)

이미 FE 컴포넌트가 mutate/query를 호출하므로 USE_MOCK=false 진입 시 즉시 결함. **production blocker.**

| ID | 작업 | 예상 규모 | BE PDCA 생성 권고 |
|----|------|---------:|-----------------|
| BE-N1 | `DELETE /tasks/:id` 핸들러 추가 + cascade 정의 | 0.5d | 02-core-tasks 확장 |
| BE-N2 | `POST /issues/:id/transition` (상태 머신) | 1d | 02-core-issues 확장 |
| BE-N3 | `PATCH /users/me` (프로필 업데이트) | 0.5d | 02-core-identity 확장 |
| BE-N4 | `/approvals` 도메인 (3 ep) — 모델 + RBAC + 결정 트랜잭션 | 3d | 신규 PDCA |
| BE-N5 | `/clients` 도메인 (CRM, 2 ep) | 2d | 신규 PDCA |
| BE-N6 | `/events` 도메인 (캘린더, 2 ep + RRULE 옵션) | 3d | 신규 PDCA |
| BE-N7 | `/resources` 도메인 (예약, 2 ep + 충돌 검증) | 2d | 신규 PDCA |
| BE-N8 | `/docs` 도메인 (위키, 2 ep + 본문 저장) | 2d | 신규 PDCA |
| BE-N9 | `/channels` 도메인 (채팅, 2 ep + 메시지 저장) | 3d | 신규 PDCA |
| BE-N10 | `/org/units`, `/org/invitations` (조직 관리, 2 ep) | 2d | 신규 PDCA |
| BE-N11 | `POST /auth/tokens/revoke` (세션 폐기) | 0.5d | 01-foundation-auth 확장 |
| BE-N12 | `POST /reports/:id/send` (이메일 발송) | 1d | 04-reports-* 확장 |

**P0 합계**: 12건, **~21 dev-day**

### 🟡 P1 — 계약/문서 정합 (비차단, 회귀 가드 필요)

| ID | 작업 | 예상 규모 |
|----|------|---------:|
| C-1 | `/tasks/:id/comments`·`/issues/:id/comments` (4 ep) OpenAPI 등재 | 0.25d |
| C-2 | `/notifications/read-all` 계약 일치화 (BE 동작에 OpenAPI 맞춤 — body 없음) | 0.1d |
| C-3 | `/health`·`/realtime/ws` OpenAPI 등재 (또는 명시적 제외 표기) | 0.25d |

**P1 합계**: 3건, **~0.6 dev-day**

### 🟡 P2 — FE 와이어링 미완 (BE 정상, FE만 보강)

이미 BE 핸들러가 있고 OpenAPI도 정합한데 컴포넌트가 호출하지 않거나 훅만 정의된 상태.

| ID | 작업 | 화면 |
|----|------|------|
| F-1 | `POST /projects` 와이어링 (1.2.1 New project) | Progress 또는 신규 사이드패널 |
| F-2 | `GET /projects/:id` 디테일 라우트 (`/projects/[id]`) | 신규 페이지 |
| F-3 | `PATCH /projects/:id` 훅 추가 + 카드 인라인 편집 | Progress |
| F-4 | `POST /issues` 와이어링 (1.4.5) | IssuesFull |
| F-5 | `POST /reports/monthly` 훅 + 트리거 UI | Reports |
| F-6 | `POST /ai/complete` 자유 채팅 패널 와이어링 | AI 또는 Chat |
| F-7 | `useMe()` 결과 → 우상단 아바타 노출 (G11) | Topbar |
| F-8 | `/tasks/:id/comments`, `/issues/:id/comments` 훅 추가 + TaskDetail/IssueDetail 통합 | 1.3.10 / 1.4.6 |

**P2 합계**: 8건, **~5 dev-day** (UI 디자인 시간 별도)

### 🟢 P3 — 안티패턴 정리

| ID | 작업 |
|----|------|
| A-1 | `report-recipients-editor.tsx:62` 직접 fetch → `extendedApi.reports.send()` 추출 + 훅화 (BE-N12 와 함께) |

---

## 3. UI 컨트롤 와이어링 비율 (PDCA-00 인벤토리 재집계)

PDCA-00 SSoT 기준 110 컨트롤. 직전 사이클 종결 시점 와이어링 22(20%) → **본 감사 후 갱신**:

| 분류 | 수 | 비율 |
|------|---:|----:|
| 와이어링 완료 (call site + BE 정상) | 28 | 25% |
| 와이어링 완료 — BE 누락 (mock 전용) | **30** | 27% |
| local state 만 (filter/tab/select) | 25 | 23% |
| decoration (callback 미연결) | 27 | 25% |
| **합계** | **110** | 100% |

> **핵심 인사이트**: 표면 와이어링률 ~52% 중 절반(~27%)이 BE 부재로 인한 mock-only — 실제 production-ready 컨트롤은 **~25%**.

---

## 4. 정책 영향 — 신규 PDCA 사이클 시드 (실행 안 함, 결정 대기)

A안 (옵션 A) 채택 시 본 감사 결과로부터 다음 사이클을 자동 시드 가능:

```
project/PDCA-MASTER-TRACKING.md  (재생성)
└─ Cycle: be-fe-mapping-fix-2026-05  (가칭)
   ├─ 트랙 1 (Backend 핵심 보강 — BE-N1~N3, C-1~C-3)        [1주]
   ├─ 트랙 2 (Backend 신규 도메인 — BE-N4~N11 중 우선순위)   [3~4주]
   ├─ 트랙 3 (Frontend 와이어링 — F-1~F-8)                  [1주]
   └─ 트랙 4 (Anti-pattern 정리 — A-1)                       [0.25일]
```

**총 추정 작업량**: ~27 dev-day (P0 21 + P1 0.6 + P2 5 + P3 0.25). 단일 개발자 ~6주 / 2명 병렬 ~3주.

---

## 5. 검증 자료

- **BE 인벤토리**: Explore 에이전트, Fastify 라우트 + openapi.yaml 전수 (2026-04-29)
- **FE 인벤토리**: Explore 에이전트, `src/lib/api/{http,extended}.ts` + 모든 hooks/components/dialogs (2026-04-29)
- **UI 인벤토리**: `pdca/frontend/00-menu-button-inventory.md` (110 컨트롤 SSoT)
- **회귀 기준선**: BE gap 0.984 / FE gap 0.965 / code 100 (2026-04-29 archive 시점)

---

## 6. 결론 + 추천 액션

1. **현 상태**: production 미준비. BE 미구현 15건이 USE_MOCK 마스킹으로 가려져 있음.
2. **최단 production 경로**: P0 + P1 (~21.6 dev-day). 도메인 12개 중 우선순위는 사용자 결정 필요 (예: 결재 + 조직 + tasks DELETE 만 먼저).
3. **권고**: 본 감사를 PRD 입력으로 사용해 `/av pm team be-fe-mapping-fix` 신규 사이클 개시. 직전 합의된 라이프사이클(`project/.../docs/pdca/` active → 종결 시 archive) 그대로 적용.

---

**부속서 A — Explore 에이전트 산출물**: 본 감사 합성에만 사용, 별도 보존 안 함.
**다음 업데이트 트리거**: BE-N* 또는 F-* 항목 1개 이상 머지 시 본 매트릭스 갱신.
