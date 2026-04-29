# Archive Index — 2026-04

| Feature | Match Rate | Period | Status | Path |
|---------|----------:|--------|:------:|------|
| `.claude` (AutoVibe OSS 분업화) | 96.20% → ~99.2% | 2026-04-29 | ✅ archived | [dotclaude/](./dotclaude/) |
| `all-flow-fullstack-2026-04-29` (BE×FE 풀스택 종결) | 0.984 / code 100 | 2026-04-28~29 | ✅ archived | [all-flow-fullstack-2026-04-29/](./all-flow-fullstack-2026-04-29/) |

## all-flow-fullstack-2026-04-29 요약

- **작업**: Backend 38 PDCA 회귀 + Phase 7 후보 5건(BE-R1~R5) + Frontend PDCA 01~10 풀 와이어링 + ESLint v9 flat 마이그레이션
- **결과**: 54/54 (100%), match_rate 0.984, code 100/100, FE 98/98 vitest + BE 188 unit + 38 integration PASS
- **종결 패턴 6**: Zero-dep 우회 (TipTap→contentEditable, i18next→shim) / 데코 1-line wiring / ESLint v9 native flat / contract mirror 정적 회귀 가드 / 단일 host dev 마찰 우회 / OpenAPI path-as-method 정합화
- **신규 의존성**: `@axe-core/playwright`, `@eslint/eslintrc`, `@eslint/js` (모두 dev)
- **학습 적재**: 4건 (`learning_pdca_2026_04_29_pm_team.md`, `learning_pdca_2nd_sweep.md`, `learning_fe_5th_sweep_complete.md`, `learning_pdca_2026_04_29_complete.md`)
- **커밋**: `c961e18` (48 files, +3207/-55)

> **라이브 문서**: 각 PDCA 본문은 `project/all-flow-{backend,frontend}/docs/pdca/` 에 그대로 보존 (실 코드 트레이스 유지). 본 archive 는 종결 보고서 + SSoT 스냅샷만 보관.

## .claude 요약

- **작업**: AutoVibe OSS 6트랙(Dev/Test/Docs/Review/Security/Release) 분업화
- **산출물**: 25 신규 (agents 6 + skills 4 + hooks 3 + rule 1 + .github 7 + root 3 + meta 4 정리)
- **개선**: Minor 6건 후속 수정 → 정합성 5계층 일관 달성
- **Success Criteria**: 8/8 (100%)
- **학습 적재**: 2건 (`learning_oss_track_split.md`, `learning_oss_gap_analysis.md`)

> 정식 PRD/Plan/Design 문서는 작성하지 않았으며, `.claude/rules/av-oss-collab-protocol.md`가
> de-facto Design 문서 역할을 수행했음. (메타 컴포넌트 작업 특성)
