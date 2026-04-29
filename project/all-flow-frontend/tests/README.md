# 테스트

ALL-Flow 프론트엔드의 테스트 환경입니다.

## 구조

```
tests/
├── setup.ts                 # Vitest 글로벌 셋업 (jsdom, mocks)
├── unit/                    # Vitest 유닛 테스트
│   ├── primitives.test.tsx  # UI 프리미티브 (Button/Card/Avatar 등)
│   ├── ui-store.test.ts     # Zustand 스토어 (테마/액센트/패널)
│   ├── schemas.test.ts      # Zod 스키마 ↔ 픽스처 매칭
│   └── nav.test.ts          # 사이드바 NAV 무결성
└── e2e/                     # Playwright E2E
    ├── routes.spec.ts       # 17개 라우트 스모크
    ├── interactions.spec.ts # 메뉴/버튼/패널 인터랙션
    └── console-errors.spec.ts # 전 라우트 콘솔 에러 가드
```

## 명령어

```bash
# 유닛 (Vitest)
pnpm test              # 1회 실행
pnpm test:watch        # 워치 모드
pnpm test:ui           # 브라우저 UI
pnpm test:cov          # 커버리지 (text + html + lcov)

# E2E (Playwright)
pnpm e2e:install       # 최초 1회 — Chromium + 의존성 설치
pnpm e2e               # 헤드리스 실행 (개발 서버 자동 기동)
pnpm e2e:ui            # 디버거 UI
E2E_BASE_URL=https://staging.example.com pnpm e2e   # 기존 서버에 연결

# 한 번에 다
pnpm test:all
```

## CI

`.github/workflows/ci.yml` — 푸시/PR 마다 다음을 실행:
1. **lint-and-test** — typecheck → eslint → vitest → openapi 검증
2. **e2e** (위 통과 시) — playwright + 리포트 아티팩트 업로드
3. **build** (병렬) — `next build` + `build-storybook`

## 커버 범위

**유닛 (Vitest)**
- ✅ Button — 4개 variant × 3개 size × disabled
- ✅ IconButton — aria-label, 정사각 사이즈
- ✅ Badge — 5개 tone
- ✅ Card — 헤더/제목/바디/hoverable
- ✅ Avatar / AvatarStack — 이니셜·색·title·overflow
- ✅ Progress — 0~100 클램프
- ✅ StatusDot — 5개 상태
- ✅ UI Store — 테마, 액센트(6종), 사이드바, AI 패널
- ✅ Zod 스키마 — 모든 enum + 양/음의 케이스 + 픽스처 일치 + Realtime discriminated union
- ✅ NAV — id/href 유일성, 라우트 매칭, icon naming

**E2E (Playwright)**
- ✅ 17개 라우트 모두 200 + 핵심 텍스트 검증
- ✅ 사이드바 모든 링크 순회 클릭
- ✅ 사이드바 접기/펴기
- ✅ AI 패널 열기/닫기
- ✅ Tweaks — 다크 모드 전환
- ✅ ⌘K 검색 단축키 노출
- ✅ 대시보드 위젯 카운트
- ✅ 프로젝트 목록 → 상세 진입
- ✅ 이슈 4-탭 전환
- ✅ 콘솔 에러 가드 (전 라우트)
