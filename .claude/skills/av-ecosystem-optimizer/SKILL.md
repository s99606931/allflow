---
name: av-ecosystem-optimizer
description: |
  생태계 주기적 최적화. 토큰 사용량, 컴포넌트 중복, 메모리 크기를 분석하고 개선한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: vibe
argument-hint: "run [--report-only]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Glob, Grep, Task]
---

# av-ecosystem-optimizer — 생태계 최적화

## 최적화 항목

1. CLAUDE.md 크기 확인 (200줄 이하)
2. Rule 파일 크기 확인 (paths 지연 로딩 활용)
3. MEMORY.md 크기 확인 (200줄 이하)
4. 중복 컴포넌트 탐지
5. 미사용 컴포넌트 탐지
