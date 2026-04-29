# Plan — FE↔BE 실배선 정합 (2026-04-30)

> feature: `fe-be-wiring-2026-04-30`
> PRD: `docs/00-pm/fe-be-wiring-2026-04-30.prd.md`

## 1. WBS

| ID | 트랙 | 작업 | 산출물 | 의존 | 추정 |
|----|------|-----|-------|------|------|
| BE-W1 | Backend | `src/app.ts` register에 `/api/v1` prefix 일괄 (21 라우트) | app.ts diff | — | 0.5 |
| BE-W2 | Backend | 단위 테스트 inject path 치환 (`/projects` → `/api/v1/projects`) — 21 모듈 | tests/**/*.test.ts | BE-W1 | 1.0 |
| BE-W3 | Backend | 통합 테스트 path 치환 + Prisma seed 정합 회귀 확인 | tests/integration/* | BE-W1 | 0.5 |
| BE-W4 | Backend | health 라우트는 prefix 제외 (인프라 헬스체크 유지) — 별도 register 분리 | app.ts | BE-W1 | 0.2 |
| BE-W5 | Backend | `POST /auth/login` 정합 — next-auth Credentials가 호출할 엔드포인트 confirm/추가 | auth.routes.ts | BE-W1 | 0.5 |
| FE-W1 | Frontend | `src/app/api/v1/[...path]/route.ts` catch-all proxy 구현 (GET/POST/PUT/PATCH/DELETE) | route.ts | — | 1.0 |
| FE-W2 | Frontend | catch-all에서 인증 헤더 자동 변환 (next-auth session token → Bearer) | helper file | FE-W1 | 0.5 |
| FE-W3 | Frontend | catch-all에서 SSE 스트림 통과 (text/event-stream) | route.ts | FE-W1 | 0.3 |
| FE-W4 | Frontend | 기존 stub 16 디렉토리 archive (또는 `USE_MOCK=true` 분기로 보존) | filesystem move | FE-W1 | 0.3 |
| FE-W5 | Frontend | `src/lib/api/http.ts` USE_MOCK 기본값 변경 (`!== 'false'` → `=== 'true'`) | http.ts | — | 0.1 |
| FE-W6 | Frontend | `src/auth.ts` Credentials.authorize → BE `/api/v1/auth/login` 호출 + JWT colocation | auth.ts | BE-W5 | 0.7 |
| FE-W7 | Frontend | `next.config.ts` `output: 'standalone'` 추가 + Dockerfile prod stage 검증 | next.config.ts | — | 0.2 |
| INF-W1 | Infra | `docker-compose.yml` `NEXT_PUBLIC_USE_MOCK=false` 명시 (이미 `${...:-false}`라 불필요 시 skip) | compose.yml | — | 0.1 |
| INF-W2 | Infra | `.env.prod` template 추가 (사용자가 시크릿 채우기) | `.env.example` 갱신만 (실제 env는 사용자) | — | 0.2 |
| INF-W3 | Infra | `Makefile`에서 `make up ENV=prod` healthcheck 동일 워크플로우 검증 | docs/04-report 안내 | INF-W2 | 0.2 |
| QA-W1 | QA | `av-base-browser-tester`로 24 라우트 mock=off 시나리오 실행 | test-matrix.md | FE-W*, BE-W* | 1.5 |
| QA-W2 | QA | 인증 플로우 E2E (login → API 호출 → token revoke) | playwright spec | QA-W1 | 0.5 |
| QA-W3 | QA | bkit:gap-detector 측정 (BE + FE) | match_rate report | QA-W1 | 0.3 |
| MEM-W1 | Memory | 학습 누적 (catch-all proxy / prefix 일괄 / auth wiring 패턴) | L4 memory | 모든 W* 완료 후 | 0.2 |

총 추정: ~9.0 dev-day (하루 5인 병렬 시 ~2일)

## 2. 의존 그래프

```
BE-W1 ─┬─→ BE-W2 ─→ BE-W3 ─┐
       └─→ BE-W4           │
       └─→ BE-W5 ──────────┤
                           │
FE-W1 ─┬─→ FE-W2 ──────────┤
       └─→ FE-W3           │
       └─→ FE-W4           │
                           │
FE-W5 ─────────────────────┤
FE-W6 (BE-W5 의존) ────────┤
FE-W7 ─────────────────────┤
                           ↓
INF-W1, INF-W2, INF-W3 ──→ QA-W1 ─→ QA-W2 ─→ QA-W3 ─→ MEM-W1
```

병렬 가능 묶음:
- 묶음1 (BE 트랙): BE-W1 → {BE-W2, BE-W3, BE-W4, BE-W5} 병렬
- 묶음2 (FE 트랙): FE-W1 → {FE-W2, FE-W3, FE-W4} 병렬, FE-W5/FE-W7 독립 동시, FE-W6은 BE-W5 후
- 묶음3 (Infra): INF-* 단순 docs/compose 수정
- 묶음4 (QA): 모든 W* 후 일괄

## 3. 리스크 & 완화

| ID | 리스크 | 영향 | 완화 |
|----|-------|------|------|
| R1 | BE 단위 테스트 188개 일괄 path 치환 시 회귀 | 높음 | sed 치환 후 vitest 1회 → 실패 spot fix, 회귀는 ≤ 5건 목표 |
| R2 | catch-all proxy가 SSE/WebSocket을 끊는다 | 높음 | SSE: `Transfer-Encoding: chunked` 통과 확인. WS: `/api/v1/realtime/ws`는 별도 핸들러 — Next.js api route는 WS 미지원 → BE 직통 유지 (`NEXT_PUBLIC_REALTIME_URL`) |
| R3 | next-auth Credentials 호출이 BE 401 시 사용자 로그인 막힘 | 중간 | demo BE seed user로 `e2e@allflow.local / e2e-password` 보장, BE auth 모듈은 이미 BE-N* 사이클에서 검증 |
| R4 | mock stub archive 후 USE_MOCK=true 환경에서 회귀 | 낮음 | USE_MOCK=true는 storybook/test 환경 한정 — vitest mock는 별도 fixtures 사용 |
| R5 | `output: 'standalone'` 추가 후 dev hot-reload 영향 | 낮음 | dev stage는 `pnpm dev`로 standalone 미사용, prod stage만 영향 |
| R6 | `av-base-stack-approval` 훅 차단으로 Do 단계 진입 차단 | 확실 | 본 사이클은 Plan/Design 산출 후 사용자 승인 대기 (의도된 게이트) |

## 4. 마일스톤

| M | 게이트 | 기준 |
|---|--------|------|
| M0 | PRD 승인 | 사용자 OK |
| M1 | Design 승인 | PL 검토 + 옵션 A/C 하이브리드 확정 |
| M2 | **사용자 승인 대기** (본 사이클 종착점) | manifest 변경 직전 — `av-base-stack-approval` 차단 지점 |
| M3 | (M2 통과 후) Do 완료 | BE 188+α/FE 98+α PASS, lint 0, typecheck 0 |
| M4 | Check 통과 | gap-detector match_rate ≥ 0.90 (BE + FE) + browser-tester 24 라우트 PASS |
| M5 | Report + 학습 보존 | report.md + L4 memory + tracking 갱신 |

## 5. 게이트 매트릭스

| Gate | 기준 | 도구 |
|------|-----|------|
| 코드 표준 | 500 LOC/file, 50 LOC/fn, 4 params, console.log 0 | bkit:code-analyzer |
| BE 회귀 | 188/188 unit + 38/38 int PASS | vitest |
| FE 회귀 | 98/98 vitest + lint 0 + typecheck 0 | pnpm test/lint/typecheck |
| Match rate | BE ≥ 0.95, FE ≥ 0.90 | bkit:gap-detector |
| Browser test | 24/24 라우트 + 메뉴 BE 실호출 | av-base-browser-tester |
| 인증 흐름 | login → API → revoke 1 cycle PASS | playwright spec |
| 시크릿 0건 | scan PASS | av-oss-secret-scan |

## 6. 비목표 재확인

- 신규 BE 도메인/기능 추가 ✗
- 신규 FE 페이지 추가 ✗
- 운영 배포(릴리즈/태깅) ✗
- bkit MCP/AI 어댑터 회로 변경 ✗
- DB 스키마 변경 ✗
