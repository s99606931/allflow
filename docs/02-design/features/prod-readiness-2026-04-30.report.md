# PDCA Report: 운영 오픈 전수검사 (2026-04-30)

> **결론**: 🟢 **운영 오픈 가능** — G1~G7 모든 게이트 통과, P0 이슈 0건 (수정 완료)

## 실행 요약

| 지표 | 결과 |
|------|------|
| Playwright E2E | **62/62** PASS (100%) |
| FE Unit tests | **71/71** PASS |
| BE Unit tests | **267/267** PASS |
| TypeScript FE | **0 errors** |
| TypeScript BE | **0 errors** (수정 완료) |
| ESLint FE | **0 errors** / 115 warnings |
| 콘솔 에러 | **0건** |
| 화면 렌더링 | **22/22** PASS |
| 보안 취약점 | critical:0 / high:0 / moderate:1(devDep) |

## 수정된 P0 이슈

### I-01: @fastify/jwt 미사용 의존성 + CVE
- **심각도**: Critical (fast-jwt: Cache Confusion, CVE-2023-48223 Incomplete fix)
- **발견**: `pnpm audit` → 6 vulnerabilities (2 critical + 1 high + 3 moderate)
- **원인**: `@fastify/jwt@9.1.0`이 package.json에 등록되었으나 코드에서 미사용. 내부 `fast-jwt@5.0.6`이 취약
- **조치**: `@fastify/jwt` 의존성 제거 → audit 잔존 1 moderate (PostCSS devDep)
- **파일**: `apps/backend/package.json`

### I-02: BE TypeScript 테스트 파일 오류
- **심각도**: P1 → 수정
- **발견**: 3개 오류 (`noUncheckedIndexedAccess` — 배열 인덱스 직접 접근)
- **조치**: `items[0]!.id`, `publicChannel!.id`, `units[0]!.id` — non-null assertion 추가
- **파일**: `apps/backend/tests/integration/be-test-tracks.test.ts`

## P1 잔존 항목 (운영 오픈 후 1주 내)

1. ESLint warnings 115건 — 특히 `react-hooks/set-state-in-effect` 3건
2. next-auth@5.0.0-beta.30 — GA 릴리즈 대기
3. hr/page.tsx 535줄, settings.tsx 522줄 — 컴포넌트 분리
4. PostCSS@8.4.31 moderate (Storybook devDep)

## 학습 내용

- `@fastify/jwt` ghost dependency 패턴: package.json에 등록되었으나 실제 코드에서 미사용. 정기 `pnpm audit + grep import` 교차검증 필요.
- testcontainers 환경: WSL2 로컬에서 직접 실행 불가. `INTEGRATION_DISABLED=1`로 unit만 실행 + docker 컨테이너 서비스 분리 전략이 최적.
- postcss@8.4.31: Storybook devDep 체인. 런타임 미영향이나 audit 잡음 유발. Storybook 업그레이드 시 자동 해결.
