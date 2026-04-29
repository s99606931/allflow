---
name: av-vibe-agent-forge
description: |
  AGENT.md 생성 전담. 공식 frontmatter 필드(memory, maxTurns, permissionMode 등)를
  포함한 표준 에이전트 파일을 생성하고 레지스트리에 등록한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: vibe
tier: meta
argument-hint: "[name] [--group group] [--model model]"
user-invocable: false
allowed-tools: [Read, Write, Edit, Glob, Grep, AskUserQuestion]
---

# av-vibe-agent-forge — 에이전트 생성 전담

## 생성 프로토콜

1. AskUserQuestion: 에이전트 이름, 역할, 모델, 그룹
2. `.claude/agents/{name}.md` 생성 (공식 frontmatter 완전 형식)
3. `memory: project` 설정 → `.claude/agent-memory/{name}/` 자동 관리
4. components.json agents 섹션에 등록
5. `_meta.total.agents` 증가

## 필수 포함 공식 필드

- `name`, `description` (필수)
- `tools`, `model`, `memory: project`, `maxTurns`, `permissionMode` (권장)
- `autovibe: true`, `version`, `created`, `group` (av 필수)
- 선택: `disallowedTools`, `effort`, `isolation`, `background`
