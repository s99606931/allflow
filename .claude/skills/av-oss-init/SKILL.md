---
name: av-oss-init
description: |
  OSS 공개 준비 원클릭 초기화. .github/(workflows, ISSUE_TEMPLATE,
  PULL_REQUEST_TEMPLATE, CODEOWNERS), SECURITY.md, .editorconfig를
  스캐폴딩하고 누락된 OSS 필수 파일을 점검한다.
autovibe: true
version: "1.0"
created: "2026-04-29"
group: oss
argument-hint: "[--check-only] [--lang ko|en]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Write, Edit, Bash, Agent]
---

# /av-oss-init — OSS 공개 준비 스캐폴딩

## 실행 프로토콜

1. **점검**: 다음 파일 존재 여부 확인
   - `LICENSE`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
   - `.github/workflows/`, `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`
   - `.github/CODEOWNERS`, `.github/dependabot.yml`
   - `.editorconfig`, `.gitattributes`

2. **스캐폴딩** (누락된 것만 생성):
   - `.github/workflows/ci.yml` (테스트 매트릭스)
   - `.github/workflows/release.yml` (태그 push 시 GitHub Release)
   - `.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`
   - `.github/PULL_REQUEST_TEMPLATE.md` (DCO + 체크리스트)
   - `.github/CODEOWNERS` (트랙별 소유자)
   - `.github/dependabot.yml`
   - `SECURITY.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
   - `.editorconfig`

3. **트랙 위임**:
   - 워크플로우 검증 → `Agent("av-oss-test-engineer")`
   - SECURITY.md 검토 → `Agent("av-oss-security-officer")`
   - README 갱신 → `Agent("av-oss-docs-curator")`

4. **공개 직전 placeholder 점검** (`--check-only` 또는 기본 모드 마지막 단계):
   - `SECURITY.md`, `CODE_OF_CONDUCT.md`에서 미치환 placeholder 패턴 검색:
     `grep -nE '\{도메인\}|\{domain\}|TODO|FIXME|example\.com' SECURITY.md CODE_OF_CONDUCT.md`
   - `.github/CODEOWNERS`에서 placeholder GitHub team 검색:
     `grep -nE '@autovibe-(maintainers|dev-leads|test-leads|docs-leads|security-leads|release-leads)' .github/CODEOWNERS`
   - 발견 시 ⚠️ 리포트 + 공개 차단 권고 (사용자가 실제 도메인/team 치환 후 재실행)

5. **검증**: `--check-only` 모드는 점검 결과만 출력하고 종료

## 옵션

- `--check-only`: 누락 파일 + placeholder 리포트만 출력
- `--lang ko|en`: 템플릿 언어 (기본: 둘 다)

## 출력 예시

```
✅ /av-oss-init 완료
━━━━━━━━━━━━━━━━━━━━━
존재: LICENSE, README.md, CONTRIBUTING.md
생성: .github/workflows/ci.yml, .github/CODEOWNERS, SECURITY.md, ...
다음 단계: /av-oss-pr-triage 또는 /av-oss-release
```
