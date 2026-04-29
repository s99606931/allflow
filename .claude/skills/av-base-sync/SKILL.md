---
name: av-base-sync
description: |
  CLAUDE.md 자동 최신화. 컴포넌트 변경 시 CLAUDE.md를 동기화한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
argument-hint: "update [--check]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# av-base-sync — CLAUDE.md 자동 최신화

## 실행 프로토콜

1. components.json 읽기 → 현재 컴포넌트 수량
2. CLAUDE.md 읽기 → 기존 수량 비교
3. 불일치 시 CLAUDE.md 업데이트
4. `--check`: 변경 필요 여부만 보고 (수정 안 함)
