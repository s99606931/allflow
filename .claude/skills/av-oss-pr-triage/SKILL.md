---
name: av-oss-pr-triage
description: |
  PR 트리아지 — 라벨링, CODEOWNERS 기반 리뷰어 자동 할당,
  good-first-issue 후보 식별, stale PR 정리. av-oss-pr-reviewer 에이전트와
  연계하여 외부 기여 흐름을 자동화한다.
autovibe: true
version: "1.0"
created: "2026-04-29"
group: oss
argument-hint: "[PR번호] [--all-open]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /av-oss-pr-triage — 외부 기여 PR 트리아지

## 실행 프로토콜

1. **PR 수집**:
   - 인수가 PR 번호: 해당 PR만
   - `--all-open`: 모든 열린 PR
   - 인수 없음: 최근 7일 내 신규/업데이트 PR

2. **분류**:
   | 조건 | 액션 |
   |------|------|
   | 신규 PR | 라벨 `needs-review` + CODEOWNERS 리뷰어 할당 |
   | 단일 파일 + 명확 AC | 라벨 `good-first-issue` 후보 코멘트 |
   | CI fail | 라벨 `changes-requested` |
   | 14일 무응답 | 라벨 `stale` + 친화적 ping 코멘트 |
   | 30일 무응답 | close 후보 알림 |

3. **위임**:
   - 코드 리뷰 → `Agent("av-oss-pr-reviewer", { pr: N })`
   - 보안 게이트 → `Agent("av-oss-security-officer", { pr: N })`
   - 테스트 상태 확인 → `Agent("av-oss-test-engineer", { pr: N })`

4. **결과 보고**: 각 PR별 적용된 액션과 다음 담당자

## gh CLI 사용

```bash
gh pr list --state open --json number,title,labels,updatedAt
gh pr view {N} --json files,labels,reviewRequests
gh pr edit {N} --add-label "needs-review"
```
