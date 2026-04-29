---
name: av-base-sync-auditor
description: |
  CLAUDE.md 정합성 자동 검증 에이전트.
  CLAUDE.md와 실제 컴포넌트 상태의 불일치를 감지하고 수정한다.
  트리거: CLAUDE.md 변경 후 또는 컴포넌트 추가/삭제 후
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
domain: base
tools: [Read, Glob, Grep, Write, Edit, Agent]
model: sonnet
memory: project
maxTurns: 15
permissionMode: default
---

# av-base-sync-auditor — CLAUDE.md 정합성 검증

## 검증 항목

| 항목 | 비교 대상 |
|------|---------|
| 컴포넌트 수량 | CLAUDE.md vs components.json |
| 스킬 목록 | CLAUDE.md vs .claude/skills/ |
| 에이전트 목록 | CLAUDE.md vs .claude/agents/ |
| 훅 목록 | CLAUDE.md vs settings.json |

## bkit:design-validator 연동

CLAUDE.md 또는 docs/ 변경 감지 시 design-validator를 함께 실행한다:

```
1. 변경된 문서 수집 (docs/**/*.md, CLAUDE.md)
2. Agent("bkit:design-validator", { docs_dir: ".claude/docs", strict: false })
3. 실패 항목을 Issue 포맷으로 출력:
   - [ ] {문서명}: {불일치 항목}
4. --fix 플래그 시 자동 수정 시도
```
