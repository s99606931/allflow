# Plan — 단일 포트 localhost 최적화 (2026-04-30)

> feature: `single-port-localhost-2026-04-30` | 작성: av-do-orchestrator | 2026-04-30
> PRD: `docs/00-pm/single-port-localhost-2026-04-30.prd.md` 참조

## 1. 결정된 옵션

**옵션 A — FE 포트 매핑만 변경 (제로 신규 서비스)**

근거: FE catch-all proxy(`src/app/api/v1/[...path]/route.ts`)가 직전 사이클에서 이미 동일 origin(`/api/v1/*`) → BE(`http://backend:8080/api/v1`)로 위임 구조를 완성. 포트 매핑 1줄 변경으로 사용자 진입점이 `http://localhost`로 통합된다. 신규 reverse proxy 컨테이너는 dev 단순성 해침 + FE catch-all 무력화.

폴백: 포트 80 충돌 시 `FRONTEND_PORT` env override로 즉시 다른 포트로 전환 가능 (`.env.dev`/`.env.prod`).

## 2. 구현 단계 (S1~S5)

| 단계 | 작업 | 산출 | 검증 |
|------|------|------|------|
| S1 | 사전 점검 | `lsof -i :80` 충돌 검사 가이드, WSL2 mirrored networking 확인 | 없음 시 진행, 있으면 폴백 안내 |
| S2 | compose.dev.yml 변경 | `frontend.ports` 기본값 80, `NEXTAUTH_URL` 기본값 `http://localhost` | `make check ENV=dev` PASS |
| S3 | compose.prod.yml 변경 | 동일 (패리티 유지) | `make check ENV=prod` PASS |
| S4 | 사용자 `.env.dev`/`.env.prod` 권장 갱신 안내 | PRD §8 변경 항목에 명시 (사용자 수동) | `make up ENV=dev` 후 4 healthy |
| S5 | smoke + Playwright 회귀 | E2E_BASE_URL=http://localhost로 56/62 재실행 | PASS 동등 |

## 3. Do 단계 트랙 분배 (병렬)

| 트랙 | 에이전트 | 작업 |
|------|---------|------|
| Lead | av-do-orchestrator | S1~S5 조율, gap-detector |
| Infra | av-base-infra-architect (또는 Lead 직접) | S2/S3 compose 변경 |
| QA | av-base-qa-reviewer | S5 Playwright + smoke |
| Memory | av-base-memory-keeper | 학습 누적 (백그라운드) |

Backend/Frontend 트랙: **미스폰** (코드 변경 0건)

## 4. 코드 변경 상세 (3 LOC)

### 4.1 docker-compose.dev.yml
```diff
   frontend:
     environment:
-      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3000}
+      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost}
       BACKEND_URL: ${BACKEND_URL:-http://backend:8080/api/v1}
     ports:
-      - "${FRONTEND_PORT:-3000}:3000"
+      - "${FRONTEND_PORT:-80}:3000"
```

### 4.2 docker-compose.prod.yml
```diff
   frontend:
     ports:
-      - "${FRONTEND_PORT:-3000}:3000"
+      - "${FRONTEND_PORT:-80}:3000"
```

### 4.3 사용자 `.env.dev` 권장 (사용자 수동)
```bash
FRONTEND_PORT=80          # 충돌 시 8000 등으로 변경
NEXTAUTH_URL=http://localhost
```

### 4.4 사용자 `.env.prod` 권장 (사용자 수동)
```bash
FRONTEND_PORT=80
NEXTAUTH_URL=http://localhost
```

## 5. 검증 매트릭스

| 검증 | 명령 | 기대 |
|------|------|------|
| 컴포즈 schema (dev) | `make check ENV=dev` | `[check] dev compose ok` |
| 컴포즈 schema (prod) | `make check ENV=prod` | `[check] prod compose ok` |
| 4 서비스 healthy | `make up ENV=dev` 후 `make ps` | postgres/redis/backend/frontend 모두 healthy |
| FE 진입 | `curl -I http://localhost/` | `HTTP/1.1 200` |
| API 헬스 (catch-all 경유) | `curl http://localhost/api/v1/health` | `{"status":"ok"}` |
| API 인증 가드 | `curl -I http://localhost/api/v1/projects` | `HTTP/1.1 401` |
| BE 직접 (디버깅) | `curl http://localhost:8080/api/v1/health` | `{"status":"ok"}` |
| next-auth 쿠키 도메인 | DevTools → Application → Cookies | domain=localhost (포트 없음) |
| Playwright | `E2E_BASE_URL=http://localhost pnpm test:e2e` | 56/62 PASS 이상 |
| BE unit | `pnpm --filter backend test` | 188/188 |
| FE unit | `pnpm --filter frontend test` | 98/98 |

## 6. 위험 + 대응

| 위험 | 트리거 | 대응 |
|------|--------|------|
| 포트 80 점유 | macOS 시스템 서비스, Apache, IIS | `FRONTEND_PORT=8000` 폴백 |
| WSL2 mirrored networking 미설정 | Windows 호스트에서 접근 불가 | `.wslconfig`에 `networkingMode=mirrored` 가이드 |
| next-auth 세션 도메인 mismatch | 기존 :3000 세션과 충돌 | 브라우저 쿠키 초기화 안내 |
| Playwright webServer가 :3000 바인딩 시도 | E2E_BASE_URL 미설정 시 자동 기동 | E2E_BASE_URL 명시 → webServer 비활성 |
| Prod TLS 부재 | 운영 시 평문 80 노출 | 비목표. traefik+TLS 별도 사이클 |

## 7. 회귀 가드

- BE 단위 테스트: 188/188 (변경 0건)
- FE 단위 테스트: 98/98 (변경 0건)
- Playwright E2E: 56/62 (BASE_URL만 변경)
- 컴포즈 config: `make check` 양쪽 ENV PASS
- next-auth 흐름: 로그인 → 세션 발급 → API 401 해소

## 8. 산출물 체크리스트

- [x] PRD (PM)
- [x] Plan (PL, 본 문서)
- [ ] Design (PL, 다음)
- [ ] 매니페스트 변경 (사용자 승인 후)
- [ ] Smoke + Playwright 재실행
- [ ] gap-detector 측정
- [ ] match_rate < 0.90 시 pdca-iterator 자동 트리거
- [ ] PM 승인 → Report
- [ ] memory-keeper 학습 누적

## 9. 사용자 승인 게이트

`av-base-stack-approval` 훅이 `docker-compose.{dev,prod}.yml` 변경 직전 차단. 사용자 승인 후 Do 진입.

승인 시점에 사용자에게 확인할 사항:
1. 포트 80 점유 여부 (`lsof -i :80`)
2. `.env.dev`/`.env.prod`의 `FRONTEND_PORT`, `NEXTAUTH_URL` 갱신 의향
3. 폴백 포트(80 충돌 시) 선호값
