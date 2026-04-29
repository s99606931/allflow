---
name: av-vibe-hook-forge
description: |
  Hook 셸 스크립트 생성 전담. 공식 이벤트 타입(SubagentStart/Stop, ConfigChange 등)을
  포함한 표준 훅 파일을 생성하고 settings.json에 등록한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: vibe
tier: meta
argument-hint: "[event-type] [name]"
user-invocable: false
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion]
---

# av-vibe-hook-forge — 훅 생성 전담

## 생성 프로토콜

1. AskUserQuestion: 이벤트 타입, 훅 이름, 매처
2. `.claude/hooks/{name}.sh` 생성 (공통 헤더 포함)
3. `chmod +x` 실행 권한 부여
4. `.claude/settings.json` 훅 등록
5. components.json hooks 섹션에 등록

## 지원 공식 이벤트

SessionStart, UserPromptSubmit, PreToolUse, PostToolUse,
PostToolUseFailure, PermissionRequest, Stop,
SubagentStart, SubagentStop, ConfigChange, FileChanged, CwdChanged
