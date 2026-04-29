# PDCA Phase 1 — Plan (PRD)

> **Feature**: all-flow-infra (Docker Compose 기반 인프라 환경)
> **Author**: av-pm-coordinator
> **Date**: 2026-04-28
> **Owner**: ALL-Flow Platform Team

## 1. 배경 (Why)

`project/all-flow-frontend` (Next.js 16 + React 19) 와 `project/all-flow-backend` (Fastify 5 + Prisma 6 + Postgres 16 + Redis 7) 는 각자 컨테이너화 가이드만 존재할 뿐, **두 서비스를 함께 띄우고 운영할 통합 인프라 정의가 없다**. 다음 문제를 해결한다.

1. **로컬 개발 환경 불일치** — 개발자마다 Postgres/Redis 버전·포트·시드 데이터가 달라 재현 불가능한 버그 발생.
2. **CI/CD 부재** — Docker 이미지 빌드 → 통합 테스트 → 스테이징 배포 파이프라인이 없음.
3. **운영 분리 미흡** — dev/staging/prod 환경 변수, 시크릿, 네트워크 정책이 코드와 섞여 있음.
4. **팀 온보딩 비용** — 새 멤버가 환경 구축에 반나절 이상 소요.

## 2. 목표 (What)

| # | 목표 | 측정 가능 지표 |
|---|------|---------------|
| G1 | 한 줄 명령으로 Frontend + Backend + DB + Redis 풀스택을 띄운다 | `docker compose up -d` → 60초 내 모든 서비스 healthy |
| G2 | 개발/운영 환경을 명확히 분리한다 | `docker-compose.yml` (base) + `docker-compose.dev.yml` (override) + `docker-compose.prod.yml` |
| G3 | Postgres + Redis 데이터를 영구화한다 | named volumes, 컨테이너 재시작 후 데이터 보존 |
| G4 | 서비스 간 격리된 사설 네트워크를 구성한다 | bridge network `allflow-net`, 외부에는 frontend/backend만 노출 |
| G5 | Healthcheck + 의존성 순서를 보장한다 | `depends_on.condition: service_healthy` |
| G6 | `.env` 기반 시크릿 관리, 시크릿 절대 커밋 금지 | `.env.example` 제공 + `.gitignore` 강화 |
| G7 | PDCA 문서 (Plan/Design/Do/Check/Report) 모두 산출 | `docs/pdca/01~05` 5개 파일 |

## 3. 비목표 (Out of Scope)

- 쿠버네티스 매니페스트 (별도 PDCA에서 다룸)
- 클라우드 인프라(Terraform/AWS) — Docker Compose 한정
- Frontend/Backend 코드 수정 (인프라만)
- CI 워크플로우 작성 — Docker 이미지 빌드까지만 담당
- 모니터링 스택(Prometheus/Grafana) — `docker-compose.observability.yml` 옵션으로 분리

## 4. 핵심 요구사항 (Functional)

### F1. 서비스 구성
| 서비스 | 이미지/소스 | 포트 (호스트) | 역할 |
|--------|------------|--------------|------|
| `frontend` | `../all-flow-frontend/Dockerfile` | 3000 | Next.js 16 SSR |
| `backend` | `../all-flow-backend/Dockerfile` | 8080 | Fastify 5 API |
| `postgres` | `postgres:16-alpine` | 5432 (dev only) | Primary DB |
| `redis` | `redis:7-alpine` | 6379 (dev only) | Cache, Pub/Sub, BullMQ |

### F2. 환경 분리

| 파일 | 용도 |
|------|------|
| `docker-compose.yml` | 공통 기반 (서비스 정의 + 네트워크 + 볼륨) |
| `docker-compose.dev.yml` | 개발 override — 소스 코드 마운트, hot reload, DB 포트 노출 |
| `docker-compose.prod.yml` | 운영 override — 멀티스테이지 빌드 결과 사용, 포트 미노출, restart: always |
| `.env.example` | 모든 환경 변수 키 + 예시 값 |
| `.env.dev` / `.env.prod` | 실제 값 (gitignore) |

### F3. 네트워크
- `allflow-net` (bridge) — 모든 서비스 내부 통신
- DB/Redis는 외부에 노출하지 않음 (운영). 개발 시에만 5432/6379 포트 매핑

### F4. 볼륨
- `pg-data` — Postgres 데이터
- `redis-data` — Redis AOF 영구화
- 개발 모드에서는 소스 디렉토리도 bind mount

### F5. Healthcheck + 의존성
- Postgres: `pg_isready` 5초 간격
- Redis: `redis-cli ping` 5초 간격
- Backend: `/health` 엔드포인트 호출
- Frontend → Backend healthy 후 시작
- Backend → Postgres + Redis healthy 후 시작

### F6. 운영 도구
- `Makefile` — `make dev`, `make prod`, `make logs`, `make psql`, `make seed`, `make down`
- 백업 스크립트 (`scripts/backup.sh`) — Postgres pg_dump 자동화

## 5. 비기능 요구사항 (Non-Functional)

- **재현성**: 동일 commit + .env 로 어디서나 동일 환경 부팅
- **보안**: 시크릿 평문 노출 금지, 운영 DB 포트 미노출, 사용자/비밀번호 환경변수
- **속도**: cold start 60초 이내, hot reload (frontend/backend 코드 변경 시 < 3초)
- **관측성**: 모든 서비스 stdout/stderr 로그 → `docker compose logs` 일괄 확인
- **이식성**: Linux/macOS/WSL2 동일 동작 (Docker Desktop 4.x+ / Docker Engine 25+)

## 6. 제약 (Constraints)

- Frontend/Backend 의 기존 `package.json`, `Dockerfile`(없으면 신규) 와 호환
- Frontend가 `openapi.yaml` 을 backend로부터 빌드 시 참조하지 않도록 분리 (런타임 의존만)
- Postgres 16 / Redis 7 / Node 20 LTS 고정

## 7. 위험 (Risks) & 완화

| 위험 | 영향 | 완화 |
|------|-----|-----|
| Backend Dockerfile 부재 | 빌드 실패 | infra 측에서 reference Dockerfile 제공 — 백엔드 팀이 후속으로 통합 |
| Next.js standalone 빌드 누락 | 이미지 비대화 | `next.config.ts` 의 `output: 'standalone'` 권고 (별도 PR) |
| WSL2 inotify 한계 | hot reload 누락 | dev compose에 polling 옵션 환경변수 노출 |
| 시크릿 유출 | 보안 사고 | `.gitignore` + pre-commit gate (Gate 1) 활용 |

## 8. 성공 기준 (Definition of Done)

- [ ] `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` → 4개 서비스 healthy
- [ ] `curl http://localhost:3000` → 200, `curl http://localhost:8080/health` → 200
- [ ] 컨테이너 재시작 후 Postgres 데이터 보존 확인
- [ ] `.env.example` 외 시크릿 파일 git tracked 0건
- [ ] PDCA 5개 문서 (`plan/design/do/check/report`) 작성 완료
- [ ] `Makefile` 모든 타겟 정상 작동
- [ ] bkit:gap-detector Match Rate ≥ 90%
