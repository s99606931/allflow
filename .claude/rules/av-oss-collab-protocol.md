# av-oss-collab-protocol — OSS 5트랙 협업 프로토콜

> 오픈소스 프로젝트의 5개 전문 트랙(Dev/Test/Docs/Review/Security)과 1 보조 트랙(Release)이
> 책임을 분리하면서 협업하기 위한 프로토콜. 트랙 간 월권 금지, 명시적 핸드오프 강제.
> v1.0 (2026-04-29)

## 1. 트랙 구성

| 트랙 | 에이전트 | 모델 | 핵심 책임 |
|------|---------|------|----------|
| **Dev** | av-oss-dev-lead | sonnet | 개발 환경, 코드 표준, 의존성 정책 |
| **Test** | av-oss-test-engineer | sonnet | CI 매트릭스, 커버리지, 회귀 |
| **Docs** | av-oss-docs-curator | sonnet | README/CHANGELOG/릴리즈 노트 |
| **Review** | av-oss-pr-reviewer | sonnet | 외부 PR 리뷰, 라벨링, 머지 판단 |
| **Security** | av-oss-security-officer | sonnet | CVE/시크릿/라이선스/DCO/SBOM |
| **Release** | av-oss-release-manager | sonnet | semver/태깅/GitHub Release/핫픽스 |

## 2. 책임 경계 (RACI 단순화)

| 활동 | Dev | Test | Docs | Review | Security | Release |
|------|:---:|:----:|:----:|:------:|:--------:|:-------:|
| 신규 기능 구현 | **R** | C | C | I | I | — |
| CI 워크플로우 정의 | C | **R** | I | I | C | I |
| README/CHANGELOG | I | I | **R** | I | I | C |
| 외부 PR 리뷰 | C | C | C | **R** | C | — |
| CVE/취약점 대응 | C | C | I | I | **R** | C |
| 릴리즈 태깅/배포 | I | I | C | I | C | **R** |
| 시크릿/라이선스 게이트 | I | I | — | I | **R** | — |

R=Responsible, A=Accountable(=R), C=Consulted, I=Informed

## 3. 핸드오프 체인

### 외부 PR 라이프사이클

```
PR open
  └─→ av-oss-pr-reviewer (트리아지 + 라벨)
        ├─→ av-oss-test-engineer  (CI 결과 신호)
        ├─→ av-oss-security-officer (시크릿/라이선스/DCO 게이트)
        ├─→ av-oss-docs-curator   (CHANGELOG Unreleased 추가 확인)
        └─→ av-oss-dev-lead       (코드 표준 first-pass)

모든 트랙 PASS → av-oss-pr-reviewer (최종 머지 승인)
머지 직후 → av-oss-docs-curator (CHANGELOG 항목 정리)
```

### 릴리즈 라이프사이클

```
/av-oss-release 호출
  └─→ av-oss-release-manager (사전 게이트)
        ├─→ av-oss-security-officer (모든 게이트 PASS 확인)
        ├─→ av-oss-test-engineer  (main green 확인)
        └─→ av-oss-docs-curator   (CHANGELOG 동결)
              ↓
        av-oss-release-manager (태깅 + GitHub Release)
              ↓
        Skill("canary") (24h 모니터링)
              ↓
        av-base-memory-keeper (학습 저장)
```

## 4. 월권 금지 원칙

각 트랙 에이전트는 **자기 영역 외 파일 수정 금지**.

| 트랙 | 수정 가능 경로 |
|------|--------------|
| Dev | `src/`, `lib/`, `app/`, `.editorconfig`, `.devcontainer/` |
| Test | `.github/workflows/`, `tests/`, `e2e/`, `*.test.*`, `coverage/` |
| Docs | `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/`, `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md` |
| Review | (코멘트만, 코드 수정 금지) |
| Security | `SECURITY.md`, `.github/dependabot.yml`, `.githooks/`, `.claude/hooks/av-oss-*.sh` |
| Release | `VERSION`, `package.json:version`, `Cargo.toml:version`, `CHANGELOG.md`(version section만) |

위반 시: av-base-auditor 가 차단.

## 5. 게이트 매트릭스 (모든 게이트 PASS 시 머지)

| Gate | 담당 | 도구 |
|------|------|------|
| 코드 표준 | av-oss-dev-lead | bkit:code-analyzer |
| CI green | av-oss-test-engineer | GitHub Actions |
| 커버리지 ≥ 80% | av-oss-test-engineer | coverage report |
| 시크릿 0건 | av-oss-security-officer | av-oss-secret-scan.sh |
| 라이선스 호환 | av-oss-security-officer | av-oss-license-check.sh |
| DCO 서명 (외부 PR) | av-oss-security-officer | av-oss-sign-off.sh |
| CHANGELOG 갱신 | av-oss-docs-curator | manual |
| 1+ Approve | av-oss-pr-reviewer | gh pr review |

## 6. 통신 규칙

- 트랙 간 통신은 **PR 코멘트** 또는 **이슈 링크**로만 (구두 합의 금지)
- 모든 결정은 PR 본문 또는 이슈에 기록
- av-base-memory-keeper 가 트랙 간 학습을 누적

## 7. 비상 프로토콜

치명적 보안 이슈 발견 시 책임 체인을 단축:

```
av-oss-security-officer (CVE 식별)
  → av-oss-release-manager (핫픽스 분기)
  → av-oss-docs-curator (CHANGELOG Security 섹션)
  → 24시간 내 patch 릴리즈
```

이 경우 av-oss-pr-reviewer 의 외부 리뷰 단계는 생략 가능 (메인테이너 2명 승인으로 대체).
