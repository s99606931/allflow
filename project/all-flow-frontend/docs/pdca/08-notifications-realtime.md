# PDCA-08 — 알림 센터 / 실시간

> Phase: 5 (Operations) | Owner: FE + BE | Status: done | Created: 2026-04-29 | Updated: 2026-04-29 (2차 sweep — useNotifications + markRead/bulkMarkRead 와이어링, 5종 필터)
> Acceptance: 인벤토리 G8 / 5.6.* wired. 실시간 알림 → 토스트 + 알림 센터 동시 노출.
> Dependencies: PDCA-01, backend SSE (`/api/v1/sse`)

## Plan

- 목표: 사용자 활동 → 즉시 피드백 (토스트 + 알림 센터 + 사이드바 카운트 + 상단바 점).
- 범위:
  - `notifications.tsx` 필터/일괄 읽음/카테고리
  - `topbar.tsx` 알림 버튼 → 알림 드롭다운 패널 (G8)
  - `sidebar.tsx` 알림 카운트 자동 갱신
  - `useRealtime` 훅 → `notification.created` 이벤트 처리
- 결정: sonner 토스트 라이브러리 기존 사용. 알림 우선순위에 따라 sound/visual 구분.

## Do

- 추가: `notification-dropdown.tsx`, `notification-preferences.tsx`
- 수정: `notifications.tsx` 5.6.1 ~ 5.6.4, `topbar.tsx` G8 와이어링, `useRealtime` 이벤트 핸들러 등록
- 의존성: 신규 없음

## Check

- E2E:
  1. 새 알림 발생 (예: 결재 승인) → 토스트 노출 + 알림 센터 1건 추가 + 사이드바 카운트 +1
  2. 알림 클릭 → 컨텍스트 라우팅 (예: 결재 상세)
  3. 모두 읽음 → 카운트 0
  4. 알림 환경설정 → 이메일/슬랙 토글 저장

## Act

- 다음: PDCA-09 (관리).
