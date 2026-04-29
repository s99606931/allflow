#!/bin/bash
# name: av-post-write-monitor
# autovibe: true
# version: 1.0
# created: 2026-03-29
# hook-type: PostToolUse
# trigger-tools: Write, Edit
# description: Write/Edit 후 변경 파일 감지 및 로깅

set -euo pipefail
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/write-monitor.log"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")

echo "${TIMESTAMP} | ${TOOL_NAME} | ${FILE_PATH}" >> "$LOG_FILE"

if [[ "$FILE_PATH" == *".claude/agents/"* || "$FILE_PATH" == *".claude/skills/"* ]]; then
  echo "[av-monitor] AutoVibe 컴포넌트 변경 감지: ${FILE_PATH}" >&2
fi

exit 0
