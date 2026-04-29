---
name: av-vibe-skill-forge
description: |
  SKILL.md 생성 전담. 공식 frontmatter 필드(context:fork, paths, $ARGUMENTS 등)를
  포함한 표준 스킬 파일을 생성하고 레지스트리에 등록한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: vibe
tier: meta
argument-hint: "[name] [--group group] [--context fork]"
user-invocable: false
allowed-tools: [Read, Write, Edit, Glob, Grep, AskUserQuestion]
---

# av-vibe-skill-forge — 스킬 생성 전담

## 생성 프로토콜

1. AskUserQuestion: 스킬 이름, 역할, 그룹
2. `.claude/skills/{name}/` 디렉토리 생성
3. SKILL.md 생성 (공식 frontmatter 완전 형식)
4. reference.md 생성 (Supporting Files)
5. components.json skills 섹션에 등록
6. `_meta.total.skills` 증가

## 필수 포함 공식 필드

- `name`, `description`, `argument-hint`, `user-invocable`
- `allowed-tools`, `autovibe: true`, `version`, `created`, `group`
- 선택: `context: fork`, `agent`, `paths`, `model`, `effort`
- 문자열 치환: `$ARGUMENTS`, `${CLAUDE_SKILL_DIR}` 안내
