# PDCA Phase 2 — Design

> **Feature**: all-flow-infra
> **Author**: av-do-orchestrator (PL)
> **Date**: 2026-04-28
> **Reviewers**: av-pm-coordinator, av-base-memory-keeper

## 1. 아키텍처 개요

```
                     ┌────────────────────────────────────────┐
                     │         Host (dev/staging/prod)        │
                     │                                        │
   :3000  ───────────┼──▶  ┌──────────────┐                   │
                     │     │  frontend    │  Next.js 16       │
                     │     │  (Node 20)   │                   │
                     │     └──────┬───────┘                   │
                     │            │ http://backend:8080       │
   :8080  ───────────┼──▶  ┌──────▼───────┐                   │
                     │     │  backend     │  Fastify 5        │
                     │     │  (Node 20)   │  Prisma 6         │
                     │     └──┬─────────┬─┘                   │
                     │        │         │                     │
                     │     ┌──▼──┐   ┌──▼──┐                  │
                     │     │ pg  │   │redis│   internal only  │
                     │     └─────┘   └─────┘                  │
                     │       │         │                      │
                     │       ▼         ▼                      │
                     │   pg-data   redis-data  (named vols)   │
                     │                                        │
                     │   network: allflow-net (bridge)        │
                     └────────────────────────────────────────┘
```

## 2. 디렉토리 구조

```
project/all-flow-infra/
├─ docker-compose.yml              # 기반 서비스 정의 (env-agnostic)
├─ docker-compose.dev.yml          # dev override (bind mount + hot reload + DB 노출)
├─ docker-compose.prod.yml         # prod override (image build + 포트 미노출 + restart)
├─ .env.example                    # 모든 환경변수 + 기본값
├─ .env.dev                        # dev 환경 (gitignored)
├─ .env.prod                       # prod 환경 (gitignored, secret manager 권고)
├─ .gitignore                      # .env*, *.log, *.tar.gz
├─ Makefile                        # 운영 단축 명령
├─ README.md                       # Quick Start
├─ docker/
│  ├─ frontend.Dockerfile          # frontend가 Dockerfile 미보유 시 fallback
│  ├─ backend.Dockerfile           # backend Dockerfile 미보유 시 fallback
│  └─ postgres-init/               # 초기 SQL (DB 생성, extension 등)
│     └─ 01-init.sql
├─ scripts/
│  ├─ backup.sh                    # pg_dump → ./backups/{timestamp}.sql.gz
│  ├─ restore.sh                   # 복원
│  └─ wait-for-healthy.sh          # CI에서 사용
└─ docs/
   └─ pdca/
      ├─ 01-plan.md
      ├─ 02-design.md   (this)
      ├─ 03-do.md
      ├─ 04-check.md
      └─ 05-report.md
```

## 3. 환경 변수 키 정의

| 키 | 용도 | dev 기본 | prod |
|----|------|---------|------|
| `COMPOSE_PROJECT_NAME` | 컨테이너 prefix | `allflow` | `allflow` |
| `NODE_ENV` | 노드 모드 | `development` | `production` |
| `POSTGRES_USER` | DB 사용자 | `allflow` | secret |
| `POSTGRES_PASSWORD` | DB 비밀번호 | `allflow_dev_pw` | secret |
| `POSTGRES_DB` | 기본 DB | `allflow` | `allflow` |
| `POSTGRES_PORT` | 호스트 포트 | `5432` | (미노출) |
| `REDIS_PORT` | 호스트 포트 | `6379` | (미노출) |
| `REDIS_PASSWORD` | (선택) Redis AUTH | (없음) | secret |
| `BACKEND_PORT` | 호스트 포트 | `8080` | `8080` (혹은 reverse proxy 뒤) |
| `FRONTEND_PORT` | 호스트 포트 | `3000` | `3000` |
| `JWT_SECRET` | next-auth + backend 공유 | 32자 랜덤 | secret |
| `OPENAI_API_KEY` | AI 어댑터 | (옵션) | secret |
| `ANTHROPIC_API_KEY` | AI 어댑터 | (옵션) | secret |
| `BACKEND_URL` | frontend → backend | `http://backend:8080/api/v1` | `http://backend:8080/api/v1` |

## 4. 서비스 상세

### 4.1 postgres
- 이미지: `postgres:16-alpine`
- 헬스체크: `pg_isready -U $POSTGRES_USER`
- 볼륨:
  - `pg-data:/var/lib/postgresql/data`
  - `./docker/postgres-init:/docker-entrypoint-initdb.d:ro`
