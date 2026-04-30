---
name: FE↔BE 실배선 정합 종결 학습
description: 도커컴포즈 dev=prod 패리티 + /api/v1 prefix 정합 + USE_MOCK off 실배선 + next-auth↔BE login wiring + 56/62 PASS, match_rate 0.98 (G1~G6 6/6).
type: project
---

PDCA 사이클 `fe-be-wiring-2026-04-30` 종결. match_rate 0.98 PASS (G1~G6 6/6).

**Why:** USE_MOCK 기본 ON 마스킹 해소 + docker dev=prod 패리티 확립 + FE catch-all proxy로 단일 origin 완성.
**How to apply:** 아래 10 패턴을 FE↔BE 실배선 작업 체크리스트로 활용.

## 학습 패턴

### 1. Fastify single-wrapper prefix 패턴
- 21개 도메인 라우트를 `app.register(async (api) => { ... }, { prefix: '/api/v1' })` 단일 wrapper로 일괄 흡수.
- **Why:** 라우트별 prefix 옵션 21번 vs 1곳 중앙 관리 — DRY + onboarding 친화.
- **How to apply:** Fastify 라우트 리팩토링 시 prefix가 일관되면 단일 wrapper 우선. 예외(health 같은 외부 healthcheck용)만 별도 register.

### 2. health 이중 등록 — 외부 healthcheck + FE catch-all 동시 만족
- `app.register(healthRoutes)` + `app.register(healthRoutes, { prefix: '/api/v1' })` 두 번.
- **Why:** docker healthcheck는 historically `/health` 사용, FE catch-all은 prefix 통과 → 둘 다 200 필요.
- **How to apply:** prefix 일괄 적용 시 ingress 진입점만 prefix 없는 path로 이중 노출.

### 3. BE 단위 테스트 path 일괄 치환의 두 단계 정규식
- 정적 url: `url:\s*'(\/[^']+)'` → `'/api/v1$1'`
- 백틱 템플릿: `url:\s*\`(\/[^\`]+)\`` → `` `/api/v1$1` ``
- **Why:** 첫 정규식만으론 `url: \`/projects/${id}\`` 패턴 미커버 → 9건 잔존 회귀.
- **How to apply:** prefix 일괄 변경 시 정규식 두 패턴 + `/health`/`/api/v1` 시작 path는 제외 가드.

### 4. Next.js catch-all proxy 패턴 (~50 LOC)
- `src/app/api/v1/[...path]/route.ts`: 5 메서드 + OPTIONS, NextResponse 스트림 통과, duplex: 'half' (multipart/SSE), 쿠키 세션 → Bearer 자동 변환.
- **Why:** USE_MOCK 토글 의존 제거, 동일 origin CORS 단순화, prefix 흡수.
- **How to apply:** BFF 패턴이 필요한 모든 Next.js 프로젝트. SSE 통과는 `upstream.body` 스트림 그대로 전달 (변환 없음).

### 5. mock stub archive 옵션 A — `_` 접두사 디렉토리
- `mv src/app/api/v1/{...} src/app/api/v1/_archived_mock_2026_04_30/`
- **Why:** Next.js는 `_` 접두사 디렉토리를 route로 인식 안 함 → 빌드에서 자연 제외, git history 보존.
- **How to apply:** Next.js stub 폐기 시 삭제 대신 `_archived_*/` 이동 — 회귀 시 git mv 역방향.
- 부수: `tsconfig.json` exclude + `.next/types/validator.ts` 캐시 무효화 (`mv .next .next.old.$$ && mkdir .next` 회전) 필요.

### 6. USE_MOCK 기본값 반전 — 위험 마스킹 해소
- Before: `!== 'false'` (mock 기본 ON) — production-ready 여부 마스킹.
- After: `=== 'true'` (mock 기본 OFF) — 명시적 opt-in.
- vitest는 `env: { NEXT_PUBLIC_USE_MOCK: 'true' }`로 fixture 모드 강제.
- **How to apply:** 신호 강도가 약한 default는 의도와 반대 방향이면 즉시 반전. 단위 테스트엔 명시적 env 필요.

### 7. next-auth v5 BE 토큰 위임 패턴
- Credentials.authorize → BE `/auth/login` POST → JWT 받아서 `user.accessToken`으로 반환.
- jwt callback: `if (user?.accessToken) token.accessToken = ...`
- session callback: `session.accessToken = token.accessToken`
- catch-all proxy가 session.accessToken을 Bearer 헤더에 자동 주입.
- **Why:** next-auth는 자체 JWT를 쿠키로 관리, BE는 별도 JWT 필요 → 두 토큰을 세션에 동시 저장.
- **How to apply:** next-auth + 별도 BE JWT 시스템 통합 시 표준 패턴.

### 8. e2e globalSetup credentials 호환
- `if (!email || !password) return null` 너무 엄격 → e2e가 password 미입력으로 호출 시 차단 (53건 일괄 회귀).
- Fix: `if (!email) return null` + body는 password 있을 때만 포함 → BE schema(password 옵셔널)와 정합.
- **Why:** 검증 책임은 BE에 일관 위임 (catch-all + BE 401 위임 정신과 동일).
- **How to apply:** FE는 form 제약(필수 필드)만, 비즈니스 검증은 BE.

### 9. dev-only BE login 엔드포인트 패턴
- User 모델에 password 컬럼 없으면 → email-only login + JWT 발급, NODE_ENV !== 'production' 한정.
- **Why:** dev/staging에서 OAuth 없이도 로컬 로그인 가능, 운영에선 OIDC 강제.
- **How to apply:** 프로덕션은 OAuth, dev는 email shortcut — 동일 라우트에 NODE_ENV 가드.

### 10. docker-compose stage 이름 정합 검증
- prod compose `target: prod` 인데 BE Dockerfile 스테이지명 `runtime` → 빌드 실패. 사일런트 drift.
- Fix: prod compose `target: runtime` (BE Dockerfile 정합) — FE는 `prod` 스테이지 보유.
- **How to apply:** dev=prod 패리티 검증 시 `make check ENV=prod` 필수 + 실 빌드 dry-run으로 stage 이름 검증.

## 결과 지표

| 지표 | 값 |
|------|----|
| match_rate | 0.98 |
| Design G1~G6 | 6/6 PASS |
| BE unit | 295/295 |
| FE typecheck/lint | 0 errors |
| FE vitest | 71/71 |
| Playwright e2e | 56/62 (90.3%) |
| 잔존 6건 | carry-over 3 + mode-mismatch 3 (spec 측, 인프라 무관) |
| 신규 회귀 | 0건 |
