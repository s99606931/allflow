#!/bin/bash
# name: av-content-scanner
# autovibe: true
# version: 2.1
# created: 2026-03-29
# updated: 2026-04-27
# hook-type: PreToolUse
# trigger-tools: Write, Edit
# description: Write/Edit 전 내용 검사 — 강화된 시크릿/키 패턴 (JWT, GCP, Azure, Slack 등)

set -euo pipefail

# jq 미설치 시 fail-safe: 차단 모드 (보안 우선)
if ! command -v jq >/dev/null 2>&1; then
  echo "[av-content-scanner] CRITICAL: jq not installed — blocking by default" >&2
  exit 2
fi

INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // ""' 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null || echo "")

# 빈 내용은 통과
[ -z "$CONTENT" ] && exit 0

# 보안 도구 정의 파일은 의도적으로 위험 패턴을 정의하므로 검사 제외 (화이트리스트)
case "$FILE_PATH" in
  */.claude/hooks/*) exit 0 ;;
  */.githooks/*) exit 0 ;;
  */.claude/rules/av-base-code-quality-gates.md) exit 0 ;;
  */.claude/agent-memory/*) exit 0 ;;
  */docs/*) exit 0 ;;
esac

SENSITIVE_PATTERNS=(
  # AWS
  "AKIA[A-Z0-9]{16}"
  "aws_secret_access_key\s*=\s*['\"][^'\"]+['\"]"

  # OpenAI / Anthropic
  "sk-[a-zA-Z0-9]{32,}"
  "sk-ant-[a-zA-Z0-9_-]{50,}"

  # GitHub
  "ghp_[a-zA-Z0-9]{36}"
  "gho_[a-zA-Z0-9]{36}"
  "ghu_[a-zA-Z0-9]{36}"
  "ghs_[a-zA-Z0-9]{36}"
  "ghr_[a-zA-Z0-9]{36}"

  # GCP
  "AIza[0-9A-Za-z_-]{35}"
  "ya29\\.[0-9A-Za-z_-]+"
  '"private_key":\s*"-----BEGIN PRIVATE KEY-----'

  # Azure
  "DefaultEndpointsProtocol=https;AccountName="
  "AccountKey=[A-Za-z0-9+/=]{88}"

  # Slack
  "xox[baprs]-[0-9a-zA-Z-]{10,}"

  # JWT (3 base64url 세그먼트)
  "eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}"

  # Private Keys (모든 종류)
  "-----BEGIN\\s+(RSA\\s+|DSA\\s+|EC\\s+|OPENSSH\\s+|PGP\\s+)?PRIVATE\\s+KEY-----"
  "-----BEGIN\\s+ENCRYPTED\\s+PRIVATE\\s+KEY-----"

  # Stripe
  "sk_live_[0-9a-zA-Z]{24,}"
  "rk_live_[0-9a-zA-Z]{24,}"

  # Generic password / secret
  "password\s*=\s*['\"][^'\"]{4,}['\"]"
  "secret\s*=\s*['\"][^'\"]{8,}['\"]"
  "api_?key\s*=\s*['\"][^'\"]{16,}['\"]"

  # Database connection strings
  "mongodb(\\+srv)?://[^:]+:[^@]+@"
  "postgres(ql)?://[^:]+:[^@]+@"
  "mysql://[^:]+:[^@]+@"

  # SSH
  "ssh-rsa\s+AAAA[0-9A-Za-z+/=]{100,}"

  # NPM
  "npm_[a-zA-Z0-9]{36}"
)

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  if echo "$CONTENT" | grep -qiE -- "$pattern" 2>/dev/null; then
    echo "[av-content-scanner] BLOCKED: sensitive pattern detected" >&2
    echo "[av-content-scanner] File: ${FILE_PATH:-<unknown>}" >&2
    echo "[av-content-scanner] Pattern: $pattern" >&2
    exit 2
  fi
done

exit 0
