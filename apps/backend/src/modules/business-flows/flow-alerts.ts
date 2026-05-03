/**
 * 10차 PDCA — 플로우 알림 헬퍼.
 *
 * 책임:
 *  1) overdue 판정 — 단계 시작 후 expectedDays 초과 여부.
 *  2) overdue 알림 멱등 생성 — 동일 (userId, flowId, currentStepId) 에 대해
 *     하루 1회만 알림이 생성되도록 dedup.
 *  3) suggest 알림 생성 — AI 다음 단계 제안을 알림 센터에 보존.
 *
 * Notification.kind:
 *  - flow_overdue : 단계 표준 일수 초과 경고.
 *  - ai           : AI 다음 단계 제안 (saveToNotifications=true 시).
 *
 * Notification.href: 화면 라우트 hint (FE 가 클릭 시 이동).
 */

import type { BusinessFlow, FlowStep } from './flow-registry.js';

export interface OverdueComputation {
  overdue: boolean;
  daysElapsed: number;
  daysOver: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 단계 시작 후 표준 일수 초과 여부 계산. expectedDays 미정의/0 이면 비활성. */
export function computeOverdue(
  stepStartedAt: Date,
  expectedDays: number | undefined,
  now: Date = new Date(),
): OverdueComputation {
  if (!expectedDays || expectedDays <= 0) {
    return { overdue: false, daysElapsed: 0, daysOver: 0 };
  }
  const daysElapsed = Math.floor(
    (now.getTime() - stepStartedAt.getTime()) / MS_PER_DAY,
  );
  const daysOver = daysElapsed - expectedDays;
  return { overdue: daysOver > 0, daysElapsed, daysOver };
}

export interface FlowOverdueNotificationInput {
  userId: string;
  flow: BusinessFlow;
  step: FlowStep;
  daysOver: number;
}

export function buildOverdueNotificationData(input: FlowOverdueNotificationInput): {
  userId: string;
  kind: 'flow_overdue';
  title: string;
  body: string;
  href: string;
} {
  return {
    userId: input.userId,
    kind: 'flow_overdue',
    title: `${input.flow.name} — "${input.step.label}" 단계 지연`,
    body: `표준 일수(${input.step.expectedDays}일)를 ${input.daysOver}일 초과했습니다. ${input.step.action}을 진행해 주세요.`,
    href: input.step.screen,
  };
}

export interface SuggestNotificationInput {
  userId: string;
  flow: BusinessFlow;
  currentStep: FlowStep;
  nextStep: FlowStep | null;
  suggestion: string;
}

export function buildSuggestNotificationData(input: SuggestNotificationInput): {
  userId: string;
  kind: 'ai';
  title: string;
  body: string;
  href: string;
} {
  const headline = input.nextStep
    ? `다음 단계 제안: ${input.nextStep.label}`
    : `${input.flow.name} 마무리 제안`;
  return {
    userId: input.userId,
    kind: 'ai',
    title: `${input.flow.name} — ${headline}`,
    body: input.suggestion,
    href: input.nextStep?.screen ?? input.currentStep.screen,
  };
}

/**
 * 동일 (userId, flowId, stepId, 'flow_overdue', today) 알림 중복 차단.
 * `today` 는 UTC 자정 기준 ISO 날짜. 알림 row 의 createdAt 이 그날 이후이면 중복으로 판정.
 *
 * 호출자는 prismaNotificationFinder 에 findFirst 결과를 주입한다.
 */
export async function shouldCreateOverdueNotification(
  finder: () => Promise<{ id: string } | null>,
): Promise<boolean> {
  const existing = await finder();
  return existing === null;
}

/** 오늘 자정(UTC) 이후 시각 (dedup 윈도우 시작점). */
export function todayWindowStart(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
