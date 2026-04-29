#!/bin/bash
# name: av-prompt-sync-trigger
# autovibe: true
# version: 1.0
# created: 2026-04-27
# hook-type: UserPromptSubmit
# description: SYNC_TRIGGER_FILE 감지 시 사용자 프롬프트에 sync 권장을 컨텍스트로 자동 주입

set -euo pipefail

CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SYNC_TRIGGER_FILE="${CLAUDE_PROJECT_DIR}/.claude/state/plugin-sync-needed"
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/sync-trigger.log"

# 트리거 파일 없으면 통과
[ -f "$SYNC_TRIGGER_FILE" ] || exit 0

mkdir -p "$(dirname "$LOG_FILE")"
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")

# jq로 트리거 정보 추출
DRIFT=""
TRIGGER_AT=""
if command -v jq >/dev/null 2>&1; then
  DRIFT=$(jq -r '.drift // ""' "$SYNC_TRIGGER_FILE" 2>/dev/null || echo "")
  TRIGGER_AT=$(jq -r '.trigger_at // ""' "$SYNC_TRIGGER_FILE" 2>/dev/null || echo "")
fi

# Sanitize (방어적 — plugin-tracker가 이미 sanitize했으나 이중 보장)
SAFE_DRIFT=$(echo "${DRIFT}" | tr -cd '[:alnum:]\.\-:_/→ ()')
SAFE_DRIFT="${SAFE_DRIFT:0:200}"

# 트리거 파일 삭제 (중복 트리거 방지 — 한 번만 알림)
rm -f "$SYNC_TRIGGER_FILE"

# 로그 기록
echo "${TIMESTAMP} | TRIGGER | drift=${SAFE_DRIFT} consumed=${TRIGGER_AT}" >> "$LOG_FILE"

# additionalContext로 Claude에 즉시 주입
cat <<CONTEXT_EOF

---
## 🔄 외부 플러그인 동기화 필요 (자동 감지)

직전 SessionStart에서 av-plugin-tracker가 외부 플러그인 변경을 감지했습니다:
**${SAFE_DRIFT}**

자동 권장 액션: 사용자 요청 처리 전 \`/av-base-sync\` 또는 동등 작업으로
CLAUDE.md/registry/components.json을 최신 플러그인 버전과 동기화하세요.

(이 알림은 한 번만 표시됩니다)
---

CONTEXT_EOF

exit 0
