---
name: av-docs-guard
description: |
  문서 디렉토리 무결성 감시. docs/ 하위 문서의 일관성과 완성도를 검증한다.
  bkit:design-validator를 활용하여 Design 문서를 검증한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
argument-hint: "check [--fix]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Write, Edit, Task]
paths:
  - "docs/**"
---

# av-docs-guard — 문서 디렉토리 감시

## 검증 항목

1. PRD ↔ Plan ↔ Design 상호 참조 일치
2. Design 문서 완성도 → `Agent("bkit:design-validator", ...)`
3. 문서 내 깨진 링크 탐지
4. 날짜/버전 불일치 감지
