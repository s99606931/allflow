# AutoVibe

> **AI 네이티브 자기 성장형 개발 생태계**
> 파일 복사 없이, 대화만으로 나만의 AI 에이전트 생태계를 만드세요.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-v2.1.71+-blue)](https://claude.ai/code)
[![bkit](https://img.shields.io/badge/bkit-PDCA_Plugin-green)](#사전-요구사항)

---

## AutoVibe란?

AutoVibe는 **Claude Code + bkit PDCA** 위에서 동작하는 AI 에이전트 생태계 프레임워크입니다.

기존 방식은 설정 파일을 복사하고 수작업으로 설정을 맞추는 번거로운 작업이 필요했습니다.
AutoVibe는 다릅니다. **사용자와 Claude의 대화**를 통해 프로젝트에 꼭 맞는 생태계가 점진적으로 성장합니다.

```
기존 방식:  .claude/ 파일 복사 → 수작업 설정 → 오류 수정 → 반복...
AutoVibe:   Claude에게 말하기 → 대화로 설계 → 자동 생성 → 점진적 성장
```

---

## 핵심 개념: PDCA 기반 점진적 성장

```mermaid
flowchart LR
    A["💬 사용자 요청\n'Phase 0 시작해줘'"] --> B["📋 Plan\n목표·범위·기준 수립"]
    B --> C["🎨 Design\n상세 설계 명세"]
    C --> D["⚙️ Do\n컴포넌트 자동 생성"]
    D --> E["✅ Check\nG1~G3 품질 검증"]
    E --> F{"매칭률\n≥90%?"}
    F -- "아니오" --> D
    F -- "예" --> G["📄 Report\n완료 보고서"]
    G --> H["🔄 다음 Phase\n반복 성장"]
```

각 Phase는 독립적인 PDCA 사이클로 실행됩니다. 실패해도 해당 Phase만 재시도하면 됩니다.

---

## 3개 핵심 문서로 동작합니다

AutoVibe는 Claude Code가 읽고 실행할 수 있는 3개의 문서로 구성됩니다:

```mermaid
graph TD
    P["📌 PRD\nav-ecosystem-pdca-driven.prd.md"]
    PL["📋 Plan\nav-ecosystem-pdca-driven-*.md"]
    D["🗺️ Design Spec\nav-ecosystem-design-spec.md"]

    P -- "요구사항·성공기준 정의" --> PL
    PL -- "Phase별 실행 계획 수립" --> D
    D -- "컴포넌트 형식·템플릿·시나리오 제공" --> CC["Claude Code + bkit\n자동 실행"]
```

| 문서 | 역할 | 주요 내용 |
|------|------|---------|
| **PRD** | 무엇을 만들 것인가 | 요구사항, 컴포넌트 인벤토리, 성공 기준 |
| **Plan** | 어떤 순서로 만들 것인가 | Phase 0~6 실행 계획, bkit 명령어 |
| **Design Spec** | 어떻게 만들 것인가 | 파일 형식 템플릿, 실행 시나리오, 기술 스택 가이드 |

---

## 생태계 아키텍처

```mermaid
graph TD
    subgraph "Layer 3 — 사용자 인터페이스"
        AV["/av {자연어}\n마스터 게이트웨이"]
        PM["/av-pm start {feature}\nPM 인터페이스"]
    end

    subgraph "Layer 2 — 오케스트레이션"
        FORGE["/av-vibe-forge\n마스터 오케스트레이터"]
        SF["av-vibe-skill-forge\n스킬 생성"]
        AF["av-vibe-agent-forge\n에이전트 생성"]
        HF["av-vibe-hook-forge\n훅 생성"]
        RF["av-vibe-rule-forge\n룰 생성"]
    end

    subgraph "Layer 1 — Base 컴포넌트"
        AUD["av-base-auditor\n품질 감사"]
        OPT["av-base-optimizer\n생태계 최적화"]
        QA["av-base-code-quality\n코드 품질"]
        GIT["av-base-git-commit\ngit 자동화"]
    end

    subgraph "Layer 0 — 인프라"
        REG[".claude/registry/\ncomponents.json"]
        RULES[".claude/rules/\n규칙 파일"]
        HOOKS[".claude/hooks/\n훅 스크립트"]
        MEM[".claude/agent-memory/\nMEMORY.md"]
    end

    AV --> FORGE
    PM --> FORGE
    FORGE --> SF & AF & HF & RF
    SF & AF --> AUD & OPT & QA & GIT
    AUD & OPT & QA & GIT --> REG & RULES & HOOKS & MEM
```

---

## Phase별 구축 계획

```mermaid
flowchart TD
    P0["🏗️ Phase 0\n기반 인프라\n.claude/ 구조 + Registry + CLAUDE.md"]
    P1["📜 Phase 1\nBase Rules 4종\n규칙 파일 생성"]
    P2["🤖 Phase 2\nBase Agents 8종\n범용 에이전트 생성"]
    P3["🔧 Phase 3\nMeta Skills 6종\nForge 도구 생성"]
    P4["⚡ Phase 4\nCore Skills 10종\n핵심 스킬 생성"]
    P5["🔗 Phase 5\nHooks 5종\n자동화 훅 등록"]
    P6["🌱 Phase 6\n도메인 확장 (무한)\n대화로 계속 성장"]

    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6
    P6 -- "새 도메인 추가 시" --> P6

    style P0 fill:#4a5568
    style P6 fill:#2d6a4f
```

| Phase | 목표 | 생성 컴포넌트 수 | 누적 합계 |
|-------|------|:--------------:|:--------:|
| **0** | 기반 인프라 (.claude/ 구조) | 5개 파일 | 5 |
| **1** | Base Rules | 4개 Rule | 9 |
| **2** | Base Agents | 8개 Agent | 17 |
| **3** | Meta Skills / Forge | 6개 Skill | 23 |
| **4** | Core Skills | 10개 Skill | 33 |
| **5** | Hooks & Settings | 5개 Hook | 38 |
| **6** | 도메인 확장 | 무제한 | ∞ |

---

## 완성 후 주요 기능

### `/av {자연어}` — 지능형 라우팅 게이트웨이

자연어로 말하면 Claude가 최적의 에이전트/스킬을 자동으로 선택합니다.

```
사용자: "주문 관리 백엔드 API 구현해줘"
→ Claude: ecom-order-backend 에이전트로 라우팅

사용자: "코드 품질 검사해줘"
→ Claude: av-base-auditor Level 2 실행

사용자: "새 결제 도메인 에이전트 만들어줘"
→ Claude: /av-vibe-forge agent payment-lead 실행
```

```mermaid
flowchart LR
    U["💬 자연어 요청"] --> AV["🎯 /av 게이트웨이"]
    AV --> C1{"의도 분류"}
    C1 -- "구현" --> D1["av-do-orchestrator"]
    C1 -- "품질" --> D2["av-base-auditor"]
    C1 -- "생성" --> D3["av-vibe-forge"]
    C1 -- "PM" --> D4["av-pm"]
    C1 -- "기타" --> D5["AskUserQuestion\n대화로 확인"]
```

### `/av-pm start {feature}` — PM 대화형 인터페이스

새 기능 개발을 PM처럼 체계적으로 시작합니다.

```
사용자: "주문 환불 기능이 필요해"

Claude (PM 역할):
  1. 3라운드 질문으로 요구사항 파악
     - "어떤 환불 정책이 필요한가요?"
     - "백엔드만? 아니면 UI도 필요한가요?"
     - "완료 기준은 무엇인가요?"
  2. PRD 문서 자동 생성
  3. 전담 에이전트 팀 구성 (Lead + Backend + Frontend)
  4. 병렬 구현 시작 (isolation:worktree)
```

### `/av-vibe-forge` — 생태계 관리 오케스트레이터

| 명령어 | 역할 |
|--------|------|
| `/av-vibe-forge skill {name}` | 새 스킬 생성 + 레지스트리 자동 등록 |
| `/av-vibe-forge agent {name}` | 새 에이전트 생성 + MEMORY.md 초기화 |
| `/av-vibe-forge hook PostToolUse {name}` | 훅 스크립트 생성 + settings.json 등록 |
| `/av-vibe-forge rule {name}` | 규칙 파일 생성 + 레지스트리 등록 |
| `/av-vibe-forge health` | 생태계 건강도 0~100점 보고서 |
| `/av-vibe-forge list` | 전체 컴포넌트 목록 |
| `/av-vibe-forge validate` | 파일 무결성 검증 |

---

## Phase 6: 도메인 확장 — 무한 성장

기반 생태계 구축 후, 대화만으로 도메인 에이전트를 계속 추가할 수 있습니다.

```mermaid
sequenceDiagram
    participant U as 사용자
    participant PM as av-pm (PM)
    participant F as av-vibe-forge
    participant AV as /av 게이트웨이

    U->>PM: "이커머스 주문 도메인이 필요해"
    PM->>U: AskUserQuestion (요구사항 3라운드)
    U->>PM: 답변 (범위, 스택, 완료기준)
    PM->>PM: PRD 생성
    PM->>F: /av-vibe-forge agent ecom-order-lead
    PM->>F: /av-vibe-forge agent ecom-order-backend
    PM->>F: /av-vibe-forge skill ecom-order-impl
    F->>AV: ROUTING_TABLE에 ecom 경로 추가
    Note over AV: /av run "주문 환불 처리" → ecom-order-lead 자동 라우팅
```

---

## 기술 스택 호환성

AutoVibe는 특정 기술 스택에 종속되지 않습니다. Design Spec에 주요 스택별 커스터마이즈 가이드가 포함되어 있습니다.

| 기술 스택 | 빌드 도구 | 품질 도구 | 에이전트 스코프 |
|-----------|---------|---------|--------------|
| NestJS + Next.js | pnpm + turbo | Biome | `src/**/*.ts` |
| FastAPI + React | uv + vite | Ruff + mypy | `**/*.py`, `src/**/*.tsx` |
| Django + React | pip + webpack | flake8 + ESLint | `**/*.py`, `frontend/**` |
| Go + React | go build | golint + ESLint | `**/*.go`, `web/**` |
| Rails + Vue | bundler + vite | RuboCop + ESLint | `**/*.rb`, `app/javascript/**` |

---

## 네이밍 컨벤션

모든 AutoVibe 컴포넌트는 엄격한 네이밍 규칙을 따릅니다:

```
av-{도메인}-{이름}
 │    │        └─ kebab-case, 최대 2단어 (도메인 제외)
 │    └─ base (범용필수) | vibe (메타) | util (범용선택) | {프로젝트명} (특화)
 └─ AutoVibe 생태계 마커 (필수)

전체 최대 4단어 (하이픈 구분 기준):
  av-base-auditor       (3단어) ✅  base 도메인, 감사 에이전트
  av-vibe-forge         (3단어) ✅  vibe 도메인, forge 오케스트레이터
  av-base-code-quality  (4단어) ✅  base 도메인, 코드 품질 스킬  ← 최대
  av-ecom-order-lead    (4단어) ✅  ecom 도메인, 주문 Lead 에이전트
```

> 상세 네이밍 규칙과 Phase 0~5 전체 컴포넌트 이름 목록은 [guides/naming-guide.md](guides/naming-guide.md)를 참조하세요.

---

## 프로젝트 구조

```
autovibe/
├── README.md                                    ← 이 문서
├── LICENSE                                      ← MIT 라이선스
├── CONTRIBUTING.md                              ← 기여 가이드
├── docs/
│   ├── prd/
│   │   └── av-ecosystem-pdca-driven.prd.md      ← 요구사항 정의서
│   ├── plan/
│   │   └── av-ecosystem-pdca-driven-*.md        ← PDCA Phase 계획서
│   └── design/
│       └── av-ecosystem-design-spec.md           ← 완전 구현 명세서
└── guides/
    ├── getting-started.md                       ← Phase별 단계 가이드
    ├── quick-start-30min.md                     ← 30분 퀵스타트 타임라인
    ├── naming-guide.md                          ← 컴포넌트 네이밍 완전 가이드
    ├── phase-progression.md                     ← Phase GO/NO-GO 기준 및 롤백
    ├── bkit-integration.md                      ← bkit 플러그인 연동 가이드
    └── cc-official-docs.md                      ← Claude Code 공식 문서 참조
```

---

## 빠른 시작

### 사전 요구사항

| 도구 | 버전 | 확인 방법 |
|------|------|---------|
| Claude Code CLI | v2.1.71+ | `claude --version` |
| bkit 플러그인 | 최신 | `/bkit` (Claude Code 내) |
| git | 2.x+ | `git --version` |

### 30분 빠른 시작

AutoVibe는 **파일 복사 없이 대화로** 시작합니다.

**Step 1: AutoVibe 저장소를 클론**

```bash
git clone https://github.com/s99606931/autovibe.git
cd my-project   # 내 프로젝트 디렉토리로 이동
claude          # Claude Code 실행
```

**Step 2: Claude에게 한 마디**

```
AutoVibe 생태계를 구축하고 싶어. Phase 0부터 시작해줘.
```

Claude가 자동으로:
- 프로젝트 이름, 기술 스택, 도메인을 물어봅니다
- `.claude/` 디렉토리 구조를 생성합니다
- 단계별로 안내합니다

> 30분 안에 Phase 0 완료를 목표로 합니다.
>
> | 가이드 | 설명 |
> |--------|------|
> | [quick-start-30min.md](guides/quick-start-30min.md) | 분 단위 타임라인 퀵스타트 |
> | [getting-started.md](guides/getting-started.md) | Phase별 단계 상세 가이드 |
> | [naming-guide.md](guides/naming-guide.md) | 컴포넌트 네이밍 완전 가이드 |
> | [phase-progression.md](guides/phase-progression.md) | Phase GO/NO-GO 기준 및 롤백 |

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **대화 우선** | 모든 컴포넌트는 스크립트가 아닌 대화로 생성 |
| **PDCA 사이클** | Plan → Design → Do → Check → Report 반복 |
| **점진적 성장** | Phase 0~2 소규모 시작 → Phase 6+ 무한 확장 |
| **스택 무관** | 어떤 기술 스택에도 커스터마이즈 적용 가능 |
| **자기 학습** | 각 에이전트/스킬의 MEMORY.md가 시간이 지날수록 개선 |

---

## 기여하기

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

주요 기여 영역:
- 신규 기술 스택 커스터마이즈 가이드 (Rails, Laravel, Spring Boot 등)
- 도메인별 Phase 6 템플릿 (이커머스, SaaS, 헬스케어 등)
- 훅 스크립트 개선
- 번역 (영어, 일본어, 중국어 등)

---

## 라이선스

MIT License — [LICENSE](LICENSE) 참조

---

## 기반 기술

- [Claude Code](https://claude.ai/code) by Anthropic
- [bkit](https://github.com/anthropics/claude-code) PDCA 플러그인
- PDCA 방법론 (Plan-Do-Check-Act)
