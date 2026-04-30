# PRD — 단일 포트 localhost 최적화 (2026-04-30)

> feature: `single-port-localhost-2026-04-30`
> 사이클: 직전 `fe-be-wiring-2026-04-30` follow-up — FE catch-all proxy(`src/app/api/v1/[...path]/route.ts`)가 이미 BE에 위임하므로, 사용자 진입점을 단일 호스트(`http://localhost`)로 정합한다.
> 작성: av-pm-coordinator (av-pm-team STEP 1) | 2026-04-30

## 1. 사용자 요구사항 (원문)

> 로컬 docker-compose 환경에서 `http://localhost` (포트 80) 단일 주소로 BE + FE 모두 서비스 가능하도록 최적화. 사용자는 `localhost:3000`/`localhost:8080` 같은 포트 번호 없이 `http://localhost`만으로 모든 기능 사용 가능해야 함.

## 2. 직전 사이클 컨텍스트

직전 `fe-be-wiring-2026-04-30` 완료 상태:

| 자산 | 상태 |
|------|------|
| BE Fastify 8080 | `/api/v1/*` prefix 정합 완료, `/health` + `/api/v1/health` 이중 노출 |
| FE Next.js 3000 | `src/app/api/v1/[...path]/route.ts` catch-all proxy 보유 (쿠키→Bearer 자동 변환, SSE duplex) |
| FE catch-all 라우팅 | `BACKEND_URL=http://backend:8080/api/v1`로 BE 호출 (컨테이너 내부) |
| 인증 | next-auth Credentials → BE `/api/v1/auth/login` → JWT → `session.accessToken` |
| 모의 모드 | `NEXT_PUBLIC_USE_MOCK` 기본값 OFF (실배선 모드) |
| 헬스 | 4 서비스 healthy |
| E2E | Playwright 56/62 PASS (90.3%) |

핵심 인사이트: FE catch-all이 이미 동일 origin에서 `/api/v1/*` → BE로 위임한다. 따라서 **FE 포트만 80으로 매핑**하면 사용자는 `http://localhost`로 FE 페이지·API 모두 접근 가능하다.

## 3. 끊김 진단 (현재 마찰)

| # | 증상 | 위치 | 상태 |
|---|------|------|------|
| F1 | 사용자가 `http://localhost:3000` 입력 필요 (포트 기억 부담) | `docker-compose.dev.yml:58` `${FRONTEND_PORT:-3000}:3000` | 마찰 |
| F2 | NEXTAUTH_URL이 `:3000` 포함 → URL이 길고 비표준 | `docker-compose.dev.yml:49` | 마찰 |
| F3 | dev/prod 동일 패리티이지만 둘 다 :3000으로 바인딩 → "운영처럼 80에 노출" 시뮬레이션 부재 | `prod.yml:56` | 패리티 미흡 |

## 4. 옵션 비교

| 옵션 | 변경 범위 | 장점 | 단점 | ROI |
|------|----------|------|------|-----|
| **A. FE 포트 매핑만 변경** | `compose.dev/prod.yml` `frontend.ports`: `"80:3000"` + `NEXTAUTH_URL=http://localhost` | 신규 서비스 0건, FE catch-all 그대로 활용, 1줄 변경, dev=prod 패리티 유지 | 포트 80은 일부 OS에서 권한 필요 (Linux/WSL2는 docker daemon이 처리, macOS 가능, Windows는 시스템 서비스 충돌 가능) | 1+검증 |
| **B. Reverse Proxy 신규 서비스 (nginx/caddy/traefik)** | 신규 서비스 1개 (이미지/healthcheck) + `compose.yml` +20 LOC | 정적 캐싱·SSL·라우팅 분리 가능, production-like | 신규 서비스 추가로 dev 단순성 해침, FE catch-all 부분적으로 무용지물 (이중 proxy), 빌드 시간 증가 | 중간 |
| **C. 양립 (proxy 컨테이너만 prod, dev는 옵션 A)** | dev=A, prod=B | dev 단순 + prod production-like | dev/prod 패리티 깨짐 (직전 사이클 G3 위반) | 낮음 |

**권고: 옵션 A** — FE catch-all 구조가 이미 완성되어 있어 신규 서비스가 dev 단순성을 해친다. 운영 환경의 ingress(traefik/nginx)는 별도 사이클에서 다룰 가능성 높음.

**리스크 완화**: 포트 80 충돌 시 `.env.dev`/`.env.prod`의 `FRONTEND_PORT` 변수 override로 즉시 폴백 가능 (e.g. `FRONTEND_PORT=8000`).

## 5. 목표

| # | 항목 | 수락 기준 |
|---|------|----------|
| G1 | 단일 호스트 진입 | `http://localhost/` → FE 200, `http://localhost/api/v1/health` → 200, `http://localhost/api/v1/projects` → 401(미인증) 또는 200(인증 후) |
| G2 | next-auth 정합 | `NEXTAUTH_URL=http://localhost`로 갱신, 세션 쿠키 도메인 정합 (포트 변경 영향 0건) |
| G3 | dev = prod 패리티 | 두 yml 모두 동일 포트(80) 매핑, 동일 헬스체크 |
| G4 | E2E 회귀 0건 | `E2E_BASE_URL=http://localhost`로 Playwright 56/62 재실행, PASS 비율 동등 |
| G5 | BE 직접 노출 유지 | `localhost:8080/api/v1/health` 200 (디버깅·migrate·healthcheck용) |
| G6 | 폴백 가능성 | `FRONTEND_PORT` 환경변수 override로 80 → 다른 포트 즉시 변경 가능 |
| G7 | PDCA 산출물 | PRD/Plan/Design + Report (Do 완료 시) + memory-keeper 학습 |

