#!/bin/bash
#===============================================================================
# WSL 바이브코딩 환경 자동 설정 스크립트
#
# 사용법:
#   chmod +x setup.sh
#   ./setup.sh
#
# 대상: Ubuntu 24.04 LTS (Noble Numbat) on WSL 2
#
# 설치 항목:
#   0. Ubuntu 24.04 버전 확인
#   1. 시스템 업데이트
#   2. sudo 비밀번호 생략
#   3. 한국어 로케일 + 서울 시간대
#   4. 필수 패키지 (universe 저장소 포함)
#   5. Node.js 24.x + pnpm
#   6. Docker Engine + Docker Compose
#   7. /data 디렉토리 생성
#   8-1. Claude Code (Native Install)
#   8-2. Gemini CLI (선택)
#   8-3. bkit 플러그인 설치 안내
#   8-4. gstack 설치 (Garry Tan's Claude Code 스킬 팩)
#   9. Git 전역 설정 (user.name, email, autocrlf, rebase, prune, credential)
#
# 참고:
#   - CLAUDE-CODE-AND-BKIT-INSTALLATION-GUIDE.md (2026년 3월 기준)
#   - https://code.claude.com/docs/en/setup
#   - https://github.com/popup-studio-ai/bkit-claude-code
#   - https://docs.docker.com/engine/install/ubuntu/
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}   $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERR]${NC}  $1"; }

print_section() {
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    echo ""
}

