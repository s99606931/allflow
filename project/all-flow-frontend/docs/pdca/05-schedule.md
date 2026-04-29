# PDCA-05 — 스케줄 트랙: 캘린더 / 회의실·리소스

> Phase: 3 (Collaboration) | Owner: FE | Status: todo | Created: 2026-04-29
> Acceptance: 인벤토리 1.6.* / 5.4.* wired. Google/Outlook OAuth 1차 통합.
> Dependencies: PDCA-01

## Plan

- 목표: 일정/리소스 예약을 사용자 가시 기능으로 완성.
- 범위:
  - `calendar.tsx` 월/주/일 뷰, 이전/다음/오늘 네비게이션, 이벤트 CRUD
  - `resources.tsx` 회의실/장비/차량 슬롯 + 충돌 검증
  - 외부 캘린더 OAuth (Google/Outlook) 연결 카드
- 결정: 캘린더 라이브러리 비용 절감 → 자체 SVG 그리드 사용. 가상 스크롤은 react-window.

## Do

- 추가: `event-create.tsx`, `event-detail-popover.tsx`, `resource-book-dialog.tsx`, `oauth-callback/page.tsx` (외부 캘린더)
- 수정: `calendar.tsx` 1.6.2 ~ 1.6.7 와이어링, `resources.tsx` 5.4.1 ~ 5.4.4
- 의존성: 신규 없음 (date-fns 활용)

## Check

- E2E:
  1. 캘린더에서 새 일정 작성 → 참석자 2명 → 알림 5분 전
  2. 반복 일정 (매주 화요일) 생성 → 4주 후 까지 노출
  3. 회의실 예약 → 동시간 다른 예약 시도 → 충돌 경고
  4. Google 캘린더 연결 → 외부 일정 wash-in

## Act

- 다음: PDCA-06 (AI 통합).
