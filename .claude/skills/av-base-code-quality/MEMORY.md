# av-base-code-quality Skill Memory

> 생성: 2026-04-27 | 마지막 업데이트: 2026-04-27 | L2 메모리 (스킬 전용)

## 역할 정의
(SKILL.md frontmatter description 참조)

## 호출 이력 (최근 5건)
(최초 시드 — 호출 시 갱신)

## 학습된 패턴
(없음 — 호출 시 누적)

## 주의 사항
(없음)

## 관련 컴포넌트
- 호출 주체: PL/PM/사용자
- 출력 대상: bkit/gstack/Memory Keeper

## Stack Recommendations

> 2026-04-29 tech-stack-modernization-2026-04-29 기준

| 구분 | 권장 | 비고 |
|------|------|------|
| TypeScript | strict mode + no-any | ESLint rule: `@typescript-eslint/no-explicit-any: error` |
| ESLint | 9.x flat config (`eslint.config.js`) | `@eslint/js` + `typescript-eslint` |
| 코드 품질 게이트 | bkit:code-analyzer ≥ 90/100 | CI에서 자동 차단 |
| 파일 길이 | 500줄 이하 | God Object 방지 |
| 함수 길이 | 50줄 이하 | 단일 책임 원칙 |
