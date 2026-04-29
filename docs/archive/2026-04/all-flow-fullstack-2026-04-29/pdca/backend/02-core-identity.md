# T-201 — identity 모듈: GET /users/me

> Phase: 2 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 인증된 사용자의 프로필을 frontend openapi.yaml `User` 스키마로 응답
> Dependencies: [T-103]

## Plan

- 목표: `GET /users/me` 가 JWT 검증된 사용자(`req.user.id`)에 대응하는 DB User 를 반환.
- 범위: src/modules/identity/identity.routes.ts + 단위 테스트(prisma mock).
- 결정/가정:
  - Auth 는 T-103 에서 만든 `app.authenticate` preHandler 로 위임.
  - 응답은 `UserSchema.parse(...)` 로 통과시켜 frontend 컨트랙트와 1:1 보장.
  - email 이 null/undefined 면 응답에서 필드 자체를 제거 (OpenAPI 의 optional 의미와 일치).
  - RBAC 는 적용하지 않음 — 본인 식별만 수행.
- 리스크:
  - Soft-delete 처리: `deletedAt: null` 필터 누락 시 삭제된 계정도 노출됨 → where 에 명시.
  - DB 부재(개발 단위 테스트) 대비: tests 에서 prisma mock 으로 격리.

## Do

- 추가 파일:
  - `src/modules/identity/identity.routes.ts`
  - `src/modules/identity/identity.test.ts`
- 수정 파일: `src/app.ts` (registerDb/registerRoutes 옵션 추가, identityRoutes 등록).
- 추가 의존성: 없음.
- 핵심 코드: 사용자 단건 조회 후 `UserSchema.parse({...email 조건부 spread})` 직렬화.

## Check

- 단위 테스트 (4): 인증 없음 401 / email 없는 응답 / email 포함 응답 / DB 없으면 404.
- typecheck/lint/build: 모두 그린 (`pnpm typecheck && pnpm lint && pnpm build`).
- OpenAPI 컨트랙트: zod `User.parse` 로 직렬화 → drift 없음.
- 메트릭/로그: Pino 기본 reqId 로깅 (별도 로그 없음).

## Act

- 학습한 패턴:
  - Prisma mock 을 `app.decorate('prisma', mock)` + `fp({ name: 'prisma' })` 스텁 플러그인으로 노출하면 `dependencies: ['prisma']` 를 가진 다른 플러그인을 그대로 등록할 수 있다.
  - Optional 필드는 응답에서 spread 조건부로 제거하는 것이 contract-clean.
- 메모리에 저장: identity 라우트는 단일 사용자 조회 + `req.user.id` 신뢰 패턴.
- 후속: T-301(SSE)이 `req.user` 식별을 동일 방식으로 사용.
