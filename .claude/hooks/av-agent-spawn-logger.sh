#!/bin/bash
# name: av-agent-spawn-logger
# autovibe: true
# version: 1.0
# created: 2026-03-29
# hook-type: SubagentStart
# description: 에이전트 스폰 시 로깅 — 조직 구조 추적

set -euo pipefail
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/agent-lifecycle.log"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")

echo "${TIMESTAMP} | SPAWN | ${AGENT_TYPE}" >> "$LOG_FILE"

if [[ "$AGENT_TYPE" == av-* ]]; then
  echo "[av-lifecycle] Agent 스폰: ${AGENT_TYPE}" >&2
fi

exit 0
