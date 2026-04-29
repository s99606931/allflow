---
name: av
description: |
  AutoVibe 마스터 게이트웨이. 자연어 요청 → 최적 컴포넌트 자동 선정 → 위임 실행.
  PM/PL 조직 라우팅 + gstack(실행·테스트) + bkit(문서) 통합.
autovibe: true
version: "2.0"
created: "2026-03-29"
group: base
argument-hint: "run|find|optimize|health|stats [args]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, Task, Agent, Skill]
---

# av — AutoVibe 마스터 게이트웨이

> `/av {자연어}` — 사용자 자연어 요청을 분석하여 최적 컴포넌트로 라우팅

## ROUTING_TABLE

```
# === 조직 라우팅 (PM / PL) ===
pm team + {요구사항}
  → Skill("av-pm-team", "{요구사항}")    # 팀 구성 + 병렬 + 자동 학습

pm + feature/requirement/prd/요구사항/기능정의
  → Agent("av-pm-coordinator")

plan + design/implement/build/구현/설계
  → Agent("av-do-orchestrator")

# === gstack 라우팅 (7단계 생명주기) ===
think + research/reference/탐색/조사
  → Skill("gstack", "navigate {url}")

build + check/preview/확인/미리보기
  → Skill("gstack", "navigate localhost:{port}")

review + visual/screenshot/스크린샷
  → Skill("gstack", "screenshot {page}")

test + browser/e2e/ui/테스트/브라우저
  → Skill("gstack", "check-errors {url}")

test + interaction/click/form/인터랙션
  → Skill("gstack", "interact {selector}")

ship + deploy/canary/배포/카나리
  → Skill("canary", ...)

reflect + benchmark/performance/성능
  → Skill("benchmark", ...)

# === bkit 라우팅 (문서 관리) ===
document + plan/design/report/문서/보고서
  → Skill("bkit:pdca", "{type} {feature}")

analyze + gap/verify/검증/갭
  → Agent("bkit:gap-detector", ...)

analyze + code/security/quality/품질/보안
  → Agent("bkit:code-analyzer", ...)
  → Agent("av-base-auditor", "Level 2")

analyze + runtime/logs/로그/런타임
  → Agent("bkit:qa-monitor", ...)

# === 기존 라우팅 ===
creation + any → Skill("av-vibe-forge", "skill {name}")
optimization + refactor → Skill("av-base-refactor", "analyze {target}")
optimization + token/component → Agent("av-base-optimizer", "{mode} {target}")
configuration + commit/git → Skill("av-base-git-commit", "commit {message}")
configuration + sync/claude-md → Skill("av-base-sync", "update")
meta-management + create + skill → Skill("av-vibe-forge", "skill {name}")
meta-management + create + agent → Skill("av-vibe-forge", "agent {name}")
meta-management + health → Skill("av-vibe-forge", "health")
testing + quality/lint/build → Skill("av-base-code-quality", "{target}")
memory + recall/search/기억 → Agent("av-base-memory-keeper")

[fallback]
  → AskUserQuestion으로 선택지 제시
```
