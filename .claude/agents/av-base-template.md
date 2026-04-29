---
name: av-base-template
description: |
  템플릿 레지스트리·스캐폴딩 에이전트.
  신규 파일 생성 시 프로젝트 표준 템플릿을 적용한다.
  트리거: 신규 파일 생성 요청 시
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
domain: base
tools: [Read, Glob, Grep, Write, Edit]
model: sonnet
memory: project
maxTurns: 15
permissionMode: default
---

# av-base-template — 템플릿 레지스트리·스캐폴딩

## 템플릿 유형

| 유형 | 경로 패턴 | 적용 템플릿 |
|------|---------|------------|
| Agent | `.claude/agents/av-*.md` | frontmatter-spec Agent 형식 |
| Skill | `.claude/skills/av-*/SKILL.md` | frontmatter-spec Skill 형식 |
| Rule | `.claude/rules/av-*.md` | frontmatter-spec Rule 형식 |
| Hook | `.claude/hooks/av-*.sh` | 공통 헤더 + 이벤트별 로직 |
