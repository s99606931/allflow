#!/usr/bin/env bash
# Restore a gzipped pg_dump file into the running postgres container.
# Usage: scripts/restore.sh backups/allflow-20260428T010203Z.sql.gz [.env.dev]
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <backup.sql.gz> [env-file]" >&2
  exit 1
fi

dump="$1"
env_file="${2:-.env.dev}"
if [[ ! -f "$dump" ]]; then
  echo "[restore] file not found: $dump" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
if [[ -f "$env_file" ]]; then
  set -a; . "$env_file"; set +a
fi

USER_NAME="${POSTGRES_USER:-allflow}"
DB_NAME="${POSTGRES_DB:-allflow}"

echo "[restore] restoring ${dump} -> ${DB_NAME}"
gunzip -c "$dump" | docker compose exec -T postgres psql -U "$USER_NAME" -d "$DB_NAME"
echo "[restore] done"
