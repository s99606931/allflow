---
name: av-pm
description: |
  PM 대화형 인터페이스. 사용자와 대화하여 요구사항을 도출하고
  bkit:pdca 스킬로 PRD를 작성한다. gstack으로 레퍼런스를 탐색한다.
autovibe: true
version: "2.0"
created: "2026-03-29"
group: base
argument-hint: "start {feature}"
user-invocable: true
allowed-tools: [Read, Write, Edit, AskUserQuestion, Skill, Agent]
context: fork
agent: general-purpose
model: opus
effort: max
---

# av-pm — PM 대화형 인터페이스

> `/av-pm start {feature}` — PM 에이전트로 사용자 대화 → PRD 작성

## 인자

- `$1` = feature 이름

## 실행 프로토콜

1. `Agent("av-pm-coordinator")` 스폰
2. PM이 사용자와 AskUserQuestion 대화 (최대 6개 질문)
3. 요구사항 확정 → `Skill("bkit:pdca", "plan $1")` PRD 작성
4. PRD를 PL에게 전달 → `Agent("av-do-orchestrator")`
