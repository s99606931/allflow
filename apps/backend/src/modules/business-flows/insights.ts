/**
 * business-flows 인사이트 — 9차 PDCA: 팀 병목 감지 + AI 설명.
 *
 * 입력: 특정 플로우의 모든 UserFlowProgress 행 + 활성 사용자 ID 집합.
 * 출력: 단계별 평균 체류일수, 오버듀 비율, 멤버 수, 병목 단계, AI 한국어 2문장.
 *
 * 정책:
 *  - 평균 체류일수 = 현재 시각 − stepStartedAt 의 평균(현 단계에 머문 멤버만 집계).
 *  - 오버듀 비율 = (현재 단계 머무는 일수 > expectedDays 인 멤버) / (현 단계 멤버).
 *  - 병목 단계 = 멤버가 1명 이상이며 (overdueRatio desc, avgDwellDays desc) 1순위.
 *    멤버가 모두 0이면 bottleneckStepId = null.
 *  - 분리된 함수로 라우트 핸들러의 인지 부하를 낮추고 단위 테스트 가능성을 보장.
 */

import type { BusinessFlow } from './flow-registry.js';

export interface ProgressRowForInsight {
  userId: string;
  flowId: string;
  currentStepId: string;
  completedSteps: string[];
  stepStartedAt: Date;
  updatedAt: Date;
}

export interface FlowInsightStep {
  stepId: string;
  label: string;
  /** 이 단계에 현재 머물고 있는 활성 멤버 수. */
  memberCount: number;
  /** 현 단계 머무는 일수 평균(소수 1자리). 멤버 0이면 0. */
  avgDwellDays: number;
  /** 0..1 — 오버듀 비율(expectedDays 초과). expectedDays 없으면 0. */
  overdueRatio: number;
  /** 이 단계가 병목인지 여부. */
  isBottleneck: boolean;
}

export interface FlowInsight {
  flowId: string;
  totalMembers: number;
  steps: FlowInsightStep[];
  bottleneckStepId: string | null;
  /** AI 가 생성한 한국어 2문장 설명. AI 실패 시 fallback 문구. */
  aiExplanation: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dwellDays(now: number, started: Date): number {
  const ms = now - started.getTime();
  if (ms <= 0) return 0;
  return ms / MS_PER_DAY;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 단계별 집계만 수행 (AI 호출 없음). 순수 함수 — 단위 테스트에서 직접 호출 가능.
 */
export function aggregateFlowInsight(
  flow: BusinessFlow,
  rows: readonly ProgressRowForInsight[],
  activeUserIds: ReadonlySet<string>,
  now: Date = new Date(),
): Omit<FlowInsight, 'aiExplanation'> {
  const nowMs = now.getTime();
  const filtered = rows.filter(
    (r) => r.flowId === flow.id && activeUserIds.has(r.userId),
  );

  const byStep = new Map<string, ProgressRowForInsight[]>();
  for (const r of filtered) {
    const list = byStep.get(r.currentStepId) ?? [];
    list.push(r);
    byStep.set(r.currentStepId, list);
  }

  const steps: FlowInsightStep[] = flow.steps.map((step) => {
    const stepRows = byStep.get(step.id) ?? [];
    const memberCount = stepRows.length;
    if (memberCount === 0) {
      return {
        stepId: step.id,
        label: step.label,
        memberCount: 0,
        avgDwellDays: 0,
        overdueRatio: 0,
        isBottleneck: false,
      };
    }
    const dwellList = stepRows.map((r) => dwellDays(nowMs, r.stepStartedAt));
    const avgDwellDays = round1(
      dwellList.reduce((a, b) => a + b, 0) / memberCount,
    );
    const expected = step.expectedDays ?? 0;
    const overdueRatio = expected > 0
      ? dwellList.filter((d) => d > expected).length / memberCount
      : 0;
    return {
      stepId: step.id,
      label: step.label,
      memberCount,
      avgDwellDays,
      overdueRatio: Math.round(overdueRatio * 100) / 100,
      isBottleneck: false,
    };
  });

  // 병목 결정: 멤버 1명 이상 + (overdueRatio desc, avgDwellDays desc) 1순위.
  let bottleneckStepId: string | null = null;
  const candidates = steps.filter((s) => s.memberCount > 0);
  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      if (b.overdueRatio !== a.overdueRatio) return b.overdueRatio - a.overdueRatio;
      return b.avgDwellDays - a.avgDwellDays;
    });
    const winner = candidates[0]!;
    bottleneckStepId = winner.stepId;
    for (const s of steps) if (s.stepId === winner.stepId) s.isBottleneck = true;
  }

  return {
    flowId: flow.id,
    totalMembers: filtered.length,
    steps,
    bottleneckStepId,
  };
}

/**
 * AI 한국어 2문장 설명 프롬프트 빌드. 라우트에서 adapter.complete() 입력으로 사용.
 */
export function buildInsightPrompt(
  flow: BusinessFlow,
  insight: Omit<FlowInsight, 'aiExplanation'>,
): { system: string; user: string } {
  const system =
    '당신은 협업 SaaS 의 팀 코치 AI 입니다. 데이터 기반으로 팀 병목을 한국어 2문장으로 설명하세요. 첫 문장은 어떤 단계에서 몇 %가 지연되는지, 둘째 문장은 권장 액션입니다.';

  if (insight.totalMembers === 0 || insight.bottleneckStepId === null) {
    const user = `[플로우: ${flow.name}] 진행 중인 팀원이 없습니다. 한국어 2문장으로 플로우 시작을 권유해 주세요.`;
    return { system, user };
  }

  const bottleneck = insight.steps.find((s) => s.stepId === insight.bottleneckStepId);
  const overduePct = bottleneck ? Math.round(bottleneck.overdueRatio * 100) : 0;
  const stepLabel = bottleneck?.label ?? insight.bottleneckStepId;
  const dwellDaysAvg = bottleneck?.avgDwellDays ?? 0;
  const memberCount = bottleneck?.memberCount ?? 0;

  const user = [
    `[플로우: ${flow.name}]`,
    `총 ${insight.totalMembers}명이 참여 중. 병목 단계: "${stepLabel}".`,
    `해당 단계 머무는 인원 ${memberCount}명, 평균 체류일 ${dwellDaysAvg}일, 오버듀 ${overduePct}%.`,
    `한국어 2문장으로 (1) 병목 현황 요약, (2) 팀 매니저가 즉시 취할 권장 액션을 제안하세요.`,
  ].join('\n');

  return { system, user };
}

/**
 * AI 호출 실패/빈 응답 시 결정적 fallback 문장. 정량 정보로 안전하게 요약.
 */
export function buildFallbackExplanation(
  flow: BusinessFlow,
  insight: Omit<FlowInsight, 'aiExplanation'>,
): string {
  if (insight.totalMembers === 0 || insight.bottleneckStepId === null) {
    return `${flow.name} 플로우에 참여 중인 팀원이 없습니다. 첫 단계부터 시작해 보세요.`;
  }
  const bottleneck = insight.steps.find((s) => s.stepId === insight.bottleneckStepId);
  const overduePct = bottleneck ? Math.round(bottleneck.overdueRatio * 100) : 0;
  const stepLabel = bottleneck?.label ?? insight.bottleneckStepId;
  return `${flow.name} 의 "${stepLabel}" 단계에서 팀원의 ${overduePct}%가 지연되고 있습니다. 담당자 점검과 차단 요인 제거가 필요합니다.`;
}
