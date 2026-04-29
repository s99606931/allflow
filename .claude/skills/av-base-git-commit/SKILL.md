---
name: av-base-git-commit
description: |
  git 커밋 자동화. 변경 내용 분석 → Conventional Commits 메시지 생성 → 커밋.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
argument-hint: "commit [message] [--amend]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash]
---

# av-base-git-commit — git 커밋 자동화

## 실행 프로토콜

1. `git status` + `git diff` 분석
2. Conventional Commits 형식 메시지 생성
3. `git add` + `git commit`
4. av-base-auditor Level 1 Self-Check
