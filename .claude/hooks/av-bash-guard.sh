#!/bin/bash
# name: av-bash-guard
# autovibe: true
# version: 3.0
# created: 2026-03-29
# updated: 2026-04-27
# hook-type: PreToolUse
# trigger-tools: Bash
# description: 위험 Bash 명령어 차단 — 강화된 패턴 (fork bomb, curl|sh, 디스크 raw 쓰기 등)

set -euo pipefail

# jq 미설치 시 fail-safe: 차단 모드 (보안 우선)
if ! command -v jq >/dev/null 2>&1; then
  echo "[av-bash-guard] CRITICAL: jq not installed — blocking by default" >&2
  exit 2
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# 빈 명령은 통과
[ -z "$COMMAND" ] && exit 0

# 정규식 패턴: \s+ 사용으로 다중 공백 회피 차단
BLOCKED_PATTERNS=(
  # 1. 파일 시스템 파괴
  "rm\s+-rf\s+/"
  "rm\s+-rf\s+~"
  "rm\s+-rf\s+\\\$HOME"
  "rm\s+-rf\s+\\\*"
  "sudo\s+rm"
  "sudo\s+dd"
  "find\s+/.*-delete"
  "find\s+/.*-exec\s+rm"

  # 2. 디스크 raw 쓰기
  ">\s*/dev/sd[a-z]"
  ">\s*/dev/nvme"
  ">\s*/dev/hd[a-z]"
  "dd\s+.*of=/dev/"
  "mkfs\."
  "fdisk"

  # 3. Fork bomb / DoS
  ":\\(\\)\\s*\\{[^}]*:\\|:[^}]*\\}\\s*;\\s*:"
  "while\s+true.*do.*&\s*$"

  # 4. 원격 실행 (curl/wget 파이프)
  "curl[^|]*\\|\\s*(sh|bash|zsh)"
  "wget[^|]*\\|\\s*(sh|bash|zsh)"
  "curl.*-s.*\\|\\s*(sh|bash)"

  # 5. 위험 권한 변경
  "chmod\s+-?R?\s*777\s+/"
  "chmod\s+-?R?\s*777\s+~"
  "chown\s+.*:\s*/"

  # 6. 시크릿 / 키 유출
  "cat\s+.*\\.env"
  "cat\s+.*id_rsa"
  "cat\s+.*id_ed25519"
  "cat\s+.*\\.pem"
  "cat\s+.*\\.key\\b"
  "echo\s+.*PRIVATE\s+KEY"

  # 7. 데이터베이스 위험 명령
  "DROP\s+TABLE"
  "DROP\s+DATABASE"
  "TRUNCATE\s+TABLE"
  "DELETE\s+FROM.*WHERE\s+1\s*=\s*1"
  "DELETE\s+FROM\s+\\w+\\s*;"

  # 8. crontab 변경
  "crontab\s+-r"
  "crontab\s+-e"
  "echo.*>>\s*/etc/crontab"

  # 9. 시스템 종료
  "shutdown\s+-?h"
  "halt\s*$"
  "reboot\s*$"
  "init\s+0"
  "poweroff"

  # 10. iptables / 방화벽 변경
  "iptables\s+-F"
  "ufw\s+disable"

  # 11. git 위험 명령
  "git\s+push\s+.*--force\s+.*main"
  "git\s+push\s+.*--force\s+.*master"
  "git\s+push\s+-f\s+.*main"
  "git\s+reset\s+--hard\s+HEAD~"
  "git\s+clean\s+-fd"

  # 12. 환경 변수 / 설정 파괴
  "unset\s+PATH"
  ">\s*~/\\.bashrc"
  ">\s*~/\\.zshrc"
  ">\s*~/\\.profile"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qiE "$pattern"; then
    echo "[av-bash-guard] BLOCKED: pattern matched [$pattern]" >&2
    echo "[av-bash-guard] Command: $COMMAND" >&2
    exit 2
  fi
done

exit 0
