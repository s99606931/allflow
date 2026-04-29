#!/usr/bin/env bash
# av-oss-secret-scan.sh — PreToolUse(Write/Edit) 시 시크릿 패턴 차단
# Trigger: Claude Code PreToolUse hook for Write/Edit/Bash(git commit)
# Action: blocks if file content contains common secret patterns

set -euo pipefail

# Read JSON payload from stdin (Claude Code hook protocol)
payload=$(cat)
content=$(echo "$payload" | jq -r '.tool_input.content // .tool_input.new_string // ""')
file_path=$(echo "$payload" | jq -r '.tool_input.file_path // ""')

# Skip non-text files and the hook itself
case "$file_path" in
  *av-oss-secret-scan.sh|*.lock|*.png|*.jpg|*.jpeg|*.pdf|*.zip) exit 0 ;;
esac

# Patterns to detect (high-confidence secrets)
declare -a patterns=(
  'AKIA[0-9A-Z]{16}'                                  # AWS Access Key
  'aws_secret_access_key[[:space:]]*=[[:space:]]*["'\'']?[A-Za-z0-9/+=]{40}'
  'ghp_[A-Za-z0-9]{36}'                               # GitHub PAT
  'gho_[A-Za-z0-9]{36}'                               # GitHub OAuth
  'sk-[A-Za-z0-9]{20,}'                               # OpenAI / Anthropic style
  'xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]+'           # Slack bot token
  '-----BEGIN (RSA|OPENSSH|DSA|EC) PRIVATE KEY-----'  # Private keys
  'eyJ[A-Za-z0-9_=-]+\.[A-Za-z0-9_=-]+\.?[A-Za-z0-9_.+/=-]*' # JWT (basic)
)

for pat in "${patterns[@]}"; do
  if echo "$content" | grep -E -q "$pat"; then
    echo "{\"decision\": \"block\", \"reason\": \"av-oss-secret-scan: detected secret pattern '$pat' in $file_path. Move to env var or .env (gitignored).\"}"
    exit 0
  fi
done

# Allow
exit 0
