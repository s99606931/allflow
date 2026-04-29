# T-001 — package.json + tsconfig + biome + tsup 스캐폴드 (pnpm)

> Phase: 0 | Owner: Backend-A | Status: done | Created: 2026-04-28 | Completed: 2026-04-28
> Acceptance: pnpm install + pnpm typecheck 그린
> Dependencies: []

## Plan

- **목표**: 백엔드 프로젝트의 도구체인 베이스라인을 확정한다 (Node 20 + TS 5 + pnpm).
- **범위**:
  - `package.json` (pnpm + scripts: dev/build/typecheck/lint/test/test:int/test:e2e/openapi:check/seed)
  - `tsconfig.json` (strict, NodeNext, target ES2022, isolatedModules, verbatimModuleSyntax)
  - `biome.json` (formatter+linter, scripts/는 제외 — CLI 도구 다른 규칙)
  - `tsup.config.ts` (esm only — `"type": "module"`, target node20, dts on)
  - `.npmrc` (engine-strict, auto-install-peers)
  - `src/server.ts` 자리표시자 (T-002에서 Fastify 부트로 대체)
- **결정**:
  - Frontend가 pnpm/biome 사용 → 백엔드도 통일.
  - tsup esm-only (cjs 미사용 — Node 20에서 esm 충분).
  - `scripts/update-task-status.mjs` 는 CLI 도구이므로 biome 검사 제외 (console.log 정당).
  - `verbatimModuleSyntax: true` — 타입 import/value import 명확히 구분 강제.
- **가정**: Node 20 LTS 고정 (현재 환경은 24, but engines `>=20`으로 충분).
- **리스크**:
  - 추후 Fastify 5/Prisma 6 추가 시 esm 호환성 → tsup external 목록에 미리 등록.
  - biome `noConsoleLog: warn` — 프로덕션 코드 진입 시 강화 고려.

## Do

- 추가 파일:
  - `/data/allflow/project/all-flow-backend/package.json`
  - `/data/allflow/project/all-flow-backend/tsconfig.json`
  - `/data/allflow/project/all-flow-backend/biome.json`
  - `/data/allflow/project/all-flow-backend/tsup.config.ts`
  - `/data/allflow/project/all-flow-backend/.npmrc`
  - `/data/allflow/project/all-flow-backend/src/server.ts` (자리표시자)
- 수정 파일: 없음
- 추가 의존성 (devDependencies, 모두 dev 범주):
  - `typescript ^5.7.2` (실제 설치: 5.9.3)
  - `@types/node ^22.10.0` (실제 설치: 22.19.17)
  - `tsx ^4.19.2` (실제 설치: 4.21.0)
  - `tsup ^8.3.5` (실제 설치: 8.5.1)
  - `@biomejs/biome 1.9.4`
  - `vitest ^2.1.8` (실제 설치: 2.1.9)
- 핵심 코드 스냅샷:
  - `package.json` scripts: dev/build/start/typecheck/lint/lint:fix/format/test/test:int/test:e2e/openapi:check/prisma:*/seed
  - `tsconfig.json` strict + NodeNext + paths `@/*`
  - `tsup.config.ts` external: prisma, fastify, pino, ioredis, socket.io, bullmq, zod

## Check

- [x] `pnpm install` 그린 — 88 패키지, 3초 소요
- [x] `pnpm typecheck` 그린 — 에러 0
- [x] `pnpm lint` 그린 — 5 files checked, 0 errors
- [ ] `pnpm test` (테스트 코드 미작성, T-002 이후 검증)
- [ ] OpenAPI 컨트랙트 검증 (T-102/T-601에서 수행)

수동 검증:
- `node --version` v24.13.0 (engines `>=20` 만족)
- `pnpm --version` 10.33.0 (engines `>=9` 만족)
- biome 빌드 스크립트 차단 경고 발생 — `pnpm approve-builds` 보류 (T-002에서 결정)

## Act

- 학습한 패턴:
  - **scripts/는 biome lint에서 제외** — CLI 도구는 console 출력이 정상이므로 lint 규칙이 다름.
  - **esm-only tsup** + `"type": "module"` + Node 20 → cjs interop 부담 없음.
  - **tsup external 사전 등록** — Fastify/Prisma 등 무거운 라이브러리는 번들에서 제외해야 빌드/콜드스타트 성능 유지.
  - `verbatimModuleSyntax: true` 채택 → 후속 모듈에서 `import type` 강제됨.
- 메모리에 저장:
  - 후속 백엔드 프로젝트(예: `all-flow-infra` 서비스) 동일 베이스 재사용 가능.
  - frontend(`all-flow-frontend`)와 biome/pnpm 정렬 — 설정 차이 발생 시 동기화 필요.
- 후속 태스크 영향:
  - **T-002 (Fastify 부트)**: `src/server.ts` 자리표시자 → 실제 Fastify 인스턴스로 교체. `dependencies`에 `fastify`, `@fastify/sensible`, `pino`, `pino-pretty` 추가.
  - **T-005 (CI)**: 위 4 스크립트(typecheck/lint/test/build)를 그대로 GitHub Actions matrix로 매핑.
- 회고:
  - 첫 사이클에서 scaffold가 38 task 의존 그래프의 루트 — 도구체인 결정은 후속 35개 태스크의 비용을 좌우.
  - biome `scripts/` 제외 결정은 코드 품질 룰(데드코드 금지)과 충돌하지 않는다 — CLI 도구는 별도 컨텍스트.
