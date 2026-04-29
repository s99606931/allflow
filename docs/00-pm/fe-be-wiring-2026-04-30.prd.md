# PRD — FE↔BE 실배선 정합 (2026-04-30)

> feature: `fe-be-wiring-2026-04-30`
> 사이클: 직전 `be-fe-mapping-fix-2026-04-29` follow-up — gate PASS여도 USE_MOCK이 production-ready 여부를 마스킹한다는 학습(`learning_fe_be_mapping_audit_2026_04_29`)을 실배선으로 종결.

## 1. 사용자 요구사항 (원문)

> FE↔BE 실배선 정합 PDCA — dev/prod 도커컴포즈 패리티 + prefix 정합 + USE_MOCK off 실배선 + 전 메뉴 브라우저 테스트.

## 2. 직전 진단으로 확정된 끊김

| # | 증상 | 위치 | 상태 |
|---|------|------|------|
| D1 | 현재 dev가 mock 모드 fixture 응답 — BE 실호출 0건 | `src/lib/api/http.ts:10` `USE_MOCK = ... !== 'false'` (기본 mock ON) | 마스킹됨 |
| D2 | FE→BE prefix mismatch | FE: `BACKEND_URL=http://backend:8080/api/v1` / BE: `app.register(projectsRoutes)` (prefix 없음, `src/app.ts:81-100`) | 끊김 |
| D3 | BE root 호출 시 401(라우트 살아있음) — `/api/v1/*` 호출 시 404 | `src/modules/*/`*.routes.ts | 미정합 |
| D4 | FE Next.js stub 16개가 `/api/v1/*`로 fixture 응답 | `src/app/api/v1/{16 dirs}/route.ts` | 실배선 차단 |
| D5 | next-auth Credentials.authorize가 BE 호출 없이 하드코딩 사용자 반환 | `src/auth.ts:35-50` | 인증 비실배선 |
| D6 | next.config.ts에 `output: 'standalone'` 미설정 → prod 이미지 비최적 | `next.config.ts` | 운영 미정합 |
| D7 | `NEXT_PUBLIC_USE_MOCK` dev override 기본값이 false 이지만 stub 디렉토리 우선순위 잔존 | `docker-compose.dev.yml:51` | 무력화 |

직전 cycle archive: `docs/archive/2026-04/be-fe-mapping-fix-2026-04-29/be-fe-mapping-fix-2026-04-29.report.md`.

## 3. 목표

| # | 항목 | 수락 기준 |
|---|------|----------|
| G1 | FE↔BE prefix 정합 | `/api/v1/*` 호출이 200/201/204/4xx 정상 응답 (404 0건) |
| G2 | USE_MOCK off 실배선 | dev/prod 모두 NEXT_PUBLIC_USE_MOCK=false 기본 + Next.js stub과 충돌 없음 |
| G3 | dev = prod 패리티 | `make up ENV=dev`, `make up ENV=prod` 동일 워크플로우, 4 서비스 healthy |
| G4 | 인증 실배선 | next-auth Credentials → BE `/auth/login` 호출 → JWT 발급 → 후속 API 401 해소 |
| G5 | 전 메뉴 브라우저 테스트 | 24 라우트 × 페이지별 메뉴 BE 실호출 검증 (mock=off) |
| G6 | PDCA 산출물 | PRD/Plan/Design/Report + test-matrix 갱신 |

## 4. 비목표

- 신규 BE 도메인/기능 추가 (오직 prefix·인증·proxy 정합)
- 신규 FE 페이지 추가 (기존 24 라우트 검증만)
- 운영 배포(릴리즈/태깅) — 별도 사이클
- bkit MCP/AI 어댑터 회로 변경
- DB 스키마 변경 (Prisma migration 0건 목표)

## 5. 제약

- 코드 품질 게이트(`av-base-code-quality-gates`): 500 LOC/file, 50 LOC/fn, 4 params, console.log/TODO 금지
- `.env*` 파일 수정·읽기 금지(사용자만)
- 기존 BE 단위 테스트(188/188) + FE vitest(98/98) 회귀 0건
- `av-base-stack-approval` 훅: manifest(docker-compose, Dockerfile, package.json, src/) 변경 전 사용자 승인 필수
- DCO Signed-off-by 필수 (`-s`)

## 6. 옵션 비교 (prefix 정합)

