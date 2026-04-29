---
name: av-base-plugin-routing
autovibe: true
version: "2.0"
created: "2026-03-29"
updated: "2026-04-27"
group: base
paths:
  - ".claude/agents/**"
  - ".claude/skills/**"
  - ".claude/rules/**"
---

# av-base-plugin-routing — 생태계 3축 플러그인 라우팅 규칙

> AutoVibe 생태계의 3축(Claude Code + gstack + bkit)이 상호 보완하여 AI 개발 생명주기를 완성한다.
> 에이전트/스킬이 각 플러그인을 호출하는 라우팅 규칙을 정의한다.
> **v2.0 변경**: `Task(...)` → `Agent(...)` 표기 통일, paths 스코프 추가, pdca-iterator 자동 트리거 명시

## 생태계 3축 정의

| 축 | 정체성 | 핵심 역할 | PDCA 매핑 |
|----|--------|----------|----------|
| **Claude Code** | Anthropic AI 런타임 엔진 | Agent Teams 실행, 코드 생성, Hook 이벤트, 메모리 | 전 단계 (실행 기반) |
| **gstack** | Fast Headless Browser | 페이지 탐색, E2E 테스트, 스크린샷, 인터랙션, 벤치마크 | Do·Check (시각적 검증) |
| **bkit** | Vibecoding Kit 플러그인 | PDCA 문서, Gap 분석, 코드 분석, QA 모니터링, 자동 개선 | Plan·Check·Act (품질 보증) |

### 3축 상호 보완 원칙

1. **Claude Code가 생각하고 만든다** — AI 추론 + 코드 생성
2. **gstack이 보고 확인한다** — 브라우저 렌더링 + E2E 테스트
3. **bkit이 측정하고 개선한다** — Match Rate + 자동 반복
4. **av가 3축을 `/av {자연어}` 하나로 통합한다** — 사용자는 플러그인을 몰라도 됨

## gstack (시각적 검증) — 7단계 생명주기

| 단계 | 요청 의도 | gstack 호출 | 담당 |
|------|-----------|------------|------|
| Think | 레퍼런스 탐색 | `Skill("gstack", "navigate {url}")` | PM |
| Plan | UI 레퍼런스 수집 | `Skill("gstack", "screenshot {ref}")` | PL |
| Build | 실시간 구현 확인 | `Skill("gstack", "navigate localhost:{port}")` | Agent Team |
| Review | 시각적 회귀 탐지 | `Skill("gstack", "screenshot {pages}")` | PL |
| Test | 브라우저 E2E | `Skill("gstack", "check-errors {url}")` | QA Agent |
| Test | 인터랙션 테스트 | `Skill("gstack", "interact {selector}")` | QA Agent |
| Ship | 카나리 배포 모니터링 | `Skill("canary", ...)` | PL |
| Reflect | 성능 기준선 비교 | `Skill("benchmark", ...)` | Memory Keeper |

## bkit (품질 보증) — 전 PDCA 주기

> **표기 원칙** (CC v2.1.63+): `Agent(...)` 사용. `Task(...)`는 별칭으로 동작하나 신규 작성 금지.

| 요청 의도 | bkit 호출 | 담당 | 트리거 |
|-----------|----------|------|--------|
| PRD/Plan 작성 | `Skill("bkit:pdca", "plan {feature}")` | PM → PL | 수동 |
| Design 작성 | `Skill("bkit:pdca", "design {feature}")` | PL | 수동 |
| Report 작성 | `Skill("bkit:pdca", "report {feature}")` | PL | PM 최종 승인 후 자동 |
| 코드 품질 분석 | `Agent("bkit:code-analyzer", ...)` | Auditor | 구현 완료 후 자동 |
| 설계-구현 갭 검증 | `Agent("bkit:gap-detector", ...)` | PL | PR 승인 게이트 자동 |
| 런타임 QA | `Agent("bkit:qa-monitor", ...)` | QA Agent | av-base-post-qa 호출 시 |
| 자동 개선 루프 | `Agent("bkit:pdca-iterator", ...)` | PL | gap < 90% 시 **자동 트리거** |
| Design 검증 | `Agent("bkit:design-validator", ...)` | Sync-Auditor | CLAUDE.md/docs 변경 후 자동 |

### pdca-iterator 자동 트리거 조건

```
PL 검증 프로토콜에서:
match_rate = Agent("bkit:gap-detector").result.match_rate
IF match_rate < 0.90:
  Agent("bkit:pdca-iterator", { target: 0.90, max_iterations: 2 })
  재측정 → 90% 미달 시 PM에 보고
```

### bkit 도메인 에이전트 사용 정책

bkit의 cto-lead, frontend-architect 등 도메인 에이전트는 av-base-* 에이전트와 책임이 중복된다.
**정책: av 에이전트가 우선. bkit 도메인 에이전트는 호출하지 않는다.**
단, 프로젝트 도메인 특화 에이전트 신설 시 bkit 에이전트 정의를 참고 패턴으로만 활용.

## Claude Code (AI 런타임) — av 실행 기반

| 요청 의도 | Claude Code 기능 | 담당 | 비고 |
|-----------|-----------------|------|------|
| 에이전트 실행 | `Agent("av-pm-coordinator", ...)` | av 게이트웨이 | initialPrompt 자동 실행 |
| Team 스폰 | Agent Teams API | PL | `isolation: worktree` 옵션 |
| 코드 생성 | Read, Write, Edit, Bash | Agent Team | — |
| 이벤트 처리 | Hook (UserPromptSubmit, PostToolUse, SessionStart) | 자동 | — |
| 영구 학습 | `memory: project` → `.claude/agent-memory/` | 에이전트 자동 | — |

## 라우팅 원칙

1. 에이전트는 이 규칙에 따라 3축 플러그인을 직접 호출한다
2. 사용자는 `/av {자연어}` 하나만 입력 — av가 최적 플러그인 자동 선택
3. PM/PL/Agent가 각자 역할에 따라 Claude Code/gstack/bkit을 호출
4. 플러그인 세부 명령어는 av 컴포넌트 내부에 캡슐화 (사용자 노출 최소화)
5. 3축 중 하나라도 빠지면 해당 PDCA 단계의 자동화 품질이 저하된다
6. **Agent() > Task() 표기** — Task는 별칭으로 유효하나 신규 작성 시 Agent() 사용

## PM 팀 트리거 (`/av pm team`)

사용자가 `/av pm team {요구사항}`으로 시작하면 **항상** 다음 라우트를 따른다:

```
/av pm team {요구사항}
  → Skill("av-pm-team", "{요구사항}")
     ├─ STEP 1: Agent("av-pm-coordinator")           # 요구사항 도출
     ├─ STEP 2: Agent("av-vibe-vibecoder")          # 갭 분석 → vibe-forge로 누락 컴포넌트 자동 생성
     ├─ STEP 3: Agent("av-do-orchestrator")          # 팀 구성 (Lead/BE/FE/QA/Memory)
     ├─ STEP 4: 팀원 병렬 스폰 (단일 메시지 다중 Agent)
     ├─ STEP 5: Agent("bkit:gap-detector") + 필요 시 pdca-iterator
     └─ STEP 6: PM 승인 → bkit:pdca report → memory-keeper 학습 보존
```

핵심 원칙:
- **memory-keeper는 항상 팀에 포함** → 작업과 동시에 프로젝트 학습 누적
- **누락 컴포넌트 자동 생성** → vibe-forge 위임 (사용자 개입 없음)
- **병렬 우선** → 의존성 없는 팀원은 동일 메시지에서 동시 스폰
