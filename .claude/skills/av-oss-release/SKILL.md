---
name: av-oss-release
description: |
  OSS 릴리즈 자동화 — semver bump 결정, CHANGELOG 동결, git tag,
  GitHub Release 생성, 캐나리 모니터링 시작. av-oss-release-manager 에이전트와
  av-oss-docs-curator에 위임하여 일관된 릴리즈 워크플로우를 보장한다.
autovibe: true
version: "1.0"
created: "2026-04-29"
group: oss
argument-hint: "[major|minor|patch|auto] [--hotfix] [--dry-run]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /av-oss-release — OSS 릴리즈 자동화

## 실행 프로토콜

1. **사전 게이트** — `Agent("av-oss-release-manager", { gate: "pre-release" })`
   - main green 확인
   - CHANGELOG.md "Unreleased" 섹션 비어있지 않음
   - av-oss-security-officer 게이트 PASS

2. **버전 결정**:
   - `auto`: 미머지 커밋의 Conventional Commits 분석
   - `major|minor|patch`: 명시적 bump
   - `--hotfix`: release/x.y 브랜치에서 patch bump

3. **CHANGELOG 동결** — `Agent("av-oss-docs-curator", { action: "freeze-changelog", version: "X.Y.Z" })`

4. **태깅 + 릴리즈** — `Agent("av-oss-release-manager", { action: "tag-and-release", version: "X.Y.Z" })`
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   gh release create vX.Y.Z --notes-file CHANGELOG_EXTRACT.md
   ```

5. **모니터링** — `Skill("canary", "watch vX.Y.Z 24h")`

6. **학습 저장** — `Agent("av-base-memory-keeper", { event: "release", version: "X.Y.Z" })`

## 옵션

- `--dry-run`: 실행 없이 계획만 출력
- `--hotfix`: 핫픽스 모드 (release/x.y 브랜치 기반)

## 출력

```
✅ /av-oss-release vX.Y.Z 완료
━━━━━━━━━━━━━━━━━━━━━
태그: vX.Y.Z
GitHub Release: https://github.com/{org}/{repo}/releases/tag/vX.Y.Z
캐나리 모니터링: 24시간 진행 중
다음: /av-oss-pr-triage 로 main 백로그 정리
```
