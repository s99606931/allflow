#!/bin/bash
# name: av-session-discovery
# autovibe: true
# version: 1.0
# created: 2026-03-29
# hook-type: SessionStart
# matcher: startup|resume
# description: 세션 시작 시 av 생태계 컨텍스트 로드 및 상태 보고

set -euo pipefail
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REGISTRY="${CLAUDE_PROJECT_DIR}/.claude/registry/components.json"

if [ -f "$REGISTRY" ]; then
  AGENTS=$(jq -r '._meta.total.agents // 0' "$REGISTRY" 2>/dev/null || echo "0")
  SKILLS=$(jq -r '._meta.total.skills // 0' "$REGISTRY" 2>/dev/null || echo "0")
  HOOKS=$(jq -r '._meta.total.hooks // 0' "$REGISTRY" 2>/dev/null || echo "0")
  RULES=$(jq -r '._meta.total.rules // 0' "$REGISTRY" 2>/dev/null || echo "0")
  echo "[av-ecosystem] Agents:${AGENTS} Skills:${SKILLS} Hooks:${HOOKS} Rules:${RULES}"
else
  echo "[av-ecosystem] Registry 없음 — /av-vibe-portable-init setup 실행 권장"
fi

exit 0
