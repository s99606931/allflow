---
name: av-pm-team
description: |
  PM이 팀을 구성하여 병렬로 프로젝트를 학습·진행하는 게이트웨이.
  필요한 av-에이전트/스킬이 누락되면 자동 생성(vibe-forge)한 뒤 팀을 스폰한다.
  사용자 트리거: `/av pm team {요구사항}`
autovibe: true
version: "1.0"
created: "2026-04-28"
group: base
argument-hint: "{requirement}"
user-invocable: true
allowed-tools: [Read, Write, Edit, Glob, Grep, AskUserQuestion, Skill, Agent]
context: fork
model: opus
---

# av-pm-team — PM 팀 구성 + 병렬 실행 게이트웨이

> `/av pm team {요구사항}` 진입점.
> PM이 요구사항을 정의하고, PL이 av 생태계를 점검·확장한 뒤 팀을 병렬 스폰한다.
> 작업과 동시에 프로젝트 학습(memory-keeper)이 백그라운드로 진행된다.

## 인자

- `$ARGUMENTS` = 자연어 요구사항 (필수)

## 실행 프로토콜 (6단계)

### STEP 1: PM 요구사항 도출
- `Agent("av-pm-coordinator")` 스폰
- AskUserQuestion으로 요구사항 명확화 (최대 6문항)
- 출력: 확정된 PRD 초안

### STEP 2: 생태계 갭 점검
- `Agent("av-vibe-vibecoder")` 스폰 → 현 인벤토리(13/17/10/6) 대비 누락 컴포넌트 탐지
- 필요 시:
  - 누락 에이전트 → `Skill("av-vibe-forge", "agent {name}")`
  - 누락 스킬   → `Skill("av-vibe-forge", "skill {name}")`
  - 누락 룰    → `Skill("av-vibe-forge", "rule {name}")`
- 신규 컴포넌트는 registry/components.json에 자동 등록

### STEP 3: PL 팀 구성
- `Agent("av-do-orchestrator")` 스폰
- 팀 구성 (최대 5명, 모두 `memory: project`):
  | 역할 | 기본 에이전트 | 비고 |
  |------|--------------|------|
  | Lead | av-do-orchestrator (자기) | 조율 + 검증 |
  | Backend | (요구사항에 따라) | API/DB |
  | Frontend | (요구사항에 따라) | UI/UX |
  | QA | av-base-qa-reviewer | gstack E2E + bkit:qa-monitor |
  | Memory | av-base-memory-keeper | **백그라운드 학습** |

### STEP 4: 병렬 실행
- 모든 팀원을 **단일 메시지 다중 Agent 호출**로 동시 스폰
- Memory Keeper는 PostToolUse 훅으로 학습을 누적 (작업 방해 없음)
- 각 팀원은 `Skill("bkit:pdca", "do {feature}")` 단계의 자기 영역만 진행

### STEP 5: 검증 + 자동 개선
- `Agent("bkit:gap-detector")` Match Rate 측정
- < 90% 시 `Agent("bkit:pdca-iterator", { target: 0.90, max_iterations: 2 })` 자동 트리거
- gstack E2E PASS 확인

### STEP 6: PM 승인 + 학습 보존
- PM에게 결과 보고 → 승인 시 `Skill("bkit:pdca", "report {feature}")`
- `Agent("av-base-memory-keeper")` 최종 호출 → 학습 사항 영구 저장

## 종료 후 산출물
- 구현 코드 + bkit Plan/Design/Report 문서
- registry 갱신 (신규 컴포넌트 등록 시)
- 학습된 메모리 (L1 에이전트 + L4 글로벌)

## 호출 예시

```
/av pm team JWT 기반 로그인 기능 추가
/av pm team 결제 모듈 설계부터 구현까지
/av pm team 이 프로젝트 전체 리팩토링 계획 수립
```
