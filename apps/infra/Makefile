# ALL-Flow infra Makefile
.DEFAULT_GOAL := help

ENV       ?= dev
ENV_FILE  := .env.$(ENV)
COMPOSE   := docker compose -f docker-compose.yml -f docker-compose.$(ENV).yml --env-file $(ENV_FILE)

.PHONY: help up down restart prod logs ps psql redis-cli backup restore seed migrate rebuild clean check

help:  ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check:  ## Validate compose schema for current ENV
	@test -f $(ENV_FILE) || { echo "missing $(ENV_FILE) - copy .env.example"; exit 1; }
	$(COMPOSE) config -q && echo "[check] $(ENV) compose ok"

up:  ## Start all services for current ENV (default: dev)
	@test -f $(ENV_FILE) || { echo "missing $(ENV_FILE) - copy .env.example"; exit 1; }
	$(COMPOSE) up -d
	./scripts/wait-for-healthy.sh 120

down:  ## Stop and remove containers (keeps volumes)
	$(COMPOSE) down --remove-orphans

restart:  ## Down + up
	$(MAKE) down ENV=$(ENV)
	$(MAKE) up ENV=$(ENV)

prod:  ## Shortcut: ENV=prod up
	$(MAKE) up ENV=prod

logs:  ## Follow logs from all services
	$(COMPOSE) logs -f --tail=200

ps:  ## Show service status
	$(COMPOSE) ps

psql:  ## Open psql shell in postgres container
	$(COMPOSE) exec postgres sh -lc 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

redis-cli:  ## Open redis-cli (auth-aware)
	$(COMPOSE) exec redis sh -lc 'redis-cli -a "$$REDIS_PASSWORD" --no-auth-warning'

migrate:  ## Run prisma migrate deploy in backend container
	$(COMPOSE) exec backend pnpm prisma migrate deploy

seed:  ## Run backend seed
	$(COMPOSE) exec backend pnpm seed

backup:  ## Dump postgres to ./backups/
	./scripts/backup.sh $(ENV_FILE)

restore:  ## Restore from FILE=... ; e.g. make restore FILE=backups/x.sql.gz
	@test -n "$(FILE)" || { echo "usage: make restore FILE=path/to/dump.sql.gz"; exit 1; }
	./scripts/restore.sh $(FILE) $(ENV_FILE)

rebuild:  ## Rebuild images without cache and restart
	$(COMPOSE) build --no-cache
	$(MAKE) restart ENV=$(ENV)

clean:  ## Remove containers, networks, AND volumes (destructive)
	@read -p "This deletes ALL data volumes. Type 'yes' to continue: " ok && [ "$$ok" = "yes" ]
	$(COMPOSE) down --volumes --remove-orphans
