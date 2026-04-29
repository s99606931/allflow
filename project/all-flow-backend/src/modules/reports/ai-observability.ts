/**
 * AI 관측성 — 프롬프트 버전 + 토큰/비용 메트릭 (T-406).
 *
 * 책임:
 *  - 모든 AI 호출에 prompt_version 부여 (코드 변경 시 bump)
 *  - usage(promptTokens/completionTokens/costUSD) Pino 구조화 로그
 *  - reports + ai/complete + extract-actions 공용 진입점
 *
 * 비용 산정 우선순위:
 *  1) adapter 가 usage.costUSD 를 직접 제공
 *  2) 모델 가격표 (PRICE_TABLE) 로 fallback 계산
 *  3) 알 수 없는 모델 → null
 */
import type { FastifyBaseLogger } from 'fastify';
import type { AIUsage } from '../ai/ai-adapter.js';

/** 프롬프트 버전 — 프롬프트 본문 또는 system instruction 변경 시 bump. */
export const PROMPT_VERSIONS = {
  'reports.weekly': '1.0.0',
  'reports.monthly': '1.0.0',
  'ai.complete': '1.0.0',
  'ai.extract-actions': '1.0.0',
} as const;

export type PromptKey = keyof typeof PROMPT_VERSIONS;

/**
 * 1k 토큰 당 USD (input, output) — 단순 추정치.
 * 실제 가격 변경 시 운영팀이 갱신.
 */
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  'gpt-5': { input: 0.005, output: 0.015 },
  'gpt-5-mini': { input: 0.0015, output: 0.006 },
  'in-memory': { input: 0, output: 0 },
};

export interface AICallLog {
  route: string;
  adapter: string;
  promptKey?: PromptKey;
  model?: string;
  usage?: AIUsage;
  tone?: string;
  sectionCount?: number;
}

export function recordAICall(log: FastifyBaseLogger, payload: AICallLog): void {
  const promptVersion = payload.promptKey ? PROMPT_VERSIONS[payload.promptKey] : undefined;
  const cost = resolveCost(payload.usage, payload.model);
  log.info(
    {
      kind: 'ai_call',
      route: payload.route,
      adapter: payload.adapter,
      model: payload.model,
      prompt_version: promptVersion,
      prompt_tokens: payload.usage?.promptTokens ?? 0,
      completion_tokens: payload.usage?.completionTokens ?? 0,
      cost_usd: cost,
      tone: payload.tone,
      section_count: payload.sectionCount,
    },
    `ai call: ${payload.route}`,
  );
}

export function resolveCost(usage: AIUsage | undefined, model: string | undefined): number | null {
  if (!usage) return null;
  if (usage.costUSD !== null && usage.costUSD !== undefined) return usage.costUSD;
  if (!model) return null;
  const price = PRICE_TABLE[model];
  if (!price) return null;
  const inUsd = (usage.promptTokens / 1000) * price.input;
  const outUsd = (usage.completionTokens / 1000) * price.output;
  return Number((inUsd + outUsd).toFixed(6));
}
