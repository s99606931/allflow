#!/usr/bin/env bash
# av-oss-license-check.sh — PostToolUse(Write/Edit on package.json/requirements.txt) 시
# 새로 추가된 의존성의 라이선스 호환성 검증 (MIT 호환만 허용)
# Trigger: PostToolUse hook for dependency manifest changes
# Action: warns (non-blocking) if incompatible license detected

set -euo pipefail

payload=$(cat)
file_path=$(echo "$payload" | jq -r '.tool_input.file_path // ""')

# Only run for dependency manifests
case "$file_path" in
  */package.json|*/requirements.txt|*/Cargo.toml|*/go.mod|*/pom.xml) ;;
  *) exit 0 ;;
esac

# Project license (default: MIT). Override via .av-oss-license file.
proj_license="MIT"
[[ -f "${CLAUDE_PROJECT_DIR:-.}/.av-oss-license" ]] && proj_license=$(cat "${CLAUDE_PROJECT_DIR}/.av-oss-license")

# MIT-compatible licenses (permissive only)
compat_licenses="MIT|Apache-2.0|BSD-2-Clause|BSD-3-Clause|ISC|Unlicense|CC0-1.0|0BSD"

# Incompatible (copyleft / restrictive) — warn user
incompat_licenses="GPL-3.0|AGPL-3.0|LGPL-3.0|SSPL|BUSL"

# Tools that may not be installed — soft check only
warn=""
case "$file_path" in
  */package.json)
    if command -v npx >/dev/null 2>&1; then
      result=$(cd "$(dirname "$file_path")" && npx --yes license-checker --production --csv 2>/dev/null | grep -E "$incompat_licenses" || true)
      [[ -n "$result" ]] && warn="$result"
    fi
    ;;
  */requirements.txt)
    if command -v pip-licenses >/dev/null 2>&1; then
      result=$(pip-licenses --format=csv 2>/dev/null | grep -E "$incompat_licenses" || true)
      [[ -n "$result" ]] && warn="$result"
    fi
    ;;
esac

if [[ -n "$warn" ]]; then
  echo "{\"decision\": \"warn\", \"reason\": \"av-oss-license-check: detected non-MIT-compatible dependency in $file_path. Project license: $proj_license. Review:\\n$warn\"}"
fi

exit 0
