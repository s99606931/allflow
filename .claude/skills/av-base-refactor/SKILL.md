---
name: av-base-refactor
description: |
  리팩토링 스킬. 코드 분석 → 리팩토링 기회 탐지 → 제안 또는 실행.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
argument-hint: "analyze|apply {target}"
user-invocable: true
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Task]
---

# av-base-refactor — 리팩토링 스킬

## 서브커맨드

| 커맨드 | 설명 |
|--------|------|
| `analyze {target}` | 리팩토링 기회 분석 + 제안 |
| `apply {target}` | 승인된 리팩토링 실행 |
