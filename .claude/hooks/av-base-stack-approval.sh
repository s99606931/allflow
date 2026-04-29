#!/usr/bin/env bash
# name: av-base-stack-approval
# autovibe: true
# version: 1.0
# created: 2026-04-29
# hook-type: PreToolUse
# trigger-tools: Edit, Write
# description: manifest 파일(package.json, Dockerfile*, docker-compose*.yml, .tool-versions, .nvmrc) 변경 시 사용자 승인 요청

set -euo pipefail

# Read stdin
INPUT=$(cat)

# Extract fields using python3 (always available)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

# Only intercept Edit and Write tool calls
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

# Empty file path → passthrough
[ -z "$FILE_PATH" ] && exit 0

# Manifest pattern matching function
is_manifest() {
  local fp="$1"

  # Exclude node_modules
  [[ "$fp" == *"/node_modules/"* ]] && return 1

  # Exclude lockfiles
  [[ "$fp" == *"pnpm-lock.yaml" ]] && return 1
  [[ "$fp" == *"package-lock.json" ]] && return 1
  [[ "$fp" == *"yarn.lock" ]] && return 1

  # Match manifests
  [[ "$fp" == *"/package.json" ]] && return 0
  [[ "$fp" == */Dockerfile* ]] && return 0
  [[ "$fp" == *"/docker-compose"*".yml" ]] && return 0
  [[ "$fp" == *"docker-compose"*".yml" ]] && return 0
  [[ "$fp" == *"/.tool-versions" ]] && return 0
  [[ "$fp" == *"/.nvmrc" ]] && return 0

  return 1
}

# If not a manifest → passthrough
if ! is_manifest "$FILE_PATH"; then
  exit 0
fi

# AV_STACK_APPROVAL=skip bypass mode
if [[ "${AV_STACK_APPROVAL:-}" == "skip" ]]; then
  echo "⚠️ AV_STACK_APPROVAL=skip 우회 모드" >&2
  exit 0
fi

# Manifest matched → log rejection reason + block with exit 2
TS=$(date -Iseconds)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MEMORY_FILE="$PROJECT_DIR/.claude/agent-memory/av-base-memory-keeper/MEMORY.md"
if [ -f "$MEMORY_FILE" ]; then
  printf -- '- %s | %s | manifest 변경 차단 | 사유: 사용자 승인 대기\n' "$TS" "$FILE_PATH" >> "$MEMORY_FILE"
fi

echo "⚠️  manifest 변경 감지: $FILE_PATH"
echo "변경 승인이 필요합니다. Claude Code가 AskUserQuestion을 통해 확인합니다."
exit 2
