/**
 * insights.ts 순수 함수 단위 테스트 — 결정적(시간 고정) 시나리오로 병목 결정 로직을 검증.
 */
import { describe, expect, it } from 'vitest';
import { getFlow } from './flow-registry.js';
import {
  aggregateFlowInsight,
  buildFallbackExplanation,
  buildInsightPrompt,
  type ProgressRowForInsight,
} from './insights.js';

const FLOW = getFlow('project-lifecycle')!;
const NOW = new Date('2026-05-04T12:00:00Z');

function row(
  userId: string,
  currentStepId: string,
  startedDaysAgo: number,
  base: Date = NOW,
): ProgressRowForInsight {
  return {
    userId,
    flowId: FLOW.id,
    currentStepId,
    completedSteps: [],
    stepStartedAt: new Date(base.getTime() - startedDaysAgo * 24 * 60 * 60 * 1000),
    updatedAt: base,
  };
}

describe('insights/aggregateFlowInsight', () => {
  const now = NOW;

  it('빈 입력 → totalMembers=0, bottleneckStepId=null', () => {
    const out = aggregateFlowInsight(FLOW, [], new Set(), now);
    expect(out.totalMembers).toBe(0);
    expect(out.bottleneckStepId).toBeNull();
    expect(out.steps.every((s) => s.memberCount === 0 && !s.isBottleneck)).toBe(true);
  });

  it('비활성 사용자(set 미포함)는 집계에서 제외', () => {
    const rows = [row('u1', 'plan', 1), row('u2-inactive', 'plan', 1)];
    const out = aggregateFlowInsight(FLOW, rows, new Set(['u1']), now);
    expect(out.totalMembers).toBe(1);
  });

  it('overdueRatio 가 더 큰 단계가 병목', () => {
    // plan: expectedDays=5, kickoff: expectedDays=3
    // plan 단계: 1명 (1일 머무름) → overdue 0%
    // kickoff 단계: 2명 (각각 10일, 8일 머무름) → overdue 100%
    const rows = [
      row('u1', 'plan', 1),
      row('u2', 'kickoff', 10),
      row('u3', 'kickoff', 8),
    ];
    const out = aggregateFlowInsight(
      FLOW,
      rows,
      new Set(['u1', 'u2', 'u3']),
      now,
    );
    expect(out.totalMembers).toBe(3);
    expect(out.bottleneckStepId).toBe('kickoff');
    const bottleneck = out.steps.find((s) => s.stepId === 'kickoff');
    expect(bottleneck?.memberCount).toBe(2);
    expect(bottleneck?.overdueRatio).toBe(1);
    expect(bottleneck?.avgDwellDays).toBe(9);
    expect(bottleneck?.isBottleneck).toBe(true);
  });

  it('overdueRatio 동률이면 avgDwellDays 가 큰 쪽이 병목', () => {
    // 두 단계 모두 overdue 0% — kickoff 가 더 오래 머무름
    const rows = [row('u1', 'plan', 1), row('u2', 'kickoff', 2)];
    const out = aggregateFlowInsight(FLOW, rows, new Set(['u1', 'u2']), now);
    expect(out.bottleneckStepId).toBe('kickoff');
  });

  it('isBottleneck 플래그는 정확히 1개 단계에만 설정', () => {
    const rows = [row('u1', 'plan', 1), row('u2', 'kickoff', 9)];
    const out = aggregateFlowInsight(FLOW, rows, new Set(['u1', 'u2']), now);
    const bottleneckCount = out.steps.filter((s) => s.isBottleneck).length;
    expect(bottleneckCount).toBe(1);
  });
});

describe('insights/buildInsightPrompt', () => {
  it('빈 데이터 → 권유 메시지 프롬프트', () => {
    const aggregate = aggregateFlowInsight(FLOW, [], new Set());
    const prompt = buildInsightPrompt(FLOW, aggregate);
    expect(prompt.system).toContain('팀 코치');
    expect(prompt.user).toContain('진행 중인 팀원이 없습니다');
  });

  it('병목 정보가 user prompt 에 포함', () => {
    const rows = [row('u1', 'kickoff', 10)];
    const aggregate = aggregateFlowInsight(FLOW, rows, new Set(['u1']));
    const prompt = buildInsightPrompt(FLOW, aggregate);
    expect(prompt.user).toContain('킥오프');
    expect(prompt.user).toContain('오버듀');
  });
});

describe('insights/buildFallbackExplanation', () => {
  it('빈 데이터 → 시작 권유', () => {
    const aggregate = aggregateFlowInsight(FLOW, [], new Set());
    const text = buildFallbackExplanation(FLOW, aggregate);
    expect(text).toContain('참여 중인 팀원이 없습니다');
  });

  it('병목 단계 + % 가 fallback 에 포함', () => {
    const rows = [row('u1', 'kickoff', 10), row('u2', 'kickoff', 9)];
    const aggregate = aggregateFlowInsight(FLOW, rows, new Set(['u1', 'u2']));
    const text = buildFallbackExplanation(FLOW, aggregate);
    expect(text).toContain('킥오프');
    expect(text).toMatch(/\d+%/);
  });
});
