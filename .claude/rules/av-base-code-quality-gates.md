---
name: av-base-code-quality-gates
autovibe: true
version: "1.0"
created: "2026-04-27"
group: base
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.py"
  - "**/*.go"
---

# av-base-code-quality-gates — 코드 품질 게이트 룰

> Claude Code와 개발자 모두가 따라야 할 코드 품질 기준.
> Harness Engineering 원칙: "push 전 자동 검증, 문제는 사람이 아닌 시스템이 잡는다."

## 1. 절대 금지 패턴 (Anti-Patterns)

### 1.1 데드코드 금지

```
금지: 사용되지 않는 변수/함수/import를 남기는 것
금지: TODO/FIXME 주석을 커밋하는 것 (이슈 트래커로 이동)
금지: console.log, print, fmt.Println 디버그 출력을 프로덕션 코드에 남기는 것
금지: 주석 처리된 코드 블록 (git history로 복구 가능)
```

### 1.2 보안 안티패턴 금지

```
금지: 하드코딩된 시크릿, API 키, 비밀번호
금지: eval(), exec() 사용 (사용자 입력 기반)
금지: SQL 쿼리 문자열 직접 조합 (파라미터화 필수)
금지: any 타입 남용 (TypeScript) — 단, 외부 라이브러리 타입 정의 제외
```

### 1.3 아키텍처 안티패턴 금지

```
금지: 순환 의존성 (A→B→C→A)
금지: God Object (1개 파일 > 500줄)
금지: Magic Number (상수 미정의 숫자 직접 사용)
금지: 3단계 이상 중첩 조건문 (early return으로 리팩토링)
```

## 2. 필수 준수 패턴 (Required Patterns)

### 2.1 함수 설계

- 함수 길이: 최대 50줄 (초과 시 분리)
- 함수 파라미터: 최대 4개 (초과 시 객체로 묶기)
- 단일 책임: 1함수 = 1가지 일

### 2.2 에러 처리

```typescript
// 올바른 패턴: 경계에서만 검증, 내부 코드는 신뢰
async function createUser(input: CreateUserInput) {
  const validated = validateInput(input);  // 경계 검증
  const user = await db.user.create(validated);
  return user;
}

// 금지 패턴: 방어적 과잉 검증
async function createUser(input: any) {
  if (!input) throw new Error('input required');
  if (!input.email) throw new Error('email required');
  if (typeof input.email !== 'string') throw new Error('email must be string');
  // ...불필요한 중복 검증
}
```

### 2.3 명명 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수/함수 | camelCase | `getUserById` |
| 클래스/타입 | PascalCase | `UserRepository` |
| 상수 | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| 파일 | kebab-case | `user-repository.ts` |
| Boolean | is/has/can 접두사 | `isAuthenticated` |

## 3. Claude Code 행동 규칙

### 3.1 구현 전 필수 확인

```
구현 전 체크리스트:
□ SPEC.md 또는 PDCA Plan 문서가 있는가?
□ 기존 코드에서 재사용 가능한 컴포넌트를 탐색했는가?
□ 변경 파일 범위를 사용자와 합의했는가?
```

### 3.2 구현 중 필수 행동

```
□ 1 파일 = 1 책임 원칙 유지
□ 500줄 초과 파일 생성 금지 (분리 필수)
□ 새 의존성 추가 시 사용자에게 명시적 고지
□ 기존 공개 API 시그니처 변경 시 사용자 확인 필수
□ .env 파일 절대 수정/읽기 금지 (사용자만)
```

### 3.3 구현 후 필수 행동

```
□ 추가한 import가 실제 사용되는지 확인
□ 주석 처리된 코드 없음 확인
□ console.log/print 제거 확인
□ TypeScript: any 타입 최소화 확인
```

## 4. Harness 연동 품질 게이트

> `.githooks/pre-commit` 및 `.githooks/pre-push` 자동 실행

| Gate | 시점 | 검사 항목 |
|------|------|----------|
| Gate 1 | pre-commit | 시크릿/민감정보 유출 스캔 |
| Gate 2 | pre-commit | TODO/FIXME/console.log 잔존 검사 |
| Gate 3 | pre-commit | 주석 처리된 코드 블록 검사 |
| Gate 4 | pre-push | TypeScript 타입 검사 (프로젝트 존재 시) |
| Gate 5 | pre-push | 테스트 실행 (존재 시) |

게이트 우회: `git commit --no-verify` (긴급 시만, PR에 이유 명시 필수)

## 5. 협업 워크플로우 규칙

### 5.1 브랜치 전략

```
main ← 프로덕션 (직접 push 금지)
dev  ← 통합 브랜치 (PR 필수)
feature/{기능명} ← 기능 개발
fix/{이슈번호}   ← 버그 수정
```

### 5.2 커밋 메시지 (Conventional Commits)

```
feat: 새 기능
fix: 버그 수정
refactor: 기능 변경 없는 코드 개선
docs: 문서만 변경
test: 테스트만 변경
chore: 빌드/CI 설정 변경
```

### 5.3 코드 리뷰 기준

- PR 크기: 변경 파일 10개 이하 권장 (초과 시 분리)
- 리뷰어: 최소 1명 (셀프 merge 금지)
- 보안 변경: 반드시 security-architect 에이전트 리뷰