- 네트워크: `allflow-net` 만 (외부 노출 X, dev override에서만 5432 노출)

### 4.2 redis
- 이미지: `redis:7-alpine`
- 명령어: `redis-server --appendonly yes`
- 헬스체크: `redis-cli ping | grep PONG`
- 볼륨: `redis-data:/data`

### 4.3 backend
- 빌드: `../all-flow-backend` (Dockerfile 우선, 없으면 `./docker/backend.Dockerfile` fallback)
- 의존성: postgres healthy + redis healthy
- 헬스체크: `wget -qO- http://localhost:8080/health || exit 1`
- 환경변수: DATABASE_URL, REDIS_URL, JWT_SECRET, OPENAI/ANTHROPIC keys
- dev override: `command: pnpm dev`, 소스 bind mount, `node_modules` named volume으로 OS차이 회피

### 4.4 frontend
- 빌드: `../all-flow-frontend` (Dockerfile 우선, 없으면 `./docker/frontend.Dockerfile` fallback)
- 의존성: backend healthy
- 헬스체크: `wget -qO- http://localhost:3000/api/health || exit 1` (없으면 root path 200 확인)
- dev override: `command: pnpm dev`, 소스 bind mount

## 5. 네트워크 / 볼륨

```yaml
networks:
  allflow-net:
    name: allflow-net
    driver: bridge

volumes:
  pg-data:
  redis-data:
  backend-node-modules:   # dev mode에서 호스트 node_modules와 격리
  frontend-node-modules:
```

## 6. 의존성 그래프

```
postgres (healthy) ──┐
                     ├──▶ backend (healthy) ──▶ frontend
redis    (healthy) ──┘
```

`depends_on.condition: service_healthy` 사용. Compose v2.20+ 필요.

## 7. 환경 분리 전략

### Dev
```
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d
```
- 코드 bind mount (`../all-flow-frontend:/app`)
- DB/Redis 포트 호스트 노출 (디버깅)
- `command` override → `pnpm dev`
- `CHOKIDAR_USEPOLLING=true` (WSL2 inotify 회피)

### Prod
```
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```
- 멀티스테이지 빌드 결과만 사용 (bind mount 없음)
- DB/Redis 포트 미노출
- `restart: always`
- `read_only: true` (가능 시 frontend/backend)

## 8. 보안 설계

1. `.env.*` 는 `.gitignore` (`.env.example` 만 커밋)
2. Postgres/Redis 운영 포트 미노출
3. JWT_SECRET, AI 키는 외부 secret manager 또는 docker secrets 사용 권고 (README에 명시)
4. 컨테이너 user — non-root (Dockerfile에서 `USER node`)
5. pre-commit Gate 1 (시크릿 스캔) 활용

## 9. 백업 / 복원

- `scripts/backup.sh` — `docker compose exec postgres pg_dump` → `./backups/{ISO8601}.sql.gz`
- `scripts/restore.sh {file}` — gunzip → `psql` 복원

## 10. Makefile 타겟

| target | 설명 |
|--------|-----|
| `make up` | dev 풀 부팅 |
| `make down` | 모든 서비스 정지 + 네트워크 정리 |
| `make prod` | prod 부팅 |
| `make logs` | 전체 로그 follow |
| `make ps` | 컨테이너 상태 |
| `make psql` | postgres 컨테이너에 `psql` 진입 |
| `make redis-cli` | redis-cli 진입 |
| `make backup` | scripts/backup.sh |
| `make seed` | backend 컨테이너에서 `pnpm seed` |
| `make migrate` | `pnpm prisma migrate deploy` |
| `make rebuild` | --no-cache 빌드 후 재시작 |
| `make clean` | 볼륨까지 삭제 (위험, 확인 prompt) |

## 11. 검증 계획

- `docker compose config` → 스키마 유효성
- `docker compose up -d` → 60초 내 4 컨테이너 healthy
- `curl http://localhost:3000` 200, `curl http://localhost:8080/health` 200
- `docker compose down && docker compose up -d` 후 데이터 잔존 확인
- `make backup` → tar.gz 생성 확인
- gstack E2E (frontend 페이지 로드 + 백엔드 응답)

## 12. Open Questions (PM 확인 필요)

- Q1: Backend `/health` 엔드포인트 표준화 여부 → 기본은 `200 OK { status: "ok" }`로 가정
- Q2: 운영에서 reverse proxy(Caddy/Nginx) 추가 여부 → 본 PDCA에서는 미포함 (별도 PDCA)
- Q3: Postgres 16 → 17 마이그레이션 정책 → 본 PDCA 범위 외
