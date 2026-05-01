/**
 * Tool-call agentic loop (single-step iterative).
 *
 * 동작:
 *   1) `adapter.complete(messages, { tools })` 호출
 *   2) finishReason === 'tool_calls' → 각 tool 을 dispatcher 로 실행
 *   3) tool result 를 messages 에 append (assistant tool_calls + tool result)
 *   4) max 3 iteration 까지 반복 (무한 루프 방지)
 *   5) 마지막 텍스트 응답 + 모든 tool_call/result 누적 trace 반환
 *
 * 어댑터가 tool-call 미지원 또는 ctx.dispatcher 가 없으면 1턴 응답으로 종료.
 */
import type {
  AIAdapter,
  AICompletionResult,
  AIMessage,
  AIToolCall,
  AIUsage,
} from './ai-adapter.js';
import type { ToolDispatcher, ToolExecCtx } from './tool-dispatcher.js';

const MAX_ITERATIONS = 3;
const MAX_TOOLS_PER_TURN = 6;

export interface ToolTraceEntry {
  id: string;
  name: string;
  arguments: string;
  result: string;
  iteration: number;
  /** 실행 소요 ms (관측성). */
  latencyMs: number;
}

export interface ToolLoopResult {
  text: string;
  finishReason: AICompletionResult['finishReason'];
  model: string;
  /** 누적 토큰 사용량 — 각 iteration 합산. */
  usage: AIUsage;
  trace: ToolTraceEntry[];
  /** 루프 종료 시점의 messages (caller 가 ai_messages 로 영속화 가능). */
  messages: AIMessage[];
}

export interface RunToolLoopOptions {
  adapter: AIAdapter;
  messages: AIMessage[];
  dispatcher: ToolDispatcher;
  ctx: ToolExecCtx;
  traceId: string;
  signal?: AbortSignal;
  /** 외부에서 max iteration 을 줄이고 싶을 때 (테스트 등). */
  maxIterations?: number;
}

export async function runToolLoop(opts: RunToolLoopOptions): Promise<ToolLoopResult> {
  const { adapter, dispatcher, ctx, traceId, signal } = opts;
  const max = Math.max(1, Math.min(opts.maxIterations ?? MAX_ITERATIONS, MAX_ITERATIONS));
  const tools = await dispatcher.listAsOpenAISpec();
  const messages: AIMessage[] = [...opts.messages];
  const trace: ToolTraceEntry[] = [];
  const usage: AIUsage = { promptTokens: 0, completionTokens: 0, costUSD: null };
  let lastResult: AICompletionResult | null = null;

  for (let iter = 1; iter <= max; iter++) {
    const result = await adapter.complete(messages, {
      tools,
      ...(signal ? { signal } : {}),
      traceId,
    });
    lastResult = result;
    accumulateUsage(usage, result.usage);

    if (result.finishReason !== 'tool_calls' || !result.toolCalls || result.toolCalls.length === 0) {
      return {
        text: result.text,
        finishReason: result.finishReason,
        model: result.model,
        usage,
        trace,
        messages,
      };
    }

    // 모델이 tool 호출 결정 → 메시지에 assistant 의 tool_calls 직렬화 흔적을 남기고
    // (어댑터가 단순 messages.role/content 만 받기 때문에 JSON 텍스트로 인코딩) 실행.
    const calls = result.toolCalls.slice(0, MAX_TOOLS_PER_TURN);
    messages.push({
      role: 'assistant',
      content: serializeAssistantToolCalls(calls),
    });

    await runOneTurn(calls, iter, dispatcher, ctx, messages, trace);
  }

  // max 도달 시 마지막 결과를 반환.
  return {
    text: lastResult?.text ?? '',
    finishReason: lastResult?.finishReason ?? 'stop',
    model: lastResult?.model ?? adapter.name,
    usage,
    trace,
    messages,
  };
}

async function runOneTurn(
  calls: AIToolCall[],
  iter: number,
  dispatcher: ToolDispatcher,
  ctx: ToolExecCtx,
  messages: AIMessage[],
  trace: ToolTraceEntry[],
): Promise<void> {
  for (const call of calls) {
    const args = parseArgs(call.arguments);
    const t0 = Date.now();
    const result = await dispatcher.dispatch(call.name, args, ctx);
    const latencyMs = Date.now() - t0;
    trace.push({
      id: call.id,
      name: call.name,
      arguments: call.arguments,
      result,
      iteration: iter,
      latencyMs,
    });
    messages.push({
      role: 'system',
      content: `[tool_result name=${call.name} id=${call.id}]\n${result}`,
    });
  }
}

function parseArgs(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function serializeAssistantToolCalls(calls: AIToolCall[]): string {
  // 어댑터 메시지 본문은 string 만 지원하므로 추적용 본문에 호출 정보를 박는다.
  return `[tool_calls]\n${JSON.stringify(
    calls.map((c) => ({ id: c.id, name: c.name, arguments: c.arguments })),
  )}`;
}

function accumulateUsage(acc: AIUsage, add: AIUsage): void {
  acc.promptTokens += add.promptTokens;
  acc.completionTokens += add.completionTokens;
  if (add.costUSD != null) acc.costUSD = (acc.costUSD ?? 0) + add.costUSD;
}
