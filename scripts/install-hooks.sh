#!/bin/bash
# AutoVibe Harness Engineering — Git Hooks 설치 스크립트
# 실행: bash scripts/install-hooks.sh
# 효과: .githooks/ 디렉토리를 git hooks 디렉토리로 등록

set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
HOOKS_DIR="$REPO_ROOT/.githooks"

echo -e "${CYAN}[av-harness] Git Hooks 설치 중...${NC}"

if [ ! -d "$HOOKS_DIR" ]; then
  echo -e "${RED}  ✗ .githooks 디렉토리 없음: $HOOKS_DIR${NC}"
  exit 1
fi

# git hooksPath 설정
git config core.hooksPath .githooks
echo -e "${GREEN}  ✓ git config core.hooksPath = .githooks${NC}"

# 실행 권한 부여
chmod +x "$HOOKS_DIR/"*
echo -e "${GREEN}  ✓ hooks 실행 권한 설정 완료${NC}"

echo -e "\n${GREEN}[av-harness] ✓ Git Hooks 설치 완료!${NC}"
echo -e "  활성화된 hooks:"
for hook in "$HOOKS_DIR"/*; do
  echo -e "  - $(basename $hook)"
done

echo -e "\n${CYAN}사용법:${NC}"
echo -e "  git commit  → pre-commit 자동 실행 (Gate 1~4)"
echo -e "  git push    → pre-push 자동 실행 (Gate 5~7)"
echo -e "  긴급 우회:  git commit --no-verify  또는  git push --no-verify"
echo -e "\n${CYAN}팀원 온보딩 시:${NC}"
echo -e "  git clone [repo] && cd [repo] && bash scripts/install-hooks.sh"
