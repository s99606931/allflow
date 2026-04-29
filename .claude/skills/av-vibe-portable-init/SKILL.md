---
name: av-vibe-portable-init
description: |
  신규 프로젝트 원클릭 초기화. av 생태계의 Phase 0~6을 자동으로 실행하여
  사용자 대화 기반으로 프로젝트 맞춤형 생태계를 구축한다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: vibe
tier: meta
argument-hint: "setup [--stack stack] [--domains domains]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, Skill, Agent]
---

# av-vibe-portable-init — 신규 프로젝트 초기화

## 실행 프로토콜

1. AskUserQuestion: 프로젝트 이름, 기술 스택, 도메인 그룹
2. Phase 0: 디렉토리 구조 + Registry + CLAUDE.md + settings.json
3. Phase 1: Base Rules 5종 생성
4. Phase 2: 조직 에이전트 3종 (PM/PL/Memory)
5. Phase 3: Base Agents 8종
6. Phase 4: Meta Skills (Forge) 6종
7. Phase 5: Core Skills 10종
8. Phase 6: Hooks 8종 + settings.json
9. `/av-vibe-forge health` 실행 → 건강도 확인

## 커스터마이즈 포인트

- `--stack`: 기술 스택별 lint/build 명령어 자동 설정
- `--domains`: 도메인별 ROUTING_TABLE 경로 자동 추가
