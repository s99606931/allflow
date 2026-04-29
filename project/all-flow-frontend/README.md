# ALL-Flow — Frontend Codebase

> **Next.js 16 + React 19 + Tailwind v4** 으로 구현된 ALL-Flow 사내 협업 시스템 프론트엔드.
> 모든 25개 화면이 React 컴포넌트로 구현되어 있고, 사이드바에서 즉시 라우팅됩니다.

## 빠른 시작

```bash
cd all-flow-frontend
pnpm install
# next-auth v5 는 AUTH_SECRET 이 없으면 부팅에 실패합니다. 데모용 임시값 OK.
export AUTH_SECRET=$(openssl rand -hex 32)
# (선택) in-app /api/v1 stub 라우트로 fetch 경로까지 검증하려면:
export NEXT_PUBLIC_USE_MOCK=false
export NEXT_PUBLIC_REALTIME_MODE=sse   # SSE 스트림 → /api/v1/sse 자동 연결
pnpm dev         # → http://localhost:3000
pnpm storybook   # → http://localhost:6006 (디자인 시스템 갤러리, Storybook 10)
```

**데모 로그인** — `/login` 으로 자동 리디렉션. 이메일 자유 입력 + 아무 비밀번호 (Credentials provider).
운영용 OAuth 는 `.env.example` 의 `AUTH_GOOGLE_ID/SECRET`, `AUTH_KAKAO_ID/SECRET` 채우면 됨.

## 백엔드 통합 레이어 ✨ (v4)

| 영역 | 위치 | 비고 |
|---|---|---|
| **OpenAPI 3.1 스펙** | `openapi.yaml` | Identity · Projects · Tasks · Issues · Reports · AI · Realtime · Notifications |
| **Zod 스키마** | `src/lib/schemas.ts` | 모든 API 응답 런타임 검증 + 타입 자동 추론 |
| **API 클라이언트** | `src/lib/api.ts` | Mock ↔ HTTP 단일 시멘 + Zod 검증 + Bearer 토큰 훅 |
| **WebSocket / SSE** | `src/lib/realtime.ts` | `useRealtime()` · `useRealtimeEvents()` · 자동 재연결 + 모드 토글 |
| **PDF 리포트** | `src/lib/pdf-reports.tsx` | 주간/월간 react-pdf 렌더 + Pretendard CDN · 다이내믹 임포트 |
| **Storybook 10** | `.storybook/` · `*.stories.tsx` | Foundation/Tokens · Primitives 갤러리 · 라이트/다크 + 6 액센트 토글 |
| **In-app stub 백엔드** | `src/app/api/v1/**/route.ts` | 11개 Next.js Route Handler — Identity · Projects · Tasks · Issues · Notifications · Reports/Weekly · AI/Complete · AI/Extract-Actions · SSE 스트림 |
| **테스트** | `tests/` · `vitest.config.ts` · `playwright.config.ts` | 유닛 5 스위트 / 68 케이스 (프리미티브 · 스토어 · 스키마 · NAV · API 라우트) + E2E 26 케이스 (전 라우트 · 인터랙션 · 콘솔 가드) |
| **CI** | `.github/workflows/ci.yml` | typecheck · lint · vitest · playwright · build · build-storybook |

코드 생성:
```bash
pnpm openapi:check         # 스펙 lint
pnpm openapi:gen           # → src/lib/api-types.gen.ts
```

## 테스트

```bash
pnpm test                  # Vitest 유닛 (jsdom + RTL)
pnpm test:watch            # 워치 모드
pnpm test:cov              # 커버리지 (text + html + lcov)

pnpm e2e:install           # 최초 1회 — Chromium + 의존성
pnpm e2e                   # Playwright (개발 서버 자동 기동)
pnpm e2e:ui                # 디버거 UI

pnpm test:all              # 유닛 + E2E 한번에
```

| 카테고리 | 위치 | 커버 |
|---|---|---|
| 프리미티브 | `tests/unit/primitives.test.tsx` | Button(4×3) · IconButton · Badge(5) · Card · Avatar/Stack · Progress · StatusDot |
| 스토어 | `tests/unit/ui-store.test.ts` | 테마 · 액센트 6종 · 사이드바 · AI 패널 |
| 스키마 | `tests/unit/schemas.test.ts` | Zod ↔ 픽스처 일치 · enum · Realtime 디스크리미네이트 |
| NAV | `tests/unit/nav.test.ts` | id/href 유일성 · 라우트 매칭 |
| API 라우트 | `tests/unit/api-routes.test.ts` | 11개 `/api/v1/*` 핸들러 in-process 호출 + Zod 검증 |
| 라우트 스모크 | `tests/e2e/routes.spec.ts` | 라우트 정상 렌더 · 사이드바 순회 클릭 |
| 인터랙션 | `tests/e2e/interactions.spec.ts` | 사이드바 접기 · AI 패널 · Tweaks 다크 · ⌘K · 이슈 4-탭 |
| 콘솔 가드 | `tests/e2e/console-errors.spec.ts` | 전 라우트 pageerror 0 (120s 타임아웃 — dev 콜드 컴파일 흡수) |

