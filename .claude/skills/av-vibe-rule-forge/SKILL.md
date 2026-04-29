---
name: av-vibe-rule-forge
description: |
  Rule .md 생성 전담. paths 지연 로딩을 포함한 표준 규칙 파일을
  생성하고 레지스트리에 등록한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: vibe
tier: meta
argument-hint: "[name] [--group group] [--paths patterns]"
user-invocable: false
allowed-tools: [Read, Write, Edit, Glob, Grep, AskUserQuestion]
---

# av-vibe-rule-forge — 룰 생성 전담

## 생성 프로토콜

1. AskUserQuestion: 룰 이름, 그룹, 적용 경로(paths)
2. `.claude/rules/{name}.md` 생성
3. `paths:` 필드로 지연 로딩 설정 (공식 스펙)
4. components.json rules 섹션에 등록

## 필수 포함 필드

- `name`, `autovibe: true`, `version`, `created`, `group`
- `paths:` (배열 — 매칭 파일 열 때만 로드)
