#!/bin/bash
# name: av-config-watcher
# autovibe: true
# version: 1.0
# created: 2026-03-29
# hook-type: ConfigChange
# matcher: skills|project_settings
# description: 스킬/설정 변경 감지 시 레지스트리 동기화 알림

set -euo pipefail
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/config-changes.log"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
CHANGE_TYPE=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")

echo "${TIMESTAMP} | CONFIG_CHANGE | ${CHANGE_TYPE}" >> "$LOG_FILE"
echo "[av-config] 설정 변경 감지 — components.json 동기화 필요" >&2

exit 0
