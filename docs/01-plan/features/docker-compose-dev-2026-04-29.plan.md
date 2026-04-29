# Plan — docker-compose dev hot-reload + Frontend E2E (2026-04-29)

## 마일스톤 / 작업 분해

### M1. Backend Dockerfile dev stage (T-D1)
- `project/all-flow-backend/Dockerfile` 에 `FROM deps AS dev` 추가
- ENV NODE_ENV=development, install with dev deps
- CMD: `pnpm dev` (= `tsx watch src/server.ts`)
- 컨테이너에 wget 설치 (healthcheck 용)
- 검증: `docker build --target dev -t allflow-backend:dev .` 빌드 성공

### M2. Frontend Dockerfile (T-D2) — 신규 파일
- `project/all-flow-frontend/Dockerfile` 신규
- Stages: base / deps / dev / build / prod
- Node 22 alpine + pnpm 10 (corepack)
- dev: `pnpm dev` (Next 16, hot-reload)
- prod: standalone output (Next 16 standalone)
- 검증: `docker build --target dev -t allflow-frontend:dev .` 빌드 성공

### M3. docker-compose.dev.yml 보강 (T-D3)
- backend command: 이미 `pnpm dev` ✓
- frontend command: `pnpm dev -- --hostname 0.0.0.0 --port 3000` 명시 (Next 16 binding)
- frontend env: NEXT_PUBLIC_USE_MOCK=false (실제 backend stub 호출), AUTH_SECRET, NEXTAUTH_URL=http://localhost:3000
- backend env: DATABASE_URL 추가 (Prisma)
- volumes: 기존 anonymous node_modules 패턴 유지

### M4. Frontend E2E (T-Q1)
- 외부 서버 모드: `E2E_BASE_URL=http://localhost:3000 pnpm e2e`
- global-setup: storageState 디렉토리 생성 보장 (이미 OK)
- 실행 절차 README 업데이트
- Playwright Chromium 브라우저 설치는 호스트에서 (`pnpm e2e:install`)

### M5. 문서 (T-Doc)
- README 단일 진입점: `make up && make logs`
- 트러블슈팅 섹션: bind-mount 권한, polling 옵션, wget 부재 시 healthcheck

### M6. PDCA Report + Memory (T-R1, T-R2)
- bkit:gap-detector 측정
- bkit:pdca report 산출
- memory-keeper 학습 누적

## 병렬 실행 매트릭스

| 트랙 | 담당 | 입력 | 출력 | 의존성 |
|------|------|------|------|--------|
| BE Lead | (M1) | 현 Dockerfile | dev stage 추가 | — |
| FE Lead | (M2) | 없음 | 새 Dockerfile | — |
| Infra | (M3) | dev compose | 보강된 dev compose | M1, M2 |
| QA | (M4) | E2E 스펙 6개 | PASS 결과 | M3 (서비스 가동) |
| Memory | (M6) | 작업 결과 | 학습 메모 | 백그라운드 |

M1·M2·M5 는 병렬, M3 는 M1+M2 완료 후, M4 는 M3 완료 후.

## 일정

| 단계 | 소요 |
|------|------|
| Plan/Design 작성 | 즉시 (현재) |
| M1 + M2 + M5 병렬 | 1 sweep |
| M3 검증 | 즉시 |
| M4 E2E 실행 | docker-build 의존성으로 호스트 검증 우선 |
| M6 Report | 최종 |

## 위험 / 완화

| 위험 | 완화 |
|------|------|
| WSL2 inotify 미동작 | CHOKIDAR_USEPOLLING / WATCHPACK_POLLING 이미 설정 |
| 컨테이너 빌드 시간(>5분) | 빌드캐시 mount 유지, frozen-lockfile |
| Playwright 의존성(브라우저) 컨테이너 부재 | 외부 dev 서버 모드로 호스트에서 실행 (이미 webServer skip 로직 있음) |
| pgvector init 누락 | `docker/postgres-init/01-init.sql` 가 이미 처리 (uuid/pgcrypto/pg_trgm) — pgvector 별도 확인 |
| OpenAPI 정합 회귀 | 본 사이클은 dev 환경만 변경, 코드 시그니처 변경 없음 → 영향 없음 |

## 승인

- PM 승인: PRD 확정 후
- PL 검증: gap-detector match_rate ≥ 0.90 + dev 가동 절차 README 동작
