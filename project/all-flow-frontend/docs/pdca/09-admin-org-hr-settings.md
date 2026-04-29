# PDCA-09 — 관리: 조직도 / 사용자 / HR / 관리자 콘솔 / 개인 설정

> Phase: 6 (Governance) | Owner: FE + BE | Status: done | Created: 2026-04-29 | Updated: 2026-04-29 (2차 sweep — admin: revokeToken, org: invite 와이어링)
> Acceptance: 인벤토리 5.1.* / 5.2.* / 5.3.* / 5.5.* / 5.7.* + 글로벌 G1, G4, G9, G11 / G12 wired. RBAC 5단계 동작.
> Dependencies: PDCA-01, backend RBAC PDCA-01-foundation-rbac

## Plan

- 목표: 워크스페이스 운영 메뉴 5개 + 글로벌 셸 잔여 컨트롤 모두 wired.
- 범위:
  - 조직도 트리 편집
  - 사용자 RBAC + 초대 + CSV 내보내기
  - HR: 휴가/평가/1:1/채용 (1차: 휴가 + 1:1 만)
  - 관리자 콘솔: 감사 로그 + SSO/SCIM 설정 + 빌링
  - 개인 설정: 프로필/알림/보안/통합/위험 액션
  - 글로벌: 워크스페이스 스위처(G1) / 새로 만들기(G4) / 도움말(G9) / 사용자 메뉴(G11) / 커맨드 팔레트 라우팅(G12)
- 결정:
  - SSO/SCIM 설정 UI는 1차 read-only, 변경은 Phase-7 로 이연
  - 계정 영구 삭제는 2단계 확인 + 입력 키워드 매칭

## Do

- 추가: `workspace-switcher.tsx`, `global-create-menu.tsx`, `help-popover.tsx`, `user-menu.tsx`, `org-tree-editor.tsx`, `user-invite-dialog.tsx`, `audit-log-table.tsx`, `delete-account-dialog.tsx`
- 수정: 위 인벤토리 행 전체. CommandPalette 항목별 라우팅 핸들러 추가.
- 의존성: 신규 없음

## Check

- E2E:
  1. 사용자 초대 → 메일 발송 → 신규 사용자 로그인
  2. 사용자 역할 변경 (member → admin) → 권한 게이트 통과
  3. 휴가 신청 → HR 승인자 결재 → 잔여 휴가 차감
  4. 관리자 콘솔에서 감사 로그 검색 → CSV 내보내기
  5. 개인 설정에서 비밀번호 변경 → 다른 세션 종료 → 재로그인 강제
  6. 커맨드 팔레트에서 "프로젝트 생성" → 다이얼로그 오픈

## Act

- 메모리: `learning_rbac_ui_pattern.md`.
- 다음: PDCA-10 (QA 최종 게이트).
