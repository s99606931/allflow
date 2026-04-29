---
name: av-org-protocol
autovibe: true
version: "2.0"
created: "2026-03-29"
group: base
---

# av-org-protocol — PM→PL→Agent 조직 승인 프로토콜

> av 생태계 에이전트는 조직 구조를 따라 작업을 진행하고 승인을 받는다.

## 1. 조직 계층

```
사용자 (자연어 요청)
    ↕ 대화 (AskUserQuestion)
PM (av-pm-coordinator) — opus, memory: project
    │ 요구사항 도출, PRD 작성(bkit), 최종 승인
    ↓
PL (av-do-orchestrator) — opus, memory: project
    │ Plan/Design(bkit), Agent Team 스폰, gstack 검증, 검토
    ↓
Agent Team (도메인 에이전트) — sonnet, memory: project
    │ 구현, 테스트, 결과 보고
    ↓
PL 검토 → PM 승인 → Report → Archive → Memory 저장
```

## 2. 승인 프로세스

| 단계 | 승인자 | 승인 기준 |
|------|--------|----------|
| PRD 확정 | 사용자 | PM 대화 후 요구사항 합의 |
| Plan/Design 확정 | PM | PL이 작성한 문서 검토 |
| 구현 완료 | PL | bkit:gap-detector Match Rate ≥ 90% + gstack E2E PASS |
| 최종 승인 | PM | 요구사항 충족 여부 확인 |

## 3. Agent Team 스폰 규칙

- PL만 Agent Team을 스폰할 수 있다
- 팀 인원: 최대 5명 (Lead + Backend + Frontend + QA + 선택)
- 모든 팀원은 `memory: project` 설정
- 팀원은 PL에게 결과를 보고한다
- PL은 PM에게 최종 결과를 보고한다

## 4. 에이전트 권한

| 에이전트 | 가능 | 불가 |
|---------|------|------|
| PM | AskUserQuestion, Skill, Agent, Read, Write | Bash |
| PL | 모든 도구 | — |
| Base Agent | Read, Write, Edit, Glob, Grep | Agent Team 스폰 |
| Domain Agent | 도메인 스코프 내 모든 도구 | 다른 도메인 파일 수정 |