## 라우트 / 화면 매핑

| 라우트 | 화면 | 핵심 기능 |
|---|---|---|
| `/` | **대시보드** | KPI 4개 · 오늘 할 일 · AI 인사이트 · 프로젝트 진행률 · 최근 활동 |
| `/login` | 로그인 | Google · Kakao · SSO · Credentials |
| `/projects` | 프로젝트 | 카드 그리드 + 태스크 상세 모달 트리거 |
| `/tasks` | **내 태스크** | 리스트 · 보드 (5컬럼) · 캘린더 — 클릭 시 상세 드로어 |
| `/issues` | **이슈 관리** | 리스트 · 보드 · SLA(임박 + 정책 + AI) · 분석(추이 + 리더보드) |
| `/calendar` | **캘린더** | 주 뷰 · 시간격 그리드 · AI 일정 추천 |
| `/chat` | **팀 채팅** | 채널 + DM + AI 인-라인 액션 추출 |
| `/docs` | **문서/위키** | 트리 + 에디터 + AI 요약 + 댓글 |
| `/progress` | **진행률 관리** | 포트폴리오 · 간트 · 헬스체크 6개 메트릭 |
| `/clients` | **고객사 (CRM)** | MRR/ARR + 헬스 스코어 + 8개사 카드 |
| `/ai-auto` | **AI 자동 등록** | 회의록 → 액션 아이템 추출 · 5개 입력 소스 |
| `/notion` | **Notion 연동** | 6개 DB 양방향 동기화 + 정책 |
| `/reports/weekly` | **주간 보고** | AI 자동 작성 + 인용 · KPI · 프로젝트별 진척 |
| `/reports/monthly` | **월간 보고** | Executive Summary · OKR · 리스크 매트릭스 |
| `/org` | **조직도** | CEO + 4개 부서 + 멤버 |
| `/users` | **사용자 관리** | 역할 (Owner/Admin/Member) · MFA · 일괄 액션 |
| `/admin` | **관리자 콘솔** | 시스템 헬스 · 워크스페이스 설정 · 감사 로그 |
| `/notifications` | **알림 센터** | @멘션 · SLA · AI 제안 · 시스템 |
| `/approvals` | **결재함** | 받은/보낸/참조/완료 4탭 · 결재 라인 시각화 · OCR 영수증 |
| `/hr` | **인사 / HR** | 휴가 · 근태 · 평가 · OKR · 급여 · 교육 6탭 |
| `/resources` | **회의실 · 리소스** | 회의실 시간 그리드 · 장비 · 주차 + AI 추천 시간 |
| `/settings` | **개인 설정** | 프로필 · 보안(MFA) · 알림 매트릭스 · 연동 · 세션 |

## 폴더 구조

```
all-flow-frontend/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx · page.tsx · globals.css
│  │  ├─ login/page.tsx
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  └─ v1/                # in-app stub backend (11 routes)
│  │  │     ├─ users/me/route.ts
│  │  │     ├─ projects/route.ts · projects/[id]/route.ts
│  │  │     ├─ tasks/route.ts · tasks/[id]/route.ts
│  │  │     ├─ issues/route.ts · notifications/route.ts
│  │  │     ├─ reports/weekly/route.ts
│  │  │     ├─ ai/{complete,extract-actions}/route.ts
│  │  │     └─ sse/route.ts    # SSE 실시간 스트림
│  │  └─ {tasks, issues, calendar, chat, docs, progress, clients,
│  │       ai-auto, notion, reports/{weekly, monthly},
│  │       org, users, admin, notifications,
│  │       approvals, hr, resources, settings}/page.tsx
│  ├─ auth.ts                  # next-auth v5 (Google · Kakao · Credentials)
│  ├─ proxy.ts                 # Next 16 라우트 가드 (구 middleware.ts)
│  ├─ components/
│  │  ├─ providers.tsx
│  │  ├─ shell/
│  │  │  ├─ app-shell.tsx      # Sidebar + Topbar + AIPanel + Tweaks
│  │  │  ├─ sidebar.tsx · topbar.tsx · ai-panel.tsx
│  │  ├─ ui/primitives.tsx     # Card · Button · Badge · Avatar · Progress · StatusDot
│  │  └─ screens/              # 모든 페이지 컴포넌트 (총 18+개)
│  │     ├─ dashboard.tsx · projects.tsx · tasks.tsx · issues-full.tsx
│  │     ├─ calendar.tsx · chat.tsx · docs.tsx
│  │     ├─ progress.tsx · clients.tsx
│  │     ├─ ai-auto.tsx · notion.tsx
│  │     ├─ report-weekly.tsx · report-monthly.tsx
│  │     ├─ org.tsx · users.tsx · admin.tsx · notifications.tsx
│  │     ├─ task-detail.tsx    # Radix Dialog 기반 드로어
│  │     └─ _stub.tsx          # PageStub + TweaksFloating
│  ├─ lib/
│  │  ├─ tokens.ts · types.ts · fixtures.ts · api.ts · utils.ts
│  └─ store/ui-store.ts        # Zustand + persist
├─ next.config.ts · package.json · tsconfig.json · README.md · .env.example
```