## 6. 비목표

- nginx/caddy/traefik reverse proxy 도입 (별도 사이클)
- TLS/HTTPS (별도 사이클)
- BE 포트 변경 (8080 직접 노출 유지)
- FE catch-all proxy 코드 변경 (재사용)
- 신규 BE 도메인/기능 추가
- DB 스키마 변경

## 7. 제약

- 코드 품질 게이트(`av-base-code-quality-gates`): 500 LOC/file, 50 LOC/fn, 4 params, console.log/TODO 금지
- `.env*` 파일 수정·읽기 금지(사용자만) → PRD/Plan에 권장 변경값만 명시, 실제 수정은 사용자가 수행
- 직전 BE 188/188 + FE 98/98 회귀 0건
- Playwright 56/62 PASS 동등 유지
- `av-base-stack-approval` 훅: `docker-compose.{dev,prod}.yml` 변경 전 사용자 승인 필수
- DCO Signed-off-by 필수 (`-s`)

## 8. 변경 항목 (옵션 A 채택 시)

| 파일 | 변경 | LOC |
|------|------|-----|
| `project/all-flow-infra/docker-compose.dev.yml` | `frontend.ports`: `"${FRONTEND_PORT:-3000}:3000"` → `"${FRONTEND_PORT:-80}:3000"` | 1 |
| `project/all-flow-infra/docker-compose.dev.yml` | `NEXTAUTH_URL` 기본값 `http://localhost:3000` → `http://localhost` | 1 |
| `project/all-flow-infra/docker-compose.prod.yml` | `frontend.ports`: `"${FRONTEND_PORT:-3000}:3000"` → `"${FRONTEND_PORT:-80}:3000"` | 1 |
| `project/all-flow-infra/.env.dev` (사용자 수정) | `FRONTEND_PORT=80`, `NEXTAUTH_URL=http://localhost` | 2 (사용자) |
| `project/all-flow-infra/.env.prod` (사용자 수정) | 동일 | 2 (사용자) |
| `project/all-flow-frontend/playwright.config.ts` | (선택) `baseURL` default를 `http://localhost`로 변경하지 **않음** — `E2E_BASE_URL` 명시 호출만 사용 | 0 |
| `docs/03-test/feature-test-matrix-2026-04-30.md` | 단일 호스트 검증 컬럼 추가 | +12 |

총 코드 변경: **3 LOC** (compose 2 파일) + 매니페스트만. FE/BE 소스 무변경.

## 9. 위험 + 완화

| 위험 | 영향 | 완화 |
|------|------|------|
| 포트 80 점유(`lsof -i :80`) | up 실패 | up 전 사전 점검 안내 + `FRONTEND_PORT` 폴백 |
| WSL2 listen 0.0.0.0 vs 127.0.0.1 | 호스트 OS에서 접근 불가 | docker compose의 ports는 0.0.0.0 기본 — WSL2 mirrored networking 가정 |
| next-auth 쿠키 도메인 변경 | 기존 세션 무효 | 신규 사이클이라 영향 미미, NEXTAUTH_URL 일치 확인 |
| Playwright `baseURL` default `:3000` | 기존 webServer 자동 기동 시 :3000 바인딩 시도 | E2E_BASE_URL 명시(컨테이너 모드) — webServer 비활성 |
| Prod에서 80 직접 노출(TLS 부재) | 운영 시 보안 우려 | 비목표. 별도 사이클에서 traefik+TLS |

## 10. 트랙별 산출물

| 트랙 | 산출물 | 위험 |
|------|-------|------|
| PL | Plan/Design 작성, gap-detector·iterator 운영 | 패리티 검증 |
| Infra | `compose.dev.yml`/`compose.prod.yml` 3 LOC 변경 | 포트 80 권한 |
| QA | Playwright `E2E_BASE_URL=http://localhost` 회귀 + smoke (`/`, `/api/v1/health`, 인증 흐름) | 쿠키 도메인 회귀 |
| Memory Keeper | 학습 키: 단일 호스트 catch-all 패턴 / 포트 매핑 폴백 / dev=prod 패리티 룰 | — |

팀 인원: PL(av-do-orchestrator) + Infra(av-base-infra-architect 또는 PL 자체) + QA(av-base-qa-reviewer) + Memory(av-base-memory-keeper) = 3~4명. **Backend/Frontend는 코드 변경 0건이므로 미스폰**.

## 11. PM 승인 대기 상태

PRD 초안. 사용자 확정 시 Plan/Design 진입 → `av-base-stack-approval` 훅 차단(매니페스트 변경 직전) → 사용자 최종 승인 → Do 진입.

다음 산출물:
- `docs/01-plan/features/single-port-localhost-2026-04-30.plan.md`
- `docs/02-design/features/single-port-localhost-2026-04-30.design.md`
