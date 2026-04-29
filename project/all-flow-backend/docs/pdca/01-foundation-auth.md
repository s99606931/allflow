# T-103 — JWT 인증 미들웨어 (next-auth v5 호환, AUTH_SECRET 공유)

> Phase: 1 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: Bearer 토큰 검증 → req.user 주입 + 401 처리
> Dependencies: [T-102]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: frontend(next-auth v5)가 발급한 JWT를 백엔드가 검증해 `req.user` 에 주입한다. AUTH_SECRET 단일 진실 원본을 공유함으로써 별도 OIDC/IdP 없이도 안전한 SSO 가능.
- 범위:
  - `src/plugins/auth.ts` — JWE/JWS 자동 분기 검증 + `app.authenticate` 데코레이터
  - `src/plugins/auth.test.ts` — 6 케이스
  - `src/config/env.ts` — `AUTH_SECRET` 32자 이상 검증 추가
- 결정/가정:
  - **next-auth v5 기본 토큰**은 JWE (5 segment) — `dir / A256GCM` + HKDF(SHA-256, salt=`authjs.session-token`)로 키 유도.
  - **JWS도 동시 지원** — 외부 서비스가 단순 HS256 토큰을 발급할 수도 있으므로 segment 수(5 vs 3)로 자동 분기.
  - **HKDF는 Node 내장 `node:crypto.hkdf`** 사용 — `jose` 의 비공개 deep import 회피.
  - **req.user 타입 확장**: `declare module 'fastify' { interface FastifyRequest { user?: AuthUser } }`.
  - **`app.authenticate` 데코레이터** — preHandler 로 라우트별 적용 가능. 글로벌 강제 등록은 하지 않음 (e.g. `/health` 는 인증 불요).
  - **에러 = AuthError 단일 클래스** — T-104 글로벌 핸들러가 401 매핑.
- 리스크:
  - `AUTH_SECRET` 형식이 frontend와 일치해야 함 — 현재 단계에서는 32자 이상만 강제하고 형식(hex/base64) 자유. Frontend가 base64 하면 여기서도 base64 raw bytes 비교 필요할 수 있음 → 통합 테스트 단계에서 실 검증.
  - `AUTH_SALT` 는 next-auth 가 cookie 이름 규칙으로 결정 — 프로덕션 cookie name이 다르면 환경변수로 오버라이드.

## Do

> 구현 변경 사항.

- 추가 파일:
  - `src/plugins/auth.ts` — JWE/JWS 자동 분기 검증, `req.user` 주입, AuthError 매핑
  - `src/plugins/auth.test.ts` — 6 케이스 (header 누락/Bearer 형식/잘못된 토큰/JWS 정상/JWE 정상/sub 누락)
  - `docs/pdca/01-foundation-auth.md` (본 문서)
- 수정 파일:
  - `src/config/env.ts` — `AUTH_SECRET: z.string().min(32, ...).optional()` 추가
- 추가 의존성: `@fastify/jwt@^9.1.0` (placeholder, 실제는 jose 직접 사용), `jose@^5.10.0`
- 핵심 코드 스냅샷:

```typescript
// src/plugins/auth.ts (요약)
async function deriveKey(secret: string, salt: string): Promise<Uint8Array> {
  const info = `Auth.js Generated Encryption Key (${salt})`;
  const buf = await hkdfAsync('sha256', secret, salt, info, 32);
  return new Uint8Array(buf);
}

export async function verifyToken(token, opts) {
  if (token.split('.').length === 5) {
    const key = await deriveKey(opts.secret, opts.salt);
    const { payload } = await jwtDecrypt(token, key);
    return toAuthUser(payload);
  }
  const { payload } = await jwtVerify(token, new TextEncoder().encode(opts.secret));
  return toAuthUser(payload);
}

app.decorate('authenticate', async (req) => {
  const token = extractToken(req);
  req.user = await verifyToken(token, { secret, salt });
});
```

## Check

> 검증 결과.

- 단위 테스트: `pnpm test` → **28/28 PASS** (env 8 + schemas 8 + error-handler 6 + auth 6)
  - Authorization 누락 → 401
  - Bearer 형식 위반 → 401
  - 잘못된 토큰 → 401
  - JWS HS256 → 200, req.user 주입(id/name/email)
  - **JWE dir/A256GCM (next-auth v5 기본)** → 200, req.user.id 주입
  - sub 누락 → 401
- 통합 테스트: T-503 testcontainers에서 실 next-auth 발급 토큰으로 추가 검증
- OpenAPI 컨트랙트 검증: openapi.yaml의 `bearerAuth` 보안 스킴과 일치
- 수동 검증: `pnpm typecheck` 그린, `pnpm lint` 그린
- 메트릭/로그 확인: 인증 실패는 4xx → `logger.warn` (T-104 정책에 따름)

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - **JWE/JWS 자동 분기**: segment 수(5 vs 3)만 보면 되고, 클라이언트에 알고리즘 협상 없이도 호환 가능.
  - **next-auth HKDF salt 규칙**: `Auth.js Generated Encryption Key (<salt>)` info 문자열 + cookie name 기반 salt → 백엔드가 이를 그대로 재현해 키 공유.
  - **fastify decorator + module declaration** 패턴이 `req.user` 타입 안전성을 확보하는 가장 깔끔한 방법.
- 메모리에 저장: `next-auth v5 토큰을 백엔드에서 검증할 때는 dir/A256GCM + HKDF-SHA256(secret, salt, 'Auth.js Generated Encryption Key (<salt>)', 32)` 가 단일 진실 원본. salt 는 cookie 이름이며 환경변수 AUTH_SALT 로 오버라이드.
- 후속 태스크에 영향:
  - **T-105 RBAC**: `req.user.id` 로 ProjectMember 매트릭스 조회.
  - **T-201 /users/me**: `req.user.id` → Prisma 조회 → User 응답 직렬화.
  - **T-301 SSE / T-302 WS**: 쿼리스트링 토큰(`?token=`) 인증 분기 — `verifyToken` 함수 재사용.
  - **T-501 rate-limit**: per-user 키를 `req.user.id` 로 구성.
- 회고: `@fastify/jwt` 도 후보였지만 next-auth JWE 호환을 위해서는 결국 jose 직접 사용이 필요. 의존성 단순화를 위해 jose 만 유지하고 fastify-plugin 으로 데코레이터만 노출. `@fastify/jwt` 는 향후 자체 JWS 발급(예: 서비스간 토큰)이 필요할 때 활성화 검토.
