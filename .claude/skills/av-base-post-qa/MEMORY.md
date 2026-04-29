# av-base-post-qa Skill Memory

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
| Playwright | 1.43.x+ | `@playwright/test` |
| Vitest | 2.x | React Testing Library 호환 |
| E2E 패턴 | storageState global-setup | `playwright/.auth/user.json` |
| QA 커버리지 | 80%+ (unit) + smoke E2E | USE_MOCK=false 실연동 권장 |
| 로그 기반 QA | bkit:qa-monitor Docker logs | Zero Script QA 패턴 |
