# ALL-Flow Infrastructure

Docker Compose-based infra for the ALL-Flow stack:

- `frontend` (Next.js 16) - `../all-flow-frontend`
- `backend`  (Fastify 5)  - `../all-flow-backend`
- `postgres` (16-alpine)
- `redis`    (7-alpine)

All four run on a private bridge network `allflow-net`. Postgres and Redis are
internal-only by default (dev overlay exposes them for debugging).

## Quick start (dev)

```bash
cp .env.example .env.dev
# edit .env.dev: set JWT_SECRET (openssl rand -hex 32), POSTGRES_PASSWORD, etc.
make up                       # builds, starts, waits for health
make logs                     # tail all services
open http://localhost:3000    # frontend
curl http://localhost:8080/health
```

## Quick start (prod)

```bash
cp .env.example .env.prod
# fill .env.prod with production secrets (use a secret manager in real ops).
make prod
```

## Layout

| Path | Purpose |
|------|---------|
| `docker-compose.yml`       | Base service graph (env-agnostic) |
| `docker-compose.dev.yml`   | Dev overlay - bind mounts, hot reload, exposed DB ports |
| `docker-compose.prod.yml`  | Prod overlay - prebuilt images, locked-down ports, restart=always |
| `.env.example`             | All env keys with safe defaults |
| `Makefile`                 | `make up/down/logs/psql/backup/...` |
| `docker/postgres-init/`    | First-boot SQL (extensions, schemas) |
| `docker/*.Dockerfile`      | Fallback Dockerfiles when app repos lack their own |
| `scripts/`                 | `backup.sh`, `restore.sh`, `wait-for-healthy.sh` |
| `docs/pdca/`               | Plan, Design, Do, Check, Report (PDCA cycle) |

## Environment files

`.env.example` is the only env file in git. Copy to:

- `.env.dev`  - local development
- `.env.prod` - production (use a secret manager; never commit)

Both are gitignored.

## Common commands

```bash
make up          # start all services (dev)
make down        # stop all (keeps volumes)
make rebuild     # --no-cache rebuild + restart
make logs        # tail logs
make psql        # postgres shell
make redis-cli   # redis shell
make backup      # ./backups/<timestamp>.sql.gz
make migrate     # prisma migrate deploy
make seed        # backend seed
make clean       # WIPE volumes (asks for "yes")

ENV=prod make up # prod
```

## Health check & dependency order

```
postgres (healthy) -+
                    +-> backend (healthy) --> frontend
redis    (healthy) -+
```

Compose v2.20+ required for `depends_on.condition: service_healthy`.

## Backups

```bash
make backup                                 # writes ./backups/allflow-*.sql.gz
make restore FILE=backups/allflow-...sql.gz # restores into running postgres
```

## Security notes

- DB and Redis ports are NOT exposed in prod overlay (internal-only).
- `JWT_SECRET` is required (compose fails if unset).
- Containers run as non-root (`USER app`) in prod images.
- Read-only root filesystem in prod, with tmpfs for `/tmp` and Next cache.
- Pre-commit Gate 1 (secret scan) catches leaked credentials before they land.

## Observability (optional)

Add a sibling overlay later: `docker-compose.observability.yml`
(Prometheus + Grafana + Loki). Out of scope for this PDCA.

## PDCA documents

See `docs/pdca/` for `01-plan`, `02-design`, `03-do`, `04-check`, `05-report`.
