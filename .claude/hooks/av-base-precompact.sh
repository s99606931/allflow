#!/bin/bash
# name: av-base-precompact
# autovibe: true
# version: 2.1
# created: 2026-03-29
# updated: 2026-04-27
# hook-type: SessionStart
# matcher: compact
# description: 컨텍스트 압축 전 모든 에이전트 MEMORY.md 자동 스냅샷 보존

set -euo pipefail

CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/compact.log"
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
SNAPSHOT_DIR="${CLAUDE_PROJECT_DIR}/.claude/logs/snapshots/${TIMESTAMP}"
MEMORY_ROOT="${CLAUDE_PROJECT_DIR}/.claude/agent-memory"

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$SNAPSHOT_DIR"

echo "${TIMESTAMP} | COMPACT | snapshot started → ${SNAPSHOT_DIR}" >> "$LOG_FILE"

# 모든 에이전트 MEMORY.md를 스냅샷 디렉토리에 복사
SNAPSHOT_COUNT=0
if [ -d "$MEMORY_ROOT" ]; then
  while IFS= read -r -d '' memfile; do
    agent_name=$(basename "$(dirname "$memfile")")
    target_dir="${SNAPSHOT_DIR}/${agent_name}"
    mkdir -p "$target_dir"
    cp "$memfile" "$target_dir/MEMORY.md"
    SNAPSHOT_COUNT=$((SNAPSHOT_COUNT + 1))
  done < <(find "$MEMORY_ROOT" -name "MEMORY.md" -print0 2>/dev/null)
fi

# 글로벌 메모리 스냅샷 — 다단계 안전 탐색
GLOBAL_MEM=""

# 방법 1: ~/.claude/projects 자동 탐색 (basename 매칭, 가장 안전)
if [ -d "${HOME}/.claude/projects" ]; then
  PROJECT_BASE=$(basename "$CLAUDE_PROJECT_DIR")
  while IFS= read -r dir; do
    if [ -d "${dir}/memory" ] && echo "$dir" | grep -q "${PROJECT_BASE}"; then
      GLOBAL_MEM="${dir}/memory"
      break
    fi
  done < <(find "${HOME}/.claude/projects" -maxdepth 1 -type d 2>/dev/null)
fi

# 방법 2 (폴백): 슬러그 기반 직접 매칭
if [ -z "$GLOBAL_MEM" ]; then
  PROJECT_SLUG=$(echo "$CLAUDE_PROJECT_DIR" | tr '/' '-' | sed 's|^-||')
  CANDIDATE="${HOME}/.claude/projects/-${PROJECT_SLUG}/memory"
  if [ -d "$CANDIDATE" ]; then
    GLOBAL_MEM="$CANDIDATE"
  fi
fi

# 스냅샷 (찾았을 때만)
if [ -n "$GLOBAL_MEM" ] && [ -d "$GLOBAL_MEM" ]; then
  cp -r "$GLOBAL_MEM" "${SNAPSHOT_DIR}/_global" 2>/dev/null || true
fi

# 세션 상태도 백업
if [ -f "${CLAUDE_PROJECT_DIR}/.bkit/state/memory.json" ]; then
  cp "${CLAUDE_PROJECT_DIR}/.bkit/state/memory.json" "${SNAPSHOT_DIR}/bkit-memory.json"
fi

if [ -f "${CLAUDE_PROJECT_DIR}/.bkit/state/pdca-status.json" ]; then
  cp "${CLAUDE_PROJECT_DIR}/.bkit/state/pdca-status.json" "${SNAPSHOT_DIR}/bkit-pdca-status.json"
fi

# 오래된 스냅샷 정리 (10개 초과 시 가장 오래된 것 삭제)
SNAPSHOT_PARENT="${CLAUDE_PROJECT_DIR}/.claude/logs/snapshots"
SNAPSHOTS_TO_KEEP=10
if [ -d "$SNAPSHOT_PARENT" ]; then
  ls -1t "$SNAPSHOT_PARENT" 2>/dev/null | tail -n +$((SNAPSHOTS_TO_KEEP + 1)) | while read -r old_dir; do
    rm -rf "${SNAPSHOT_PARENT}/${old_dir}"
  done
fi

echo "${TIMESTAMP} | COMPACT | snapshot complete (${SNAPSHOT_COUNT} agents) → ${SNAPSHOT_DIR}" >> "$LOG_FILE"

exit 0
