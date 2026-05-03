-- 10차 PDCA: NotificationKind 에 flow_overdue 값 추가.
-- 비즈니스 플로우 단계가 표준 일수(expectedDays) 를 초과했을 때
-- 자동 생성되는 알림의 분류로 사용된다.

ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'flow_overdue';
