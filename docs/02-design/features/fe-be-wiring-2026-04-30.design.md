# Design — FE↔BE 실배선 정합 (2026-04-30)

> feature: `fe-be-wiring-2026-04-30`
> Plan: `docs/01-plan/features/fe-be-wiring-2026-04-30.plan.md`

## 1. 아키텍처 (변경 후)

```
브라우저 ────→ Next.js (3000)
                ├─ pages (SSR/CSR)
                ├─ /api/auth/[...nextauth]   ← next-auth handlers
                └─ /api/v1/[...path]         ← catch-all proxy (NEW)
                         │
                         │ Authorization: Bearer ${session.accessToken}
                         ↓
                    BE Fastify (8080)
                    ├─ /api/v1/health        ← exception (외부 헬스체크)
                    ├─ /api/v1/auth/login    ← Credentials authorize 호출
                    ├─ /api/v1/projects, tasks, issues, ... 21개
                    └─ /api/v1/realtime/ws   ← WS는 catch-all 우회, FE에서 직통
                         │
                         ↓
                    Postgres + Redis
```

WebSocket 예외: `wss://localhost:8080/api/v1/realtime/ws`는 Next.js api route가 WS를 핸들링 못 함 → FE는 `NEXT_PUBLIC_REALTIME_URL=ws://localhost:8080/api/v1/realtime`로 직통.

## 2. BE 변경 — `src/app.ts`

### 2.1 Before

```ts
await app.register(healthRoutes);
if (registerDb && registerRoutes) {
  await app.register(identityRoutes);
  await app.register(projectsRoutes);
  // ... 21 register, prefix 없음
}
```

### 2.2 After

```ts
// health는 prefix 없이 외부 헬스체크용 + /api/v1 prefix 동일 노출 (이중 등록).
await app.register(healthRoutes);
await app.register(healthRoutes, { prefix: '/api/v1' });

if (registerDb && registerRoutes) {
  await app.register(
    async (api) => {
      await api.register(identityRoutes);
      await api.register(projectsRoutes);
      await api.register(tasksRoutes);
      await api.register(issuesRoutes);
      await api.register(commentsRoutes);
      await api.register(notificationsRoutes);
      await api.register(realtimeRoutes);
      await api.register(realtimeWsRoutes);
      const aiRegistry = buildDefaultAIRegistry({ OPENAI_API_KEY: env.OPENAI_API_KEY });
      await api.register(aiRoutes, { registry: aiRegistry });
      await api.register(reportsRoutes, { registry: aiRegistry });
      await api.register(authRoutes);
      await api.register(approvalsRoutes);
      await api.register(clientsRoutes);
      await api.register(eventsRoutes);
      await api.register(resourcesRoutes);
      await api.register(docsRoutes);
      await api.register(channelsRoutes);
      await api.register(orgRoutes);
      await api.register(searchRoutes);
    },
    { prefix: '/api/v1' },
  );
  // ... realtime fanout 동일
}
```

이유: Fastify `register(plugin, { prefix })` 패턴이 1곳 — 모든 도메인 라우트가 한 번에 prefix 흡수. `WS` 라우트도 동일 prefix 적용 → `wss://.../api/v1/realtime/ws`.

### 2.3 단위 테스트 path 치환

```bash
# 일괄 sed (dry-run 후 적용)
find tests -name '*.test.ts' -print0 \
  | xargs -0 sed -i.bak \
      -e "s|inject({ method: '\(GET\|POST\|PUT\|PATCH\|DELETE\)', url: '/|inject({ method: '\1', url: '/api/v1/|g" \
      -e "s|app.inject({ url: '/|app.inject({ url: '/api/v1/|g"
# health 테스트는 별도 — `/api/v1/` 경로 추가 안 됨 (이미 `/health` 그대로 PASS, `/api/v1/health`도 PASS 검증 추가)
```

치환 후 회귀: vitest → 실패한 spot fix (≤ 5건 예상).

### 2.4 health 라우트 이중 등록 검증

- `GET /health` → 200 (인프라 healthcheck용, 변경 없음)
- `GET /api/v1/health` → 200 (FE catch-all 통과 가능)

`tests/health.test.ts`에 양쪽 path 추가.

## 3. FE 변경

