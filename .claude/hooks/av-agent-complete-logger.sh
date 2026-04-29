#!/bin/bash
# name: av-agent-complete-logger
# autovibe: true
# version: 1.0
# created: 2026-03-29
# hook-type: SubagentStop
# description: 에이전트 완료 시 로깅 + 기억 에이전트 결과 전달 트리거

set -euo pipefail
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/agent-lifecycle.log"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")

echo "${TIMESTAMP} | COMPLETE | ${AGENT_TYPE}" >> "$LOG_FILE"

exit 0
