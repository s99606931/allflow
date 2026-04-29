# T-004 — docker-compose: postgres 16 + redis 7

> Phase: 0 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: compose up 시 5432/6379 healthy
> Dependencies: [T-003]

## Plan

- 목표: 로컬 개발 환경에서 단일 명령(`docker compose up -d`)으로 Postgres 16 + Redis 7을 healthy 상태로 띄운다.
- 범위:
  - `docker-compose.yml` 작성 (서비스 2 + healthcheck + named volume)
  - `.env.example` 에 호스트 포트 / DB 자격 placeholder 추가
- 결정/가정:
  - **alpine 이미지** (postgres:16-alpine, redis:7-alpine) — 경량/빠른 풀.
  - 호스트 포트는 `${POSTGRES_PORT:-5432}` / `${REDIS_PORT:-6379}` 로 외부화 → 동일 포트가 이미 사용 중이면 `POSTGRES_PORT=15432` 식으로 우회.
  - Redis는 `--appendonly yes` 로 영속화 (개발 도중 데이터 보존).
  - healthcheck 인터벌 5초/timeout 3초, retries 10 — CI / 통합 테스트(T-503)에서 wait-for-healthy 패턴에 사용 예정.
  - DATABASE_URL/REDIS_URL은 T-101 (Prisma)에서 env 스키마에 정식 추가.
- 리스크:
  - 로컬 개발자 머신에 이미 5432/6379가 떠 있는 경우 충돌 — `.env.example` 의 포트 변수로 해결.

## Do

- 추가 파일:
  - `docker-compose.yml`
  - `docs/pdca/00-bootstrap-docker.md` (본 문서)
- 수정 파일:
  - `.env.example` — `POSTGRES_USER/PASSWORD/DB/PORT`, `REDIS_PORT` 주석 추가.
- 추가 의존성: 없음 (호스트 docker / docker compose만 필요)

## Check

- 단위 테스트: 해당 없음 (인프라).
- 통합 테스트: T-503 testcontainers 단계에서 정식 통합.
- 수동 검증:
  - `docker compose config --quiet` → exit 0 (compose 문법 OK)
  - `POSTGRES_PORT=15432 REDIS_PORT=16379 docker compose up -d` → 두 컨테이너 Started.
  - `docker compose ps --format json` → `allflow-postgres` / `allflow-redis` 모두 `"Health":"healthy"` 확인.
  - `docker compose down` → 정상 정리.
- 메트릭/로그 확인: pg_isready / redis-cli ping 모두 성공.

## Act

- 학습한 패턴:
  - **호스트 포트 변수화** — 5432/6379는 흔히 충돌. `${VAR:-default}` 로 외부화.
  - **healthcheck를 무조건 명세** — 후속 통합 테스트 / Docker Compose `depends_on: condition: service_healthy` 가 가능하다.
- 메모리에 저장: docker compose 표준 = (alpine 이미지 + healthcheck 명시 + named volume + 포트 외부화) 4 종 세트.
- 후속 태스크에 영향:
  - T-101 (Prisma) — `depends_on: postgres: condition: service_healthy` 로 마이그레이션 자동화.
  - T-303 (Redis Pub/Sub) — 동일 redis 컨테이너에 ioredis 연결.
  - T-503 (testcontainers) — compose 대신 testcontainers-node로 격리 부팅.
- 회고: 호스트에 다른 Postgres가 떠 있어 첫 `up`이 실패. 포트 변수화로 즉시 우회 가능했으므로 패턴이 검증됨.