## 디자인 토큰

`src/app/globals.css` 의 `@theme` 블록 + `[data-theme="dark"]` / `[data-accent]` 변형. Tailwind v4 가 모든 토큰을 자동으로 클래스화합니다.

### 컬러
- **표면**: `bg-bg` · `bg-bg-1` · `bg-bg-2` · `bg-bg-elev` · `bg-hover`
- **텍스트**: `text-fg` · `text-fg-1` · `text-fg-2` · `text-fg-3`
- **테두리**: `border-border` · `border-border-strong`
- **액센트**: `accent` · `accent-soft` · `accent-fg` · `accent-strong` ← `[data-accent]` 6종
- **상태**: `success` · `warning` · `danger` · `info` (각 `-soft` 동반)

### 액센트 6종
`Blue` (기본) · `Indigo` · `Violet` · `Teal` · `Amber` · `Rose` — Tweaks 패널 (우하단) 에서 실시간 변경.

### 타입 / 라운드 / 섀도우
- 폰트: **Pretendard Variable** (CDN), 모노 fallback
- 라운드: `xs(4) · sm(6) · md(8) · lg(12) · xl(16)`
- 섀도우: `sm · md · lg · pop` (모달/드로어)

## 상태 관리 / 데이터 흐름

```
React Query  ──→  api.listProjects()
                       │
                       ├── USE_MOCK=true  → fixtures.ts 에서 250ms 지연 후 반환
                       └── USE_MOCK=false → ky.get('/api/v1/projects')
                                              └─→ src/app/api/v1/projects/route.ts (in-app stub)
```

**Zustand 스토어** (`store/ui-store.ts`):
`theme · accent · sidebarCollapsed · aiPanelOpen` — `persist` 로 localStorage 동기화

## 인증 (next-auth v5)

- **`auth.ts`** — Google · Kakao · Credentials providers, JWT 세션. `AUTH_SECRET` 필수
- **`proxy.ts`** — Next 16 라우트 가드. `/login`, `/api/auth`, `/api/v1` 만 public
- **`app/api/auth/[...nextauth]/route.ts`** — handler 마운트
- **`app/login/page.tsx`** — 좌측 브랜드 패널 + 우측 SSO/이메일 폼

> `NEXT_PUBLIC_E2E=true` 면 게이트가 모두 통과 — Playwright 전용. 운영에서는 절대 켜지 않을 것.

## 외부 연동

| 시스템 | 위치 | 상태 |
|---|---|---|
| Google / Kakao OAuth | `auth.ts` | 환경변수만 채우면 됨 |
| SSO / SAML | `auth.ts` Credentials | 엔터프라이즈용 사용자 정의 provider 추가 필요 |
| Notion API | `screens/notion.tsx` UI | 백엔드 endpoint `/api/v1/notion/sync` 구현 필요 |
| Calendar (Google/Outlook) | `screens/calendar.tsx` UI | OAuth 토큰 + 백엔드 sync |
| GitHub | 활동 피드에 인용됨 | webhook 수신 후 활동 DB 적재 |
| LLM (회의록 추출) | `screens/ai-auto.tsx` | `/api/v1/ai/extract-actions` 스텁 동작 — 실 LLM은 SSE 스트리밍 권장 |

## 다음 단계

1. **백엔드 OpenAPI 스펙** 확정 + `lib/types.ts` 양방향 매칭 ✅ (`openapi.yaml` + Zod)
2. **WebSocket / SSE** — 실시간 알림 · 채팅 · 활동 피드 ✅ (`lib/realtime.ts` + `/api/v1/sse`)
3. **react-pdf** — 주간/월간 보고 PDF 다운로드 ✅ (`lib/pdf-reports.tsx`)
4. **Storybook** — 프리미티브 문서화 ✅ (`*.stories.tsx`, Storybook 10)
5. **In-app stub 백엔드** ✅ (`src/app/api/v1/**` — 11개 라우트, USE_MOCK=false 검증 완료)
6. **`eslint.config.mjs`** — Flat config + next/core-web-vitals + next/typescript (사용자 수동 작업, config-protection 정책)
7. **WebSocket 모드** — `/api/v1/sse` 외 ws 브로커 통합 (Redis pub/sub 또는 별도 Node 서버)
8. **next-auth DB adapter** — 현재 JWT-only, Prisma/Drizzle adapter 도입 시 세션 영속화
9. **i18n** (`next-intl`) — 다국어 베이스라인

### 사용 예

```ts
// 실시간 이벤트 구독
useRealtimeEvents('notification', n => toast(n.title));
useRealtimeEvents('chat', m => addMessage(m));

// PDF 다운로드 (다이내믹 임포트로 SSR 회피)
import dynamic from 'next/dynamic';
const PDF = dynamic(() => import('@/lib/pdf-reports').then(m => m.ReportDownloadButton), { ssr: false });
<PDF report={data} fileName="weekly.pdf">PDF 다운로드</PDF>

// Storybook 컴포넌트 문서
pnpm storybook    // → Foundation/Tokens, Primitives/Button, ...
```

## 라이선스

내부 사용 전용. © Omelet, 2026.
