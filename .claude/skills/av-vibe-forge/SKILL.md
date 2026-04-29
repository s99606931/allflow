---
name: av-vibe-forge
description: |
  AutoVibe 마스터 오케스트레이터. av- 생태계의 생성/조회/검증/관리를
  14개 서브커맨드로 제공. 생성 서브커맨드는 전용 forge에 위임.
autovibe: true
version: "2.0"
created: "2026-03-29"
group: vibe
tier: meta
argument-hint: "<subcommand> [args] [--options]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, Task]
---

# av-vibe-forge — AutoVibe Master Orchestrator

## 서브커맨드 (14종)

| # | 커맨드 | 설명 |
|---|--------|------|
| 1 | `skill [name]` | 스킬 생성 → av-vibe-skill-forge 위임 |
| 2 | `agent [name]` | 에이전트 생성 → av-vibe-agent-forge 위임 |
| 3 | `hook [type] [name]` | 훅 생성 → av-vibe-hook-forge 위임 |
| 4 | `rule [name]` | 룰 파일 생성 → av-vibe-rule-forge 위임 |
| 5 | `list [--group]` | 레지스트리 전체 또는 그룹별 목록 |
| 6 | `validate [name]` | 컴포넌트 검증 |
| 7 | `spec` | av-base-spec.md 표시 |
| 8 | `upgrade [name]` | 부모 변경 → 자식 전파 |
| 9 | `health` | 생태계 건강도 보고서 |
| 10 | `export [--portable]` | 컴포넌트 내보내기 |
| 11 | `import [path]` | 컴포넌트 가져오기 |
| 12 | `version [name]` | 버전 이력 조회 |
| 13 | `tree` | 상속 트리 시각화 |
| 14 | `audit-request` | 감사 요청 (av-base-auditor 호출) |

## health 서브커맨드

```
1. components.json 로드 → 전체 컴포넌트 목록
2. 각 컴포넌트 파일 존재 확인 (Glob)
3. 상태 분류:
   - OK: 파일 존재 + frontmatter valid
   - MISSING: 파일 없음
   - UNREGISTERED: 파일 있으나 registry 없음
   - NO_MEMORY: MEMORY.md 없음 (에이전트)
4. 100점 스코어: -5(UNREGISTERED) -10(MISSING) -3(NO_MEMORY)
5. 보고서 출력 + 권장 조치
```

## 실행 프로토콜

1. `$1` (서브커맨드) 파싱
2. 생성 커맨드 → 전용 forge 위임
3. 조회/검증 → 직접 실행
4. 결과 출력 + components.json 자동 업데이트
