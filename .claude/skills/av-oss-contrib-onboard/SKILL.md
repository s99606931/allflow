---
name: av-oss-contrib-onboard
description: |
  외부 기여자 온보딩 가이드 — 신규 기여자가 첫 PR을 머지하기까지의
  여정을 5분 안에 안내. 이슈 선정·로컬 개발 환경·테스트·PR 생성·DCO를
  단계별로 보여주고 막힐 때 어떤 av 컴포넌트가 도움을 주는지 매핑.
autovibe: true
version: "1.0"
created: "2026-04-29"
group: oss
argument-hint: "[--lang ko|en]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash]
---

# /av-oss-contrib-onboard — 기여자 온보딩

## 5분 온보딩 단계

```
1. 이슈 선정       → label:good-first-issue 에서 선택
2. 포크 + 클론     → gh repo fork --clone
3. 환경 셋업       → make setup (또는 README 의 Quick Start)
4. 브랜치 생성     → git checkout -b feature/{이슈번호}-{slug}
5. 구현 + 테스트   → make test (av-oss-test-engineer 가이드)
6. 커밋 (DCO)      → git commit -s -m "feat: ..." (Signed-off-by 자동)
7. PR 생성         → gh pr create --fill
8. 리뷰 대응       → av-oss-pr-reviewer 코멘트에 친화적으로 응답
```

## 막힐 때 누구에게?

| 상황 | 트랙 / 컴포넌트 |
|------|---------------|
| 빌드 에러 | av-oss-dev-lead → README/CONTRIBUTING 재확인 |
| 테스트 실패 | av-oss-test-engineer → CI 로그 + 로컬 재현 가이드 |
| DCO 훅 차단 | `git commit --amend -s` 안내 |
| 라이선스 훅 차단 | av-oss-security-officer → 호환 의존성 제안 |
| 리뷰 코멘트 이해 안 됨 | av-oss-pr-reviewer 에 친화적 질문 (영어 OK, 한국어 OK) |

## DCO 안내 (필수)

```
모든 커밋은 -s 플래그로 Signed-off-by 추가:
  git commit -s -m "feat: 새 기능"

이미 커밋했다면:
  git commit --amend -s --no-edit
  git push --force-with-lease
```

## 출력

```
✅ 온보딩 가이드 출력 완료
다음: label:good-first-issue 에서 첫 이슈를 골라보세요!
```
