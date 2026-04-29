---
name: av-base-iterate
description: |
  bkit:pdca-iterator 표면화 — Evaluator-Optimizer 자동 개선 루프.
  Match Rate 측정 후 목표치 미달 시 자동으로 개선-재측정 반복.
  PL 검증 게이트 미달 또는 QA 실패 후 자동 개선에 사용.
  ⚠️ PL/QA는 반드시 이 스킬을 경유 (bkit:pdca-iterator 직접 호출 금지).
autovibe: true
version: "1.1"
created: "2026-04-27"
updated: "2026-04-27"
group: base
domain: base
argument-hint: "{feature} [--max=N] [--target=0.9]"
user-invocable: true
allowed-tools: [Read, Agent]
---

# av-base-iterate — Evaluator-Optimizer 자동 PDCA 반복

> bkit:pdca-iterator의 **단일 진입점** (Single Entry Point).
> Match Rate ≥ target까지 최대 N회 자동 반복 + Memory Keeper 학습 자동 저장.

## 단일 진입점 원칙

| 호출자 | 호출 방식 | 금지 |
|--------|-----------|------|
| PL (av-do-orchestrator) | `Skill("av-base-iterate", "{feature}")` | ❌ `Agent("bkit:pdca-iterator", ...)` 직접 |
| QA (av-base-qa-reviewer) | `Skill("av-base-iterate", "{feature} --max=1")` | ❌ 직접 호출 |
| 사용자 | `/av-base-iterate {feature}` | — |
| 다른 컴포넌트 | 위 3가지 외 호출 금지 | — |

이유: 단일 진입점으로 (1) 학습 일관성, (2) 반복 횟수 정책 통제, (3) 게이트 우회 방지.

## 실행 시퀀스 (e2e)

```python
# Phase 1: 현재 Match Rate 측정 (baseline)
baseline = Agent("bkit:gap-detector", { "feature": "$1" })
initial_rate = baseline.match_rate

# Phase 2: 목표 달성 여부 판단
target = float(args.get("--target", 0.90))
if initial_rate >= target:
    return {
        "status": "already_passed",
        "match_rate": initial_rate,
        "iterations": 0
    }

# Phase 3: 자동 개선 루프 (Evaluator-Optimizer 패턴)
max_iter = int(args.get("--max", 3))
result = Agent("bkit:pdca-iterator", {
    "feature": "$1",
    "target_match_rate": target,
    "max_iterations": max_iter
})
final_rate = result.final_match_rate
actual_iterations = result.iterations_used

# Phase 4: Memory Keeper 자동 학습 저장 (성공/실패 모두)
Agent("av-base-memory-keeper", {
    "action": "iteration_record",
    "feature": "$1",
    "initial_rate": initial_rate,
    "final_rate": final_rate,
    "iterations": actual_iterations,
    "outcome": "passed" if final_rate >= target else "failed"
})

# Phase 5: 결과 리포트
return {
    "initial": initial_rate,
    "final": final_rate,
    "iterations": actual_iterations,
    "delta": final_rate - initial_rate,
    "status": "passed" if final_rate >= target else "max_reached"
}
```

## 사용 예시

```bash
# 기본 사용 (목표 90%, 최대 3회)
/av-base-iterate user-auth

# 커스텀 목표/반복
/av-base-iterate payment-api --target=0.95 --max=2

# PL 검증 후 자동 호출 (av-do-orchestrator 내부)
Skill("av-base-iterate", { feature: "{feature}", "--max": 2 })

# QA 실패 후 자동 호출 (av-base-post-qa 내부)
Skill("av-base-iterate", { feature: "{feature}", "--max": 1 })
```

## 자동 트리거 조건 (e2e 검증된 흐름)

| 호출 컨텍스트 | 트리거 조건 | 최대 반복 | 학습 저장 |
|--------------|------------|---------|----------|
| **PL 검증 게이트** | match_rate < 0.90 | 2회 | Memory Keeper iteration_record |
| **QA 실패** | qa_status == failed | 1회 | Memory Keeper iteration_record |
| **수동 호출** | 사용자 명시 | 3회 (기본) | Memory Keeper iteration_record |

## e2e 시나리오 검증 (회귀 방지)

다음 3가지 시나리오에서 작동 확인 필수:

### 시나리오 1: 정상 통과 (baseline ≥ target)
```
입력: feature with match_rate=0.95, target=0.90
예상: status=already_passed, iterations=0
검증: bkit:pdca-iterator 호출 없음, Memory Keeper에 "passed" 저장
```

### 시나리오 2: 1회 반복으로 통과
```
입력: feature with match_rate=0.85, target=0.90, max=2
예상: iterations=1, final_rate >= 0.90
검증: pdca-iterator 1회 호출, gap-detector 재측정 1회, Memory Keeper "passed"
```

### 시나리오 3: 최대 반복 도달 (실패)
```
입력: feature with match_rate=0.60, target=0.90, max=2
예상: iterations=2, final_rate < 0.90, status=max_reached
검증: pdca-iterator 2회 호출, Memory Keeper "failed", PL/QA에 fail 보고
```

## bkit:pdca-iterator와의 관계

- bkit:pdca-iterator = 실제 개선-재측정 루프 실행자 (low-level)
- av-base-iterate = av 생태계 단일 진입점 (high-level)
  - 학습 저장 자동화
  - 정책 일원화 (max iterations 표준)
  - 진입 통계 누적 가능

## 회귀 방지 게이트

다음 변경 시 반드시 e2e 시나리오 3개 모두 통과 확인:
- bkit:pdca-iterator 인터페이스 변경
- av-do-orchestrator 검증 프로토콜 변경
- av-base-qa-reviewer QA 실패 처리 변경
- Memory Keeper iteration_record 스키마 변경
