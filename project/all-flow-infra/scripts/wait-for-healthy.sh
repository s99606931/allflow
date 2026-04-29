#!/usr/bin/env bash
# Block until every compose service reports healthy (or unhealthy/timeout).
# Useful in CI: `scripts/wait-for-healthy.sh 120`
set -euo pipefail

timeout="${1:-120}"
deadline=$(( $(date +%s) + timeout ))

cd "$(dirname "$0")/.."

while :; do
  ids=$(docker compose ps -q)
  if [[ -z "$ids" ]]; then
    echo "[wait] no containers" >&2
    exit 1
  fi

  bad=0
  pending=0
  while read -r id; do
    [[ -z "$id" ]] && continue
    name=$(docker inspect -f '{{.Name}}' "$id" | sed 's:^/::')
    state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id")
    case "$state" in
      healthy|running) ;;
      starting)        pending=1 ;;
      unhealthy)       echo "[wait] $name unhealthy" >&2; bad=1 ;;
      *)               echo "[wait] $name state=$state" >&2; pending=1 ;;
    esac
  done <<< "$ids"

  if [[ $bad -eq 1 ]]; then exit 2; fi
  if [[ $pending -eq 0 ]]; then echo "[wait] all healthy"; exit 0; fi
  if (( $(date +%s) >= deadline )); then echo "[wait] timeout" >&2; exit 3; fi
  sleep 2
done
