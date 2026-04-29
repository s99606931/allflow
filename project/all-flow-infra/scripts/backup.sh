#!/usr/bin/env bash
# Postgres logical backup -> ./backups/{ISO8601}.sql.gz
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups

ts=$(date -u +%Y%m%dT%H%M%SZ)
out="backups/allflow-${ts}.sql.gz"

# Source env to get POSTGRES_USER / DB.
env_file="${1:-.env.dev}"
if [[ -f "$env_file" ]]; then
  set -a; . "$env_file"; set +a
fi

USER_NAME="${POSTGRES_USER:-allflow}"
DB_NAME="${POSTGRES_DB:-allflow}"

echo "[backup] dumping ${DB_NAME} -> ${out}"
docker compose exec -T postgres \
  pg_dump -U "$USER_NAME" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip -9 > "$out"

bytes=$(stat -c%s "$out" 2>/dev/null || stat -f%z "$out")
echo "[backup] ok: ${out} (${bytes} bytes)"