| 옵션 | 변경 범위 | 장점 | 단점 | ROI |
|------|----------|------|------|-----|
| **A. BE에 `/api/v1` prefix 일괄** | `src/app.ts` 21 register에 `{ prefix: '/api/v1' }` 추가 | 1줄 변경, FE 무변경 | BE 단위 테스트 188개 path 회귀 — 모듈 테스트 inject 패턴이 prefix 없는 path 사용 시 전부 실패 | 코드 1+테스트 50+ |
| **B. FE BACKEND_URL을 `http://backend:8080`으로 변경 (prefix 제거)** | `docker-compose*.yml` 1줄 + FE proxy 라우트가 `/api/v1` 제거하여 BE 호출 | FE proxy 1곳, BE 무변경 | mock stub 16개와 충돌 불변 — stub 우선 | 1+검증 |
| **C. FE Next.js catch-all proxy** | `src/app/api/v1/[...path]/route.ts` 신규, stub 16개 archive | 동일 origin(쿠키 단순), USE_MOCK 토글 의존 제거, prefix 흡수, SSR/CSR 일관 | catch-all이 SSE·multipart도 포워드해야 함(스트림 처리) | 중간 |

**권고: 옵션 A + 옵션 C 하이브리드**
- A: BE prefix 일괄 적용 — 단위 테스트 회귀는 `inject({ url: '/projects' })` → `inject({ url: '/api/v1/projects' })` 일괄 치환(sed)로 1pass 처리
- C: FE catch-all proxy로 동일 origin 호출 — 인증 헤더 쿠키→Bearer 자동 변환

이유: A 단독은 "외부 클라이언트가 BE 직통 시 prefix 제거 못 함" 문제. C 단독은 stub 16개와 충돌. 하이브리드는 두 문제 모두 해결.

PL이 Plan 단계에서 단위 테스트 path 치환 LOC를 측정하여 최종 결정.

## 7. 해결 범위 (트랙별)

| 트랙 | 산출물 | 위험 |
|------|-------|------|
| Backend Lead | `src/app.ts` register에 `/api/v1` prefix 일괄, 단위 테스트 path 치환 (3-shot sed + spot fix) | 188/188 회귀 |
| Frontend Lead | `src/app/api/v1/[...path]/route.ts` catch-all proxy + stub 16개 archive(또는 USE_MOCK 분기) | SSE/multipart proxy 정확성 |
| Frontend Lead | `src/auth.ts` Credentials.authorize → BE `/auth/login` 호출 + JWT 세션 colocation | 토큰 만료/refresh 흐름 |
| Frontend Lead | `next.config.ts` `output: 'standalone'` + prod 이미지 검증 | 빌드 stage 변경 |
| Infra | `docker-compose.yml` + `dev.yml` + `prod.yml`에서 `NEXT_PUBLIC_USE_MOCK=false` 일관 + dev/prod 동일 헬스체크 | env loading 순서 |
| QA / Browser Tester | `av-base-browser-tester`로 24 라우트 BE 실호출 검증 + `docs/03-test/feature-test-matrix-2026-04-30.md` 갱신 | 인증 흐름 회귀 |
| Memory Keeper | 학습 키: catch-all proxy 패턴 / BE prefix 일괄 / next-auth↔BE wiring / 24 라우트 매트릭스 | — |

팀 인원: Lead(av-do-orchestrator) + Backend(av-base-backend-architect) + Frontend(av-base-frontend-architect) + QA(av-base-qa-reviewer) + Memory(av-base-memory-keeper) = 5명.

## 8. 산출물

- 코드 변경 (BE: `src/app.ts` + tests / FE: catch-all + auth.ts + next.config / Infra: compose)
- 문서: PRD(본문) / Plan / Design / Report
- 테스트 매트릭스: `docs/03-test/feature-test-matrix-2026-04-30.md` — 직전 매트릭스(2026-04-29)와 비교 컬럼 포함
- 학습 메모(L4): `~/.claude/projects/-data-allflow/memory/learning_fe_be_wiring_2026_04_30.md`

## 9. PM 승인 대기 상태

PRD 초안. 사용자 확정 시 Plan 단계 진입.

다음 게이트(매니페스트 변경 직전): `av-base-stack-approval` 훅이 차단 → PRD/Plan/Design 산출 후 사용자 승인 대기 (직전 `tech-stack-modernization` 사이클 패턴 재사용).
