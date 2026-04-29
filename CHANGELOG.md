# Changelog

> Owner: av-oss-docs-curator
> Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · semver: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [0.1.0] - 2026-04-29

### Added
- AutoVibe OSS 6트랙 분업화 — 에이전트 6개, 스킬 4개, 훅 3개, 룰 1개 (`av-oss-*`)
- `.github/` 스캐폴딩: workflows (ci/release/security), CODEOWNERS, dependabot, ISSUE/PR 템플릿
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.editorconfig`, `.gitattributes`
- DCO (Linux Kernel-style) 강제 훅 (`av-oss-sign-off.sh`)
- 협업 프로토콜 룰: `.claude/rules/av-oss-collab-protocol.md` (RACI + 핸드오프 + 게이트 매트릭스)
- Frontend PDCA-01: 23 API endpoint 구현 + OpenAPI 3.1 동기화 + 7 screen 컴포넌트 정비
- Backend frontend-contract mirror 통합 테스트

### Changed
- `.claude/registry/components.json`: v2.3 → v2.4 (agents 13→19, skills 18→22, hooks 10→13, rules 6→7)
- `CLAUDE.md`: OSS 트랙 인벤토리 + collab-protocol 룰 import 추가
- `.claude/settings.json`: 신규 OSS 훅 3종 등록 (PreToolUse Write|Edit, PreToolUse Bash, PostToolUse Write|Edit)

### Security
- 시크릿 스캔 훅 (`av-oss-secret-scan.sh`): AWS/GitHub/Slack/JWT/Private Key 패턴 차단
- 라이선스 호환성 훅 (`av-oss-license-check.sh`): MIT 비호환 의존성 경고
- DCO 훅 (`av-oss-sign-off.sh`): 외부 기여자 Signed-off-by 강제

### Quality
- bkit:gap-detector Match Rate: 96.20% → ~99.2% (Minor 6건 후속 수정)
- Critical 갭: 0건 / Success Criteria: 8/8 (100%)

<!--
릴리즈 시 위 'Unreleased' 섹션을 아래 형식으로 변환:

## [X.Y.Z] - YYYY-MM-DD
### Added / Changed / Deprecated / Removed / Fixed / Security
-->
