import { describe, expect, it } from 'vitest';
import { PROMPT_VERSIONS, recordAICall, resolveCost } from './ai-observability.js';

describe('modules/reports/ai-observability', () => {
  it('PROMPT_VERSIONS — 모든 키가 semver 문자열', () => {
    for (const v of Object.values(PROMPT_VERSIONS)) {
      expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('resolveCost — adapter 가 직접 비용 제공 시 그대로 사용', () => {
    const cost = resolveCost({ promptTokens: 100, completionTokens: 50, costUSD: 0.42 }, 'gpt-5');
    expect(cost).toBe(0.42);
  });

  it('resolveCost — costUSD null 이면 모델 가격표 fallback', () => {
    const cost = resolveCost(
      { promptTokens: 1000, completionTokens: 1000, costUSD: null },
      'gpt-5',
    );
    // gpt-5: 1k input * $0.005 + 1k output * $0.015 = $0.02
    expect(cost).toBe(0.02);
  });

  it('resolveCost — 알 수 없는 모델 + costUSD null → null', () => {
    expect(
      resolveCost({ promptTokens: 100, completionTokens: 100, costUSD: null }, 'unknown-model'),
    ).toBeNull();
  });

  it('resolveCost — usage 없으면 null', () => {
    expect(resolveCost(undefined, 'gpt-5')).toBeNull();
  });

  it('recordAICall — Pino 호출 시 prompt_version 포함', () => {
    const calls: { obj: Record<string, unknown>; msg: string }[] = [];
    const log = {
      info: (obj: Record<string, unknown>, msg: string) => calls.push({ obj, msg }),
    } as never;
    recordAICall(log, {
      route: '/reports/weekly',
      adapter: 'in-memory',
      promptKey: 'reports.weekly',
      model: 'in-memory',
      usage: { promptTokens: 10, completionTokens: 5, costUSD: 0 },
      tone: 'team',
      sectionCount: 3,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.obj.prompt_version).toBe(PROMPT_VERSIONS['reports.weekly']);
    expect(calls[0]?.obj.cost_usd).toBe(0);
    expect(calls[0]?.obj.adapter).toBe('in-memory');
  });
});
