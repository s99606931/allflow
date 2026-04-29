#!/usr/bin/env bash
# av-oss-sign-off.sh — PreToolUse(Bash) 시 'git commit' 명령에 -s (Signed-off-by) 강제
# Trigger: PreToolUse hook for Bash tool when command starts with 'git commit'
# Action: blocks if commit lacks -s and AV_OSS_DCO_REQUIRED=1
# Linux Kernel-style DCO (Developer Certificate of Origin) enforcement

set -euo pipefail

payload=$(cat)
command=$(echo "$payload" | jq -r '.tool_input.command // ""')

# Only inspect git commit commands
case "$command" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# Skip --amend without changes (re-amends inherit signing)
if echo "$command" | grep -qE -- '--no-edit'; then
  exit 0
fi

# Required mode (default: enabled). Disable via AV_OSS_DCO_REQUIRED=0
dco_required="${AV_OSS_DCO_REQUIRED:-1}"
[[ "$dco_required" != "1" ]] && exit 0

# Check if -s, --signoff, or Signed-off-by trailer is present
if echo "$command" | grep -qE -- '(-s\b|--signoff|Signed-off-by:)'; then
  exit 0
fi

# Block with helpful guidance
cat <<'EOF'
{"decision": "block", "reason": "av-oss-sign-off: DCO enforcement — git commit requires -s flag (Signed-off-by trailer).\n\nFix: append '-s' to your git commit command:\n  git commit -s -m \"feat: ...\"\n\nWhy: Linux Kernel-style DCO confirms you have the right to submit your contribution under the project license. See: https://developercertificate.org/\n\nTo disable: export AV_OSS_DCO_REQUIRED=0"}
EOF
exit 0
