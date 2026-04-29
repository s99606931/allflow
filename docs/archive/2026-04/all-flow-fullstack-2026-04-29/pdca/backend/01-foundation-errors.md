# T-104 — 공통 에러 핸들러 + 통일 ErrorResponse 포맷

> Phase: 1 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: ZodError/AuthError/NotFound → 4xx, 그 외 → 500 + traceId
> Dependencies: [T-102]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: 모든 4xx/5xx 응답을 단일 `ErrorResponse { error: { code, message, details?, traceId } }` 포맷으로 직렬화한다. 클라이언트 / 운영 도구가 traceId 하나로 로그까지 추적할 수 있어야 한다.
- 범위:
  - `src/shared/errors.ts` — `AppError` 베이스 + 5종 (`AuthError`/`ForbiddenError`/`NotFoundError`/`ConflictError`/`ValidationError`)
  - `src/plugins/error-handler.ts` — Fastify `setErrorHandler` + `setNotFoundHandler` + ZodError 매핑
  - `src/app.ts` — sensible 다음, route 직전에 등록
  - `src/plugins/error-handler.test.ts` — 6 케이스
- 결정/가정:
  - **traceId = req.id**: Fastify가 `x-request-id` 헤더 또는 자동 생성한 ID를 `req.id`에 채운다 (T-002에서 이미 활성화). 별도 미들웨어 불필요.
  - **5xx는 logger.error**, 4xx는 `logger.warn` — 운영 알람을 5xx에 한정.
  - **5xx 응답 본문은 `내부 서버 오류`만 노출** — 스택/내부 정보 누출 방지. 디버깅은 traceId로 로그 매칭.
  - **AppError는 details 필드를 옵션** — ValidationError가 zod issues를 details로 실어준다.
  - **Fastify err.statusCode는 4xx만 신뢰** — 5xx 또는 누락이면 500으로 강제.
- 리스크:
  - `instanceof ZodError` 가 zod 4 환경에서 ESM/CJS dual-package hazard로 동작 안 할 가능성 → 우리 프로젝트는 ESM-only 이고 zod도 한 인스턴스만 사용해 안전.
  - `setNotFoundHandler` 가 sensible 의 `app.notFound` 와 충돌 가능 → sensible 등록 후 우리 핸들러가 덮어쓰는 순서로 안전.

## Do

> 구현 변경 사항.

- 추가 파일:
  - `src/shared/errors.ts` — 6 클래스 (AppError + 5 도메인 에러)
  - `src/plugins/error-handler.ts` — fastify-plugin 래핑된 글로벌 핸들러
  - `src/plugins/error-handler.test.ts` — 6 케이스 (ZodError/AuthError/NotFoundError/ValidationError+details/Unhandled→500/Unknown route→404)
  - `docs/pdca/01-foundation-errors.md` (본 문서)
- 수정 파일:
  - `src/app.ts` — `errorHandlerPlugin` 등록 (sensible 다음)
- 추가 의존성: 없음 (zod / fastify-plugin 기존 사용)
- 핵심 코드 스냅샷:

```typescript
// src/shared/errors.ts (요약)
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
}
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super({ code: 'NOT_FOUND', message: id ? `${resource} not found: ${id}` : ..., statusCode: 404 });
  }
}

// src/plugins/error-handler.ts (요약)
app.setErrorHandler((err, req, reply) => {
  const traceId = req.id;
  if (err instanceof ZodError) reply.code(400).send(fromZod(err, traceId));
  else if (err instanceof AppError) reply.code(err.statusCode).send(buildResponse({...}));
  else { /* 5xx 매핑 + log.error */ }
});
```

## Check

> 검증 결과.

- 단위 테스트: `pnpm test` → **22/22 PASS** (env 8 + schemas 8 + error-handler 6)
  - ZodError → 400 VALIDATION_FAILED + 이슈 리스트
  - AuthError → 401 AUTH_REQUIRED
  - NotFoundError → 404 NOT_FOUND
  - ValidationError → 400 + details 보존
  - Unhandled Error → 500 INTERNAL + traceId
  - Unknown route → 404 NOT_FOUND with method+url
- 통합 테스트: T-503에서 라우트 단계 검증
- OpenAPI 컨트랙트 검증: 해당 없음 (운영 메타 응답)
- 수동 검증: `pnpm typecheck` 그린, `pnpm lint` (biome) 그린
- 메트릭/로그 확인: 5xx 발생 시 `logger.error({ err, traceId })` — 응답 traceId와 동일 ID로 로그 매칭 가능

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - **에러 = 데이터** : 도메인은 `throw new NotFoundError('Project', id)` 만 하고 직렬화 책임은 1곳(plugin)에 집중. 컨트롤러 코드의 try/catch가 사라진다.
  - **traceId = req.id 재사용** : 별도 미들웨어 없이 Fastify 내장 ID를 그대로 응답에 노출 + 로그에 자동 포함.
  - **5xx 본문 정보 최소화** : 사용자에게는 일반 메시지, 운영자에게는 traceId 매칭.
- 메모리에 저장: `백엔드 도메인은 내장 Error 대신 AppError 계열만 throw 한다. 새 에러는 errors.ts 에 등록 후 사용`. 4xx 정책은 동일 codebase 전반에 일관 유지.
- 후속 태스크에 영향:
  - **T-103 (auth)**: 미들웨어가 토큰 검증 실패 시 `throw new AuthError()` 만 하면 401 자동 매핑.
  - **T-105 (RBAC)**: 권한 부족 시 `ForbiddenError` 단일 사용.
  - **T-202~ (도메인 라우트)**: not found / conflict / validation 패스를 throw로 일원화.
  - **T-502 (OTel)**: traceId를 OTel span attribute로 흘려보내면 분산 추적 통합.
- 회고: 처음에는 ProblemDetails (RFC 7807) 도입을 고려했으나 frontend가 `error.code` / `error.message` 단순 구조를 이미 가정하므로 단순 포맷 유지. 향후 외부 API 노출 단계에서 RFC 7807 변환 어댑터 추가 검토.