### 3.1 catch-all proxy — `src/app/api/v1/[...path]/route.ts` (NEW)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:8080/api/v1';

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const session = await auth();
  const url = new URL(`${BACKEND_URL}/${path.join('/')}`);
  for (const [k, v] of req.nextUrl.searchParams) url.searchParams.set(k, v);

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  if (session && (session as { accessToken?: string }).accessToken) {
    headers.set('authorization', `Bearer ${(session as { accessToken: string }).accessToken}`);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    // @ts-expect-error duplex required for streaming bodies (multipart, SSE upstream).
    duplex: 'half',
  };

  const upstream = await fetch(url, init);
  const respHeaders = new Headers(upstream.headers);
  // Pass through content-type / Cache-Control / etc.
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
```

LOC: ~50줄 (게이트 통과). SSE는 `text/event-stream` 통과 — `upstream.body` 스트림 그대로 전달.

### 3.2 stub 16 디렉토리 처리

옵션:
- **A. archive (권고)**: `git mv src/app/api/v1/{projects,tasks,...} src/app/api/v1/_archived_mock_2026_04_30/` — 빌드에서 제외 (디렉토리명 `_` 접두사로 Next.js route 인식 안 됨)
- B. 분기: 각 stub에 `if (USE_MOCK)` 체크 → catch-all로 fallthrough — 16개 동일 패턴 추가 LOC

권고 A: catch-all 1개로 단일화. archive 후 BE 실배선 이슈 발견 시 git revert 가능.

### 3.3 `src/lib/api/http.ts` 변경

```ts
// Before
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';
// After
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
```

기본값 의미 반전: 미설정 시 mock OFF (실배선). storybook/test 환경에서 명시적으로 `true` 설정 필요.

### 3.4 `src/auth.ts` Credentials wiring

```ts
Credentials({
  name: '데모 로그인',
  credentials: {
    email: { label: '이메일', type: 'email' },
    password: { label: '비밀번호', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;
    const backend = process.env.BACKEND_URL ?? 'http://backend:8080/api/v1';
    const res = await fetch(`${backend}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: String(credentials.email),
        password: String(credentials.password),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: { id: string; email: string; name?: string }; accessToken: string };
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name ?? data.user.email,
      accessToken: data.accessToken,
    } as never;
  },
}),
```

JWT callback 추가:
```ts
callbacks: {
  authorized({ auth, request }) { /* 기존 + /api/v1 통과 제거: 이제 catch-all이 BE 인증 강제 */ },
  async jwt({ token, user }) {
    if (user && (user as { accessToken?: string }).accessToken) {
      token.accessToken = (user as { accessToken: string }).accessToken;
    }
    return token;
  },
  async session({ session, token }) {
    (session as { accessToken?: string }).accessToken = token.accessToken as string;
    return session;
  },
},
```

`/api/v1` 통과 룰 제거 — catch-all이 BE 401 시 자연 차단되도록 위임. 단, login 페이지에서 호출하는 `/api/v1/auth/login` 자체는 미인증 허용 — BE에서 처리.

### 3.5 `next.config.ts` standalone

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  reactCompiler: true,
  typedRoutes: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};
```

Dockerfile prod stage가 `.next/standalone/` 복사 패턴인지 사용자가 확인 (이미 적용된 경우 변경 없음).

## 4. Infra 변경

### 4.1 `docker-compose.yml` (base)

이미 `${NEXT_PUBLIC_USE_MOCK:-false}` 기본값 false. 변경 없음.

### 4.2 `docker-compose.dev.yml`

이미 `NEXT_PUBLIC_USE_MOCK: ${NEXT_PUBLIC_USE_MOCK:-false}`. 변경 없음.

### 4.3 `docker-compose.prod.yml`

frontend 서비스에 누락된 env 추가:
```yaml
frontend:
  environment:
    NODE_ENV: production
    BACKEND_URL: ${BACKEND_URL:-http://backend:8080/api/v1}
    NEXTAUTH_SECRET: ${AUTH_SECRET:?AUTH_SECRET must be set}
    NEXTAUTH_URL: ${NEXTAUTH_URL:?NEXTAUTH_URL must be set}
    NEXT_PUBLIC_USE_MOCK: "false"  # prod 강제 off
```

### 4.4 Makefile 변경 없음

`make up ENV=dev` / `make up ENV=prod`는 이미 정합 — wait-for-healthy.sh는 두 환경 모두 동일 4-서비스 healthcheck.

## 5. QA 매트릭스 (`docs/03-test/feature-test-matrix-2026-04-30.md` 갱신 시 컬럼)

| # | 라우트 | 페이지 | BE 엔드포인트 | 직전(04-29) | 본 사이클(04-30) | 비고 |
|---|--------|--------|--------------|-------------|------------------|------|
| 1 | `/projects` | 프로젝트 목록 | GET /api/v1/projects | mock PASS | real PASS | catch-all 검증 |
| 2 | `/tasks` | 태스크 보드 | GET /api/v1/tasks | mock PASS | real PASS | — |
| ... | (24행) | ... | ... | ... | ... | ... |

비교 컬럼 = 직전 매트릭스 vs 본 사이클 → drift 식별.

## 6. 게이트별 측정 도구

| 게이트 | 도구 | 위치 |
|--------|------|------|
| BE prefix 정합 | `curl http://backend:8080/api/v1/health` 200 + `curl /health` 200 | shell |
| FE catch-all | `curl http://frontend:3000/api/v1/projects` 401 (인증 미주입) → 200 (Bearer 주입) | shell |
| 인증 wiring | playwright spec: login → API call | tests/e2e |
| BE 회귀 | vitest 188+ | `pnpm test` |
| FE 회귀 | vitest 98 + lint + typecheck | `pnpm test/lint/typecheck` |
| Match rate | bkit:gap-detector | Agent 호출 |
| Browser test | av-base-browser-tester 24 라우트 | Agent 호출 |

## 7. 롤백 전략

각 변경은 git commit 단위 분리 — 회귀 시 단일 commit revert로 복원.

| commit | 트랙 | 영향 |
|--------|-----|------|
| `feat(backend): /api/v1 prefix 일괄 + 단위 테스트 정합` | BE | BE 단독 회귀 시 revert |
| `feat(frontend): catch-all proxy + auth wiring` | FE | FE 단독 회귀 시 revert |
| `chore(infra): prod compose env 보강` | Infra | env-only |
| `chore(frontend): mock stub archive` | FE | mock 복원 시 git mv 역방향 |

## 8. 사용자 승인 대기

본 Design 작성 완료 후 manifest 변경 진입 시 `av-base-stack-approval` 훅 차단.
사용자 승인 입력 키워드: "approve fe-be-wiring" 또는 동등.

승인 시 PL이 5명 팀 병렬 스폰 → BE-W*, FE-W*, INF-W* 동시 실행.
