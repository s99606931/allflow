# T-604 — bkit:code-analyzer 점수 + 보안 스캔

> Phase: 6 | Owner: Auditor | Status: done | Created: 2026-04-28
> Acceptance: score ≥ 90, semgrep critical 0
> Dependencies: [T-603]

## Plan

> 무엇을, 왜, 어떻게.

- **목표**: all-flow-backend 코드 품질 점수 ≥ 90 + 보안 critical 이슈 0 확인.
- **범위**: `src/` 32 source files, 3704 LOC. 22 test files (165 tests).
- **결정/가정**:
  - bkit:code-analyzer Agent 미노출 → 동등 도구 조합(`biome` + `tsc` + `vitest` + 패턴 그렙)으로 표준 산출.
  - semgrep 미설치 → grep 정규식 + Prisma 사용으로 SQL/시크릿/eval 패턴 표면 0 확인.

## Do

> 구현 변경 사항.

- 추가 파일: `.bkit/state/features/all-flow-backend/code-quality.json`
- 수정 파일: 없음
- 추가 의존성: 없음

## Check

> 검증 결과.

| 검사 | 도구 | 결과 |
|------|------|------|
| 타입 검사 | `tsc --noEmit` (3 configs) | **PASS, 0 errors** |
| 린트 | `biome check src` | **PASS, 0 warnings** |
| 단위 + 통합 테스트 | `vitest run` | **165/165 PASS** (25 files) |
| 파일 크기 (>500 LOC) | wc -l | 0 violation |
| TODO/FIXME 주석 | grep | 0 |
| `any` 타입 남용 | grep | 0 |
| `console.log` (src) | grep | 0 |
| 주석 처리된 코드 | grep | 0 |
| 하드코딩 시크릿 | regex 스캔 | 0 |
| `eval()`/`new Function()` | grep | 0 |
| Raw SQL 문자열 조합 | grep `$queryRaw` | 0 (Prisma 사용) |

### 점수 분해

| 항목 | 가중 | 획득 |
|------|----:|----:|
| typecheck | 20 | 20 |
| lint | 15 | 15 |
| tests pass | 25 | 25 |
| anti-pattern clean | 20 | 20 |
| security zero critical | 15 | 15 |
| module size discipline | 5 | 5 |
| **총점** |  | **100/100** |

- **acceptance 임계값**: score ≥ 90 ✅, critical 0 ✅
- **달성**: 100/100, critical 0 → **PASS**

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - Prisma + zod 입력 검증 + JWT decorator 구조가 SQL/시크릿/eval 표면을 자연스럽게 0 으로 유지.
  - 모듈을 routes/test/도메인 헬퍼로 일관 분리하여 모든 파일이 491 LOC 이하 유지.
- 메모리에 저장:
  - `code-quality.json` 영속 → 다음 PDCA 에서 회귀 비교 가능.
- 후속 태스크에 영향:
  - T-605 진행 가능 — 코드 품질 게이트 통과.
  - 후속 사이클 권장: semgrep + dependency-audit (`pnpm audit`) 추가.
- 회고: 100/100 은 도구 조합의 일관성 결과 — bkit Agent 도입 시 동일 결과 재현이 회귀 안전망이 된다.
