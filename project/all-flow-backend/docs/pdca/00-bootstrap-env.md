# T-003 — 환경설정 (zod env) + .env.example

> Phase: 0 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: 필수 env 누락 시 부트 실패
> Dependencies: [T-002]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: `process.env`를 zod 스키마로 검증해 **타입 안전한 Env 객체**를 노출하고, 잘못된 값이면 부트 즉시 실패시킨다.
- 범위:
  - `src/config/env.ts` (loader + 캐시 + 한국어 에러)
  - `.env.example` (개발자용 템플릿)
  - `src/app.ts` / `src/server.ts` 가 zod 검증된 Env 사용하도록 마이그레이션
  - 단위 테스트 (`src/config/env.test.ts`)
- 결정/가정:
  - **zod v4 사용** (`pnpm add zod` 결과 4.3.6) — `z.coerce.number()` + `z.enum()`로 검증.
  - 부트 단계 변수만 우선 정의(NODE_ENV/HOST/PORT/LOG_LEVEL). DATABASE_URL/REDIS_URL/AUTH_SECRET 등은 T-101/T-103/T-401에서 스키마 확장.
  - 모듈 어디서든 같은 인스턴스를 쓰도록 `getEnv()` 캐시. 테스트는 `resetEnvForTests()`로 캐시 초기화.
  - 에러 시 `process.exit(1)` + 한국어 메시지 (서버 부트 실패 구분 명확).
- 리스크:
  - 환경변수 가짓수 증가 시 스키마가 분기 폭발 위험 → 도메인별 sub-schema로 분리 필요해질 수 있다(추후).

## Do

> 구현 변경 사항.

- 추가 파일:
  - `src/config/env.ts` — zod 스키마 + `loadEnv()` / `getEnv()` / `resetEnvForTests()` / `EnvValidationError`
  - `src/config/env.test.ts` — 6 케이스 (기본값, coerce, NODE_ENV/PORT/LOG_LEVEL invalid, 캐시 동일성)
  - `.env.example` — 부트 변수 + 후속 단계 placeholder 주석
  - `docs/pdca/00-bootstrap-env.md` (본 문서)
- 수정 파일:
  - `src/app.ts` — `BuildAppOptions.env` 추가, `defaultLogger(env)`로 시그니처 변경, NODE_ENV/LOG_LEVEL을 zod env에서 읽음
  - `src/server.ts` — `loadEnv()`로 검증 후 `app.listen({ port: env.PORT, host: env.HOST })`. parsePort 등 수동 처리 제거.
- 추가 의존성: `zod ^4.3.6` (production)
- 핵심 코드 스냅샷:

```ts
// src/config/env.ts (요약)
const envSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).optional(),
});
```

## Check

> 검증 결과.

- 단위 테스트: `pnpm test` → **6/6 PASS** (env.test.ts)
  - 기본값 / `PORT` 문자열 coerce / NODE_ENV invalid / PORT 범위 / LOG_LEVEL invalid / 캐시 동일성
- 통합 테스트: 추후 T-503 testcontainers에서 추가
- OpenAPI 컨트랙트 검증: 해당 없음 (env 단계)
- 수동 검증:
  - `PORT=invalid pnpm tsx src/server.ts` → stderr `[env] 환경변수 검증 실패\n  - PORT: Invalid input: expected number, received NaN` 후 종료. **부트 실패 정상 동작 확인**.
  - `pnpm typecheck` 그린, `pnpm lint` (biome) 그린.
- 메트릭/로그 확인: 부트 시 logger가 NODE_ENV에 따라 `pino-pretty`(dev) ↔ JSON(prod) 분기 정상.

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - **검증을 경계 한 곳에 집중** — `loadEnv()` 1회 호출 후 캐시. 코드 본문에서는 검증 코드 없음.
  - **테스트 친화 설계** — `loadEnv(source)`가 env source를 인자로 받아 `process.env`를 mocking 없이 단위 테스트.
  - **에러 클래스 분리** — `EnvValidationError`로 부트 실패 분기를 server.ts에서 명시적으로 처리.
- 메모리에 저장: env loader = (zod schema + 캐시 + 커스텀 Error) 3-피스 패턴. T-101/T-103에서 동일 구조로 DATABASE_URL/AUTH_SECRET 추가.
- 후속 태스크에 영향:
  - T-004 (docker-compose) — DB/Redis URL이 env에 추가될 때 이 스키마에 합칠 것.
  - T-101 (Prisma) — `DATABASE_URL` 필수화 + URL 형식 검증.
  - T-103 (JWT) — `AUTH_SECRET` 최소 32자 검증.
- 회고: zod 4의 에러 메시지 포맷이 v3과 살짝 다르므로 `i.path.join('.') || '(root)'` 가드를 둠. 예제 `.env.example`은 시크릿 패턴 스캐너에 걸리지 않도록 `<placeholder>` 형식으로 작성.