#───────────────────────────────────────────────────────────────────────────────
# 0. 환경 확인 (WSL + Ubuntu 24.04)
#───────────────────────────────────────────────────────────────────────────────
check_environment() {
    print_section "0. 환경 확인"

    # WSL 확인
    if grep -qi microsoft /proc/version 2>/dev/null; then
        log_success "WSL 환경 확인됨"
    else
        log_warn "WSL 환경이 아닌 것으로 감지됩니다."
        read -p "  계속 진행하시겠습니까? (y/N): " confirm
        [[ ! "$confirm" =~ ^[Yy]$ ]] && { log_warn "설치 취소됨."; exit 0; }
    fi

    # Ubuntu 버전 확인
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$VERSION_ID" == "24.04" ]]; then
            log_success "Ubuntu 24.04 LTS (${VERSION_CODENAME}) 확인됨"
        else
            log_warn "이 스크립트는 Ubuntu 24.04 LTS 기준입니다."
            log_warn "현재 버전: ${PRETTY_NAME}"
            log_warn "Ubuntu 24.04 설치 방법 (PowerShell 관리자 권한):"
            echo "   wsl --install -d Ubuntu-24.04"
            echo ""
            read -p "  현재 버전으로 계속 진행하시겠습니까? (y/N): " confirm
            [[ ! "$confirm" =~ ^[Yy]$ ]] && { log_warn "설치 취소됨."; exit 0; }
        fi
    fi

    # systemd 활성화 확인 (Ubuntu 24.04 WSL 권장)
    if ! systemctl is-system-running &>/dev/null 2>&1; then
        log_warn "systemd가 비활성화되어 있습니다. Docker 서비스 관리에 영향을 줄 수 있습니다."
        log_info "systemd 활성화 방법:"
        echo "   sudo tee /etc/wsl.conf << 'EOF'"
        echo "   [boot]"
        echo "   systemd=true"
        echo "   EOF"
        echo "   이후 PowerShell에서: wsl --shutdown && wsl -d Ubuntu-24.04"
        echo ""

        read -p "  지금 systemd를 활성화하시겠습니까? (y/N): " enable_systemd
        if [[ "$enable_systemd" =~ ^[Yy]$ ]]; then
            if grep -q '\[boot\]' /etc/wsl.conf 2>/dev/null; then
                log_warn "/etc/wsl.conf 에 [boot] 섹션이 이미 있습니다. 수동으로 확인하세요."
            else
                sudo tee /etc/wsl.conf > /dev/null << 'EOF'
[boot]
systemd=true
EOF
                log_success "/etc/wsl.conf 설정 완료"
                log_warn "WSL 재시작 필요: PowerShell에서 'wsl --shutdown' 후 Ubuntu 24.04 재진입"
                log_warn "재시작 후 이 스크립트를 다시 실행하세요."
                exit 0
            fi
        fi
    else
        log_success "systemd 활성화 확인됨"
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# 1. 시스템 업데이트
#───────────────────────────────────────────────────────────────────────────────
setup_system_update() {
    print_section "1. 시스템 업데이트"
    log_info "패키지 목록 업데이트 중..."
    sudo apt update -q
    log_info "패키지 업그레이드 중..."
    sudo apt upgrade -y -q
    log_success "시스템 업데이트 완료"
}

#───────────────────────────────────────────────────────────────────────────────
# 2. sudo 비밀번호 생략
#───────────────────────────────────────────────────────────────────────────────
setup_sudoers() {
    print_section "2. sudo 비밀번호 생략 설정"
    if [ -f "/etc/sudoers.d/$USER" ]; then
        log_warn "이미 설정되어 있습니다."
    else
        echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/$USER > /dev/null
        log_success "sudo 비밀번호 생략 설정 완료"
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# 3. 한국어 로케일 + 서울 시간대
#───────────────────────────────────────────────────────────────────────────────
setup_locale() {
    print_section "3. 한국어 로케일 + 시간대 설정"
    log_info "한국어 패키지 설치 중..."
    sudo apt install -y -q language-pack-ko
    sudo locale-gen ko_KR.UTF-8
    sudo update-locale LANG=ko_KR.UTF-8
    log_info "시간대 설정 중 (Asia/Seoul)..."
    sudo timedatectl set-timezone Asia/Seoul 2>/dev/null || \
        sudo ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime
    log_success "로케일 및 시간대 설정 완료"
}

#───────────────────────────────────────────────────────────────────────────────
# 4. 필수 패키지 (Ubuntu 24.04 universe 저장소 포함)
#───────────────────────────────────────────────────────────────────────────────
setup_essential_packages() {
    print_section "4. 필수 패키지 설치"

    # universe 저장소 활성화 (wslu 등 Ubuntu 커뮤니티 패키지 필요)
    log_info "universe 저장소 활성화 중..."
    sudo add-apt-repository universe -y -q 2>/dev/null || true
    sudo apt update -q

    log_info "기본 패키지 설치 중..."
    sudo apt install -y -q \
        build-essential curl wget git \
        ca-certificates gnupg lsb-release \
        software-properties-common \
        vim nano jq htop unzip wslu

    log_info "Python 도구 설치 중..."
    # Ubuntu 24.04: python3.12 기본 탑재, pip는 별도 설치
    sudo apt install -y -q python3-pip python3-venv python3-dev

    log_info "Ruff (Python linter/formatter) 설치 중..."
    if command -v ruff &>/dev/null; then
        log_warn "이미 설치됨: $(ruff --version)"
    else
        curl -LsSf https://astral.sh/ruff/install.sh | sh
        log_success "Ruff 설치 완료"
    fi

    log_info "uv (Python package manager) 설치 중..."
    if command -v uv &>/dev/null; then
        log_warn "이미 설치됨: $(uv --version)"
    else
        curl -LsSf https://astral.sh/uv/install.sh | sh
        log_success "uv 설치 완료"
    fi

    log_success "필수 패키지 설치 완료"
    log_info "  Python: $(python3 --version)"
}

#───────────────────────────────────────────────────────────────────────────────
# 5. Node.js 24.x + pnpm
#───────────────────────────────────────────────────────────────────────────────
setup_nodejs() {
    print_section "5. Node.js 24.x 설치"

    if command -v node &>/dev/null; then
        log_warn "이미 설치됨: $(node -v)"
        read -p "  재설치하시겠습니까? (y/N): " reinstall
        [[ ! "$reinstall" =~ ^[Yy]$ ]] && { log_info "건너뜁니다."; return; }
    fi

    log_info "NodeSource Node.js 24.x 저장소 등록 중..."
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - 2>/dev/null
    log_info "Node.js 설치 중..."
    sudo apt install -y -q nodejs

    # 글로벌 패키지 디렉토리 (sudo 없이 설치 가능하도록)
    mkdir -p ~/.npm-global
    npm config set prefix '~/.npm-global'
    if ! grep -q '\.npm-global' ~/.bashrc 2>/dev/null; then
        echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
    fi
    export PATH=~/.npm-global/bin:$PATH

    log_info "pnpm 설치 중..."
    npm install -g pnpm --quiet

    log_success "Node.js 설치 완료"
    log_info "  Node.js: $(node -v)"
    log_info "  npm:     v$(npm -v)"
    log_info "  pnpm:    v$(pnpm -v)"
}

#───────────────────────────────────────────────────────────────────────────────
# 6. Docker Engine + Docker Compose (Ubuntu 24.04 Noble 공식 지원)
# 참고: https://docs.docker.com/engine/install/ubuntu/
#───────────────────────────────────────────────────────────────────────────────
setup_docker() {
    print_section "6. Docker 설치"

    if command -v docker &>/dev/null; then
        log_warn "이미 설치됨: $(docker --version | cut -d' ' -f3 | tr -d ',')"
        read -p "  재설치하시겠습니까? (y/N): " reinstall
        [[ ! "$reinstall" =~ ^[Yy]$ ]] && { log_info "건너뜁니다."; return; }
    fi

    # Ubuntu 24.04 기존 충돌 패키지 제거
    log_info "기존 Docker 패키지 충돌 방지 처리 중..."
    for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
        sudo apt remove -y "$pkg" 2>/dev/null || true
    done

    log_info "Docker 공식 GPG 키 등록 중..."
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    log_info "Docker 공식 저장소 등록 중 (noble)..."
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    log_info "Docker 패키지 설치 중..."
    sudo apt update -q
    sudo apt install -y -q \
        docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin

    log_info "사용자를 docker 그룹에 추가 중..."
    sudo usermod -aG docker "$USER"

    log_info "Docker 서비스 시작 중..."
    if systemctl is-system-running &>/dev/null 2>&1; then
        sudo systemctl start docker
        sudo systemctl enable docker
        log_success "Docker 서비스 시작 완료 (systemd)"
    else
        sudo service docker start 2>/dev/null || \
            log_warn "Docker 서비스 수동 시작 필요: sudo service docker start"
    fi

    log_success "Docker 설치 완료"
    log_info "  $(docker --version)"
    log_info "  $(docker compose version)"
    log_warn "Docker 그룹 적용: 'newgrp docker' 또는 터미널 재시작"
}

#───────────────────────────────────────────────────────────────────────────────
# 7. /data 디렉토리 생성
#───────────────────────────────────────────────────────────────────────────────
setup_data_directory() {
    print_section "7. /data 디렉토리 생성"

    if [ -d "/data" ]; then
        log_warn "/data 이미 존재합니다."
    else
        sudo mkdir -p /data
        log_success "/data 생성 완료"
    fi

    sudo chown "$USER:$USER" /data
    log_success "/data 소유권 설정 완료 ($USER)"
}

#───────────────────────────────────────────────────────────────────────────────
# 8-1. Claude Code (Native Install - 공식 권장)
# 참고: https://code.claude.com/docs/en/setup
#───────────────────────────────────────────────────────────────────────────────
setup_claude_code() {
    print_section "8-1. Claude Code 설치"

    # WSL 브라우저 연동 (OAuth 인증용, wslu의 wslview 사용)
    if ! grep -q 'BROWSER="wslview"' ~/.bashrc 2>/dev/null; then
        echo 'export BROWSER="wslview"' >> ~/.bashrc
        log_info "WSL 브라우저 환경변수 설정 완료 (BROWSER=wslview)"
    fi

    if command -v claude &>/dev/null; then
        local ver
        ver=$(claude --version 2>/dev/null || echo "버전 확인 불가")
        log_warn "이미 설치됨: $ver"
        read -p "  최신 버전으로 업데이트 하시겠습니까? (y/N): " update_claude
        if [[ "$update_claude" =~ ^[Yy]$ ]]; then
            claude update
            log_success "업데이트 완료: $(claude --version 2>/dev/null)"
        fi
    else
        log_info "Claude Code Native Install 실행 중..."
        log_info "(자동 업데이트 지원, Node.js 의존성 없음 - 공식 권장 방식)"
        curl -fsSL https://claude.ai/install.sh | bash

        # ~/.local/bin PATH 반영
        if ! grep -q '\.local/bin' ~/.bashrc 2>/dev/null; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        fi
        export PATH="$HOME/.local/bin:$PATH"

        if command -v claude &>/dev/null; then
            log_success "Claude Code 설치 완료: $(claude --version 2>/dev/null)"
        else
            log_warn "설치 완료. PATH 반영 필요: source ~/.bashrc 또는 터미널 재시작"
        fi
    fi

    # claude 단축 alias 등록 (--dangerously-skip-permissions)
    if ! grep -q 'alias cc=' ~/.bashrc 2>/dev/null; then
        echo 'alias cc="claude --dangerously-skip-permissions"' >> ~/.bashrc
        log_success "alias 등록 완료: cc → claude --dangerously-skip-permissions"
    else
        log_warn "alias cc 이미 설정되어 있습니다."
    fi

    echo ""
    log_info "Claude Code 첫 실행:"
    echo "   source ~/.bashrc"
    echo "   cd ~/your-project && claude"
    echo "   → 브라우저에서 Claude 계정으로 인증"
    echo "   ※ 브라우저가 안 열리면 터미널 URL을 Windows 브라우저에 붙여넣기"
    echo ""
    log_info "권한 확인 생략 모드:"
    echo "   cc                # alias: claude --dangerously-skip-permissions"
    echo ""
    log_warn "유료 플랜 필요 (Pro / Max / Teams / Enterprise)"
    echo "   구독: https://claude.com/pricing"
}

#───────────────────────────────────────────────────────────────────────────────
# 8-2. Gemini CLI (자동 설치)
# 참고: https://github.com/google-gemini/gemini-cli (2026년 3월 기준)
#───────────────────────────────────────────────────────────────────────────────
setup_gemini_cli() {
    print_section "8-2. Gemini CLI 설치"

    echo "  Google Gemini CLI - AI 코딩 어시스턴트 (무료 티어 포함)"
    echo ""

    if command -v gemini &>/dev/null; then
        log_warn "이미 설치됨. 최신 버전으로 업데이트합니다."
    fi

    log_info "Gemini CLI 설치 중 (npm global)..."
    npm install -g @google/gemini-cli --quiet

    if command -v gemini &>/dev/null; then
        log_success "Gemini CLI 설치 완료"
    else
        log_warn "설치 후 PATH 미반영. 새 터미널에서 'gemini --version' 확인"
    fi

    echo ""
    log_info "Gemini CLI 사용법:"
    echo "   gemini             # Google 계정으로 자동 인증 후 시작"
    echo "   gemini -p '...'    # 프롬프트 직접 전달"
    echo ""
    log_info "API 키 방식 인증 (선택):"
    echo "   export GOOGLE_API_KEY='your-api-key'"
    echo "   키 발급: https://aistudio.google.com/apikey"
}

#───────────────────────────────────────────────────────────────────────────────
# 8-3. bkit 플러그인 설치 안내
# bkit은 Claude Code 내부 슬래시 명령으로만 설치 가능 (쉘 자동화 불가)
# 참고: https://github.com/popup-studio-ai/bkit-claude-code
#───────────────────────────────────────────────────────────────────────────────
setup_bkit_guide() {
    print_section "8-3. bkit 플러그인 설치 안내"

    log_warn "bkit은 Claude Code 실행 중 슬래시 명령으로 설치합니다 (쉘 자동화 불가)."
    echo ""
    echo "  ┌──────────────────────────────────────────────────────────────────┐"
    echo "  │               bkit 플러그인 설치 가이드 (v2.0.6)                │"
    echo "  ├──────────────────────────────────────────────────────────────────┤"
    echo "  │                                                                  │"
    echo "  │  사전 요구사항                                                   │"
    echo "  │    • Claude Code v2.1.78+  •  Node.js v18+                      │"
    echo "  │    • Claude Pro / Max / Teams / Enterprise 계정                  │"
    echo "  │                                                                  │"
    echo "  │  설치 절차                                                       │"
    echo "  │                                                                  │"
    echo "  │  1. 프로젝트 디렉토리에서 Claude Code 실행                       │"
    echo "  │     \$ cd ~/your-project && claude                               │"
    echo "  │                                                                  │"
    echo "  │  2. Marketplace 등록 (Claude Code 프롬프트에서)                  │"
    echo "  │     /plugin marketplace add popup-studio-ai/bkit-claude-code     │"
    echo "  │                                                                  │"
    echo "  │  3. bkit 설치                                                    │"
    echo "  │     /plugin install bkit                                         │"
    echo "  │                                                                  │"
    echo "  │  → 설치 완료: 37개 스킬, 32개 에이전트, 88개+ 라이브러리        │"
    echo "  │                                                                  │"
    echo "  │  참고: https://github.com/popup-studio-ai/bkit-claude-code       │"
    echo "  └──────────────────────────────────────────────────────────────────┘"
    echo ""

    # bkit 자동 업데이트 settings.json
    mkdir -p ~/.claude
    if [ -f ~/.claude/settings.json ]; then
        log_warn "~/.claude/settings.json 이미 존재. 자동 업데이트 설정을 건너뜁니다."
    else
        cat > ~/.claude/settings.json << 'EOF'
{
  "plugins": {
    "autoUpdate": true
  }
}
EOF
        log_success "~/.claude/settings.json 생성 완료 (자동 업데이트 활성화)"
    fi

    # Agent Teams 환경변수 (멀티 에이전트)
    if grep -q 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS' ~/.bashrc 2>/dev/null; then
        log_warn "Agent Teams 환경변수 이미 설정되어 있습니다."
    else
        echo 'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' >> ~/.bashrc
        log_success "Agent Teams 활성화 완료 (~/.bashrc)"
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# 8-4. gstack (Garry Tan's Claude Code 스킬 팩)
# 29개 슬래시 명령으로 가상 엔지니어링 팀 구성
# 필수 의존성: Bun v1.0+, Playwright Chromium (시스템 라이브러리 포함)
# 참고: https://github.com/garrytan/gstack
#───────────────────────────────────────────────────────────────────────────────
setup_gstack() {
    print_section "8-4. gstack 설치"

    echo "  Garry Tan's Claude Code 스킬 팩 — 29개 AI 슬래시 명령"
    echo "  Think → Plan → Build → Review → Test → Ship → Reflect"
    echo ""

    local GSTACK_DIR="$HOME/.claude/skills/gstack"

    if [ -d "$GSTACK_DIR" ]; then
        log_warn "이미 설치됨: $GSTACK_DIR"
        read -p "  최신 버전으로 재설치하시겠습니까? (y/N): " reinstall
        if [[ "$reinstall" =~ ^[Yy]$ ]]; then
            rm -rf "$GSTACK_DIR"
        else
            log_info "건너뜁니다."
            return
        fi
    fi

    # 사전 요구사항 확인
    if ! command -v git &>/dev/null; then
        log_error "git이 설치되어 있지 않습니다."
        return 1
    fi

    # Bun 설치 (gstack 필수 의존성)
    if ! command -v bun &>/dev/null; then
        log_info "Bun 설치 중 (gstack 필수 의존성)..."
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
        if ! grep -q '\.bun/bin' ~/.bashrc 2>/dev/null; then
            echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
        fi
        log_success "Bun 설치 완료: $(bun --version 2>/dev/null)"
    else
        log_success "Bun 이미 설치됨: $(bun --version)"
    fi

    # GitHub에서 클론
    log_info "gstack 클론 중 (GitHub → ~/.claude/skills/gstack)..."
    mkdir -p "$HOME/.claude/skills"
    git clone --single-branch --depth 1 \
        https://github.com/garrytan/gstack.git "$GSTACK_DIR"

    # Playwright Chromium 시스템 의존성 설치 (WSL Ubuntu 필수)
    # /browse, /qa 등 브라우저 스킬이 Playwright Chromium을 사용하며,
    # 시스템 라이브러리 없이는 setup 단계에서 실패함
    log_info "Playwright Chromium 시스템 의존성 설치 중..."
    (
        cd "$GSTACK_DIR"
        bunx playwright install-deps chromium 2>/dev/null || \
            sudo npx playwright install-deps chromium 2>/dev/null || \
            log_warn "Playwright 시스템 의존성 자동 설치 실패. 수동 실행 필요:"
    )

    # gstack setup 실행 (--no-prefix: 짧은 명령 이름 사용)
    if [ -x "$GSTACK_DIR/setup" ]; then
        log_info "gstack setup 실행 중 (빌드 + Chromium 설치 + 스킬 등록)..."
        (cd "$GSTACK_DIR" && ./setup --no-prefix)
        if [ $? -eq 0 ]; then
            log_success "gstack 설치 완료 (29개 스킬 활성화)"
        else
            log_error "gstack setup 실패."
            log_info "수동 재시도:"
            echo "   cd $GSTACK_DIR"
            echo "   bunx playwright install-deps chromium"
            echo "   ./setup --no-prefix"
            return 1
        fi
    else
        log_warn "setup 스크립트를 찾을 수 없습니다. 수동 설정이 필요할 수 있습니다."
        return 1
    fi

    echo ""
    log_info "주요 슬래시 명령:"
    echo "   /review           — 자동 코드 리뷰 + 버그 탐지"
    echo "   /qa               — 실제 브라우저 테스트 + 자동 수정"
    echo "   /ship             — CI·테스트·PR 자동화"
    echo "   /office-hours     — 제품 전략 리뷰"
    echo "   /plan-ceo-review  — 범위·실현 가능성 검토"
    echo "   /browse           — Chromium 브라우저 제어"
    echo "   /autoplan         — 자동 계획 수립"
    echo "   /cso              — 보안 검토"
    echo "   /gstack-upgrade   — gstack 최신 버전 업데이트"
    echo ""
    log_info "전체 목록: Claude Code에서 /gstack 입력"
    log_info "참고: https://github.com/garrytan/gstack"
}

#───────────────────────────────────────────────────────────────────────────────
# 9. Git 전역 설정
#───────────────────────────────────────────────────────────────────────────────
setup_git_config() {
    print_section "9-1. Git 전역 설정"

    log_info "Git 전역 설정을 입력합니다."
    echo ""

    # 현재 설정값 표시
    local cur_name cur_email
    cur_name=$(git config --global user.name 2>/dev/null || echo "")
    cur_email=$(git config --global user.email 2>/dev/null || echo "")

    if [[ -n "$cur_name" && -n "$cur_email" ]]; then
        log_warn "현재 Git 사용자 설정:"
        echo "   이름:  $cur_name"
        echo "   이메일: $cur_email"
        echo ""
        read -p "  다시 설정하시겠습니까? (y/N): " reconfig
        [[ ! "$reconfig" =~ ^[Yy]$ ]] && {
            log_info "기존 설정을 유지합니다."
            # 나머지 공통 설정은 항상 적용
            _apply_git_common_config
            return
        }
    fi

    # 이름 입력
    while true; do
        read -p "  Git 사용자 이름 (예: 홍길동): " git_name
        [[ -n "$git_name" ]] && break
        log_warn "이름을 입력해주세요."
    done

    # 이메일 입력
    while true; do
        read -p "  Git 이메일 주소 (예: user@example.com): " git_email
        [[ -n "$git_email" ]] && break
        log_warn "이메일을 입력해주세요."
    done

    git config --global user.name  "$git_name"
    git config --global user.email "$git_email"
    log_success "사용자 정보 설정 완료: $git_name <$git_email>"

    _apply_git_common_config
}

# Git 공통 설정 (사용자 정보 외)
_apply_git_common_config() {
    # CRLF 자동 변환 비활성화 (WSL ↔ Windows 줄 끝 문자 충돌 방지)
    git config --global core.autocrlf false

    # 기본 브랜치 이름
    git config --global init.defaultBranch stg

    # git pull 시 rebase 사용 (불필요한 머지 커밋 방지)
    git config --global pull.rebase true

    # 원격에서 삭제된 브랜치 자동 정리
    git config --global fetch.prune true

    # WSL 자격 증명 저장 (매번 비밀번호 입력 방지)
    git config --global credential.helper store

    log_success "Git 공통 설정 완료"
    echo ""
    echo "  적용된 설정:"
    echo "   core.autocrlf    = false  (CRLF 변환 안 함)"
    echo "   init.defaultBranch = stg  (기본 브랜치)"
    echo "   pull.rebase      = true   (rebase 방식 pull)"
    echo "   fetch.prune      = true   (삭제된 원격 브랜치 자동 정리)"
    echo "   credential.helper = store  (자격 증명 저장)"
}

#───────────────────────────────────────────────────────────────────────────────
# 10. 설치 완료 요약
#───────────────────────────────────────────────────────────────────────────────
print_summary() {
    print_section "설치 완료 요약"

    echo "  설치된 도구:"
    echo "  ─────────────────────────────────────────────────────"
    command -v node    &>/dev/null && echo "  Node.js:     $(node -v)"
    command -v npm     &>/dev/null && echo "  npm:         v$(npm -v)"
    command -v pnpm    &>/dev/null && echo "  pnpm:        v$(pnpm -v)"
    command -v python3 &>/dev/null && echo "  Python:      $(python3 --version | cut -d' ' -f2)"
    command -v docker  &>/dev/null && echo "  Docker:      $(docker --version | cut -d' ' -f3 | tr -d ',')"

    if command -v claude &>/dev/null; then
        echo "  Claude Code: $(claude --version 2>/dev/null || echo '설치됨')"
    else
        echo "  Claude Code: 설치됨 (source ~/.bashrc 후 확인)"
    fi

    command -v gemini  &>/dev/null && echo "  Gemini CLI:  설치됨"
    echo "  ─────────────────────────────────────────────────────"
    echo ""

    log_success "WSL Ubuntu 24.04 바이브코딩 환경 설정 완료!"
    echo ""

    log_warn "[필수] Docker 그룹 적용 (현재 세션):"
    echo "   newgrp docker"
    echo "   또는 Ubuntu 24.04 앱을 재시작하세요."
    echo ""

    log_info "[다음 단계] Claude Code 로그인:"
    echo "   source ~/.bashrc"
    echo "   cd ~/your-project && claude"
    echo "   → 브라우저에서 Claude 계정 인증 (유료 플랜 필요)"
    echo ""

    log_info "[다음 단계] bkit 플러그인 설치 (Claude Code 실행 후):"
    echo "   /plugin marketplace add popup-studio-ai/bkit-claude-code"
    echo "   /plugin install bkit"
    echo ""


    log_info "상세 가이드: guides/wsl-setup.md"

    # Docker 그룹 자동 적용 (현재 세션에 즉시 반영)
    if id -nG "$USER" 2>/dev/null | grep -qw docker; then
        if ! groups 2>/dev/null | grep -qw docker; then
            log_info "Docker 그룹을 현재 세션에 적용합니다..."
            exec sg docker -c "bash"
        fi
    fi
}

#───────────────────────────────────────────────────────────────────────────────
# 메인
#───────────────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║       WSL 바이브코딩 환경 자동 설정 스크립트                     ║"
    echo "║       Ubuntu 24.04 LTS (Noble Numbat) · 2026년 3월 기준          ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "사용자: $USER"
    log_info "홈 디렉토리: $HOME"
    echo ""
    read -p "계속 진행하시겠습니까? (Y/n): " proceed
    [[ "$proceed" =~ ^[Nn]$ ]] && { log_warn "설치 취소됨."; exit 0; }

    check_environment
    setup_system_update
    setup_sudoers
    setup_locale
    setup_essential_packages
    setup_nodejs
    setup_docker
    setup_data_directory
    setup_claude_code
    setup_gemini_cli
    setup_bkit_guide
    setup_gstack
    setup_git_config
    print_summary
}

main "$@"
