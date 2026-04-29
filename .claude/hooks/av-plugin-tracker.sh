#!/bin/bash
# name: av-plugin-tracker
# autovibe: true
# version: 2.1
# created: 2026-04-27
# updated: 2026-04-27
# hook-type: SessionStart
# matcher: startup
# description: 외부 플러그인(bkit/gstack/ECC) 버전 자동 감지 + drift 시 sync skill 자동 호출

set -euo pipefail

CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_FILE="${CLAUDE_PROJECT_DIR}/.claude/state/plugin-versions.json"
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/plugin-tracker.log"
SYNC_TRIGGER_FILE="${CLAUDE_PROJECT_DIR}/.claude/state/plugin-sync-needed"
mkdir -p "$(dirname "$STATE_FILE")" "$(dirname "$LOG_FILE")"

TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")

# 현재 버전 감지 (unknown은 기록 안함 = 영구 고착 방지)
detect_bkit() {
  local v=""
  if command -v bkit >/dev/null 2>&1; then
    v=$(bkit --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  fi
  if [ -z "$v" ] && [ -f "${CLAUDE_PROJECT_DIR}/CLAUDE.md" ]; then
    v=$(grep -oP 'bkit v?\K[0-9]+\.[0-9]+\.[0-9]+' "${CLAUDE_PROJECT_DIR}/CLAUDE.md" | head -1)
  fi
  echo "${v}"
}

detect_gstack() {
  local v=""
  if command -v gstack >/dev/null 2>&1; then
    v=$(gstack --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
  fi
  if [ -z "$v" ] && [ -f "${CLAUDE_PROJECT_DIR}/CLAUDE.md" ]; then
    v=$(grep -oP 'gstack v?\K[0-9]+\.[0-9]+(\.[0-9]+)?' "${CLAUDE_PROJECT_DIR}/CLAUDE.md" | head -1)
  fi
  echo "${v}"
}

detect_ecc() {
  local count=0
  local ecc_dir="${HOME}/.claude/plugins/everything-claude-code"
  # 환경변수로 override 가능
  if [ -n "${ECC_PLUGIN_PATH:-}" ]; then
    ecc_dir="${ECC_PLUGIN_PATH}"
  fi
  if [ -d "$ecc_dir/skills" ]; then
    count=$(find "$ecc_dir/skills" -maxdepth 2 -name "SKILL.md" 2>/dev/null | wc -l)
  fi
  echo "${count}"
}

CURRENT_BKIT=$(detect_bkit)
CURRENT_GSTACK=$(detect_gstack)
CURRENT_ECC=$(detect_ecc)

# 이전 상태 로드
PREV_BKIT=""
PREV_GSTACK=""
PREV_ECC="0"
if [ -f "$STATE_FILE" ] && command -v jq >/dev/null 2>&1; then
  PREV_BKIT=$(jq -r '.bkit // ""' "$STATE_FILE" 2>/dev/null || echo "")
  PREV_GSTACK=$(jq -r '.gstack // ""' "$STATE_FILE" 2>/dev/null || echo "")
  PREV_ECC=$(jq -r '.ecc_skill_count // 0' "$STATE_FILE" 2>/dev/null || echo "0")
fi

# Drift 감지 (unknown은 비교 제외)
DRIFT_DETECTED=0
DRIFT_MSG=""

if [ -n "$CURRENT_BKIT" ] && [ -n "$PREV_BKIT" ] && [ "$PREV_BKIT" != "$CURRENT_BKIT" ]; then
  DRIFT_DETECTED=1
  DRIFT_MSG+=" bkit:${PREV_BKIT}→${CURRENT_BKIT}"
fi
if [ -n "$CURRENT_GSTACK" ] && [ -n "$PREV_GSTACK" ] && [ "$PREV_GSTACK" != "$CURRENT_GSTACK" ]; then
  DRIFT_DETECTED=1
  DRIFT_MSG+=" gstack:${PREV_GSTACK}→${CURRENT_GSTACK}"
fi
if [ "$PREV_ECC" != "$CURRENT_ECC" ] && [ "$CURRENT_ECC" != "0" ]; then
  DIFF=$((CURRENT_ECC - PREV_ECC))
  if [ "$DIFF" != "0" ]; then
    DRIFT_DETECTED=1
    DRIFT_MSG+=" ecc:${PREV_ECC}→${CURRENT_ECC}(${DIFF})"
  fi
fi

# 상태 파일 업데이트 (감지된 값만 저장 — unknown은 빈 문자열로 보존하지 않음)
NEW_BKIT="${CURRENT_BKIT:-$PREV_BKIT}"
NEW_GSTACK="${CURRENT_GSTACK:-$PREV_GSTACK}"

cat > "$STATE_FILE" <<EOF
{
  "_meta": {
    "updated": "${TIMESTAMP}",
    "tracked_by": "av-plugin-tracker v2.0"
  },
  "bkit": "${NEW_BKIT}",
  "gstack": "${NEW_GSTACK}",
  "ecc_skill_count": ${CURRENT_ECC}
}
EOF

# 로그 기록
echo "${TIMESTAMP} | TRACK | bkit=${CURRENT_BKIT:-skip} gstack=${CURRENT_GSTACK:-skip} ecc=${CURRENT_ECC} drift=${DRIFT_DETECTED}" >> "$LOG_FILE"

# Drift 감지 시 sync skill 자동 호출 트리거
if [ "$DRIFT_DETECTED" = "1" ]; then
  # 메시지 sanitize (prompt injection 방지) — 영문/숫자/일반기호만 허용
  SAFE_DRIFT_MSG=$(echo "${DRIFT_MSG}" | tr -cd '[:alnum:]\.\-:_/→ ()')
  # 길이 제한 (200자) — DoS 회피
  SAFE_DRIFT_MSG="${SAFE_DRIFT_MSG:0:200}"

  echo "[av-plugin-tracker] Plugin drift detected:${SAFE_DRIFT_MSG}" >&2

  # sync 트리거 파일 생성 (UserPromptSubmit hook이 감지하여 자동 호출)
  cat > "$SYNC_TRIGGER_FILE" <<EOF
{
  "trigger_at": "${TIMESTAMP}",
  "drift": "${SAFE_DRIFT_MSG}",
  "action": "av-base-sync",
  "auto_invoke": true
}
EOF
  # 권한 강화 (다중 사용자 시스템에서 노출 방지)
  chmod 600 "$SYNC_TRIGGER_FILE" 2>/dev/null || true

  echo "[av-plugin-tracker] Auto-trigger created (chmod 600) -> /av-base-sync 자동 호출 예약" >&2

  # additionalContext로 Claude에 전달 (sanitized)
  echo ""
  echo "## Plugin Drift Detected"
  echo ""
  echo "외부 플러그인 버전 변경 감지:${SAFE_DRIFT_MSG}"
  echo ""
  echo "**자동 동기화 권장**: \`/av-base-sync\` 실행하여 CLAUDE.md/registry를 최신화하세요."
fi

exit 0
