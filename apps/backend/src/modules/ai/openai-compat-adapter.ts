/**
 * OpenAI-compatible HTTP adapter.
 *
 * One implementation covers LMStudio, Ollama (with /v1 prefix), vLLM, OpenAI,
 * Together, Groq, and any other server speaking the `/v1/chat/completions`
 * shape. Differences are absorbed by `baseUrl` + optional `apiKey`.
 *
 * Uses native `fetch` to avoid heavyweight SDK dependencies.
 */
import { AppError } from '@all-flow/shared/errors';
import {
  type AIAdapter,
  AIAdapterError,
  type AICompleteOptions,
  type AICompletionResult,
  type AIMessage,
  type AIStreamChunk,
  type AIToolCall,
  type AIUsage,
} from './ai-adapter.js';

export interface OpenAICompatAdapterOptions {
  /** Display name (registry key). e.g. "lmstudio:gemma-4-e4b-it" */
  name: string;
  /** Base URL of the server. Code appends "/v1/chat/completions". */
  baseUrl: string;
  /** Default model id sent in request body. */
  model: string;
  /** Optional bearer token. Local servers (LMStudio, Ollama) ignore this. */
  apiKey?: string | null;
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
}

interface ChatToolCallWire {
  id?: string | null;
  index?: number;
  type?: 'function';
  function?: { name?: string | null; arguments?: string | null };
}

interface ChatMessageWire {
  content?: string | null;
  tool_calls?: ChatToolCallWire[] | null;
}

interface ChatChoice {
  message?: ChatMessageWire;
  delta?: ChatMessageWire;
  finish_reason?: string | null;
}

interface ChatResponse {
  choices?: ChatChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
}

const FINISH_MAP: Record<string, AICompletionResult['finishReason']> = {
  stop: 'stop',
  length: 'length',
  content_filter: 'content_filter',
  tool_calls: 'tool_calls',
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  const p = path.replace(/^\/+/, '');
  // If baseUrl already ends with /v1, do not duplicate.
  if (/\/v1$/i.test(b) && p.startsWith('v1/')) {
    return `${b}/${p.slice(3)}`;
  }
  return `${b}/${p}`;
}

export class OpenAICompatAdapter implements AIAdapter {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string | null;
  private readonly doFetch: typeof fetch;

  constructor(opts: OpenAICompatAdapterOptions) {
    if (!opts.baseUrl) throw new AIAdapterError('baseUrl is required');
    if (!opts.model) throw new AIAdapterError('model is required');
    this.name = opts.name;
    this.baseUrl = opts.baseUrl;
    this.model = opts.model;
    this.apiKey = opts.apiKey ?? null;
    this.doFetch = opts.fetchImpl ?? fetch;
  }

  private buildHeaders(traceId?: string): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) h.authorization = `Bearer ${this.apiKey}`;
    if (traceId) h['x-request-id'] = traceId;
    return h;
  }

  private buildBody(messages: AIMessage[], opts: AICompleteOptions, stream: boolean): string {
    const body: Record<string, unknown> = {
      model: opts.model ?? this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
      stop: opts.stop,
      stream,
    };
    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
      body.tool_choice = opts.toolChoice ?? 'auto';
    }
    return JSON.stringify(body);
  }

  async complete(messages: AIMessage[], opts: AICompleteOptions = {}): Promise<AICompletionResult> {
    if (messages.length === 0) throw new AIAdapterError('빈 messages 배열');
    const url = joinUrl(this.baseUrl, '/v1/chat/completions');
    let res: Response;
    try {
      res = await this.doFetch(url, {
        method: 'POST',
        headers: this.buildHeaders(opts.traceId),
        body: this.buildBody(messages, opts, false),
        signal: opts.signal ?? AbortSignal.timeout(30_000),
      });
    } catch (err) {
      const e = err as Error;
      const msg =
        e.name === 'TimeoutError' || e.name === 'AbortError'
          ? 'LLM 서버 응답 시간 초과 (30s)'
          : `LLM 서버 호출 실패: ${e.message}`;
      throw new AIAdapterError(msg, { url });
    }
    if (!res.ok) {
      const detail = await safeText(res);
      throw new AIAdapterError(`LLM 서버 ${res.status}: ${detail}`, { url, status: res.status });
    }
    const data = (await res.json()) as ChatResponse;
    const choice = data.choices?.[0];
    const text = choice?.message?.content ?? '';
    const finishReason = FINISH_MAP[choice?.finish_reason ?? 'stop'] ?? 'stop';
    const usage: AIUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      costUSD: null,
    };
    const toolCalls = normalizeToolCalls(choice?.message?.tool_calls);
    const result: AICompletionResult = { text, finishReason, usage, model: data.model ?? this.model };
    if (toolCalls.length > 0) result.toolCalls = toolCalls;
    return result;
  }

  async *stream(messages: AIMessage[], opts: AICompleteOptions = {}): AsyncIterable<AIStreamChunk> {
    if (messages.length === 0) throw new AIAdapterError('빈 messages 배열');
    const url = joinUrl(this.baseUrl, '/v1/chat/completions');
    let res: Response;
    try {
      res = await this.doFetch(url, {
        method: 'POST',
        headers: this.buildHeaders(opts.traceId),
        body: this.buildBody(messages, opts, true),
        signal: opts.signal ?? AbortSignal.timeout(120_000),
      });
    } catch (err) {
      const e = err as Error;
      const msg =
        e.name === 'TimeoutError' || e.name === 'AbortError'
          ? 'LLM 서버 스트림 시간 초과 (120s)'
          : `LLM 서버 호출 실패: ${e.message}`;
      throw new AIAdapterError(msg, { url });
    }
    if (!res.ok || !res.body) {
      const detail = res.body ? await safeText(res) : '(no body)';
      throw new AIAdapterError(`LLM 서버 ${res.status}: ${detail}`, { url, status: res.status });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage: AIUsage | undefined;
    const toolAcc = new ToolCallAccumulator();
    let finishReason: AICompletionResult['finishReason'] | undefined;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        // SSE frames are separated by blank lines.
        // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic SSE parser
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const chunk of parseSseFrame(frame)) {
            if (chunk.delta) yield { delta: chunk.delta, done: false };
            if (chunk.usage) usage = chunk.usage;
            if (chunk.toolCallDelta) toolAcc.absorb(chunk.toolCallDelta);
            if (chunk.finishReason) finishReason = chunk.finishReason;
            if (chunk.done) {
              const tcs = toolAcc.finalize();
              const out: AIStreamChunk = { delta: '', done: true };
              if (usage) out.usage = usage;
              if (tcs.length > 0) out.toolCalls = tcs;
              if (finishReason) out.finishReason = finishReason;
              yield out;
              return;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    const tcs = toolAcc.finalize();
    const out: AIStreamChunk = { delta: '', done: true };
    if (usage) out.usage = usage;
    if (tcs.length > 0) out.toolCalls = tcs;
    if (finishReason) out.finishReason = finishReason;
    yield out;
  }

  /**
   * Lightweight liveness probe. Returns latency in ms on success.
   * Tries `/v1/models` first (OpenAI-compatible). Falls back to root.
   */
  async ping(timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number; detail?: string }> {
    const url = joinUrl(this.baseUrl, '/v1/models');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const t0 = Date.now();
    try {
      const r = await this.doFetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: ctrl.signal,
      });
      const latencyMs = Date.now() - t0;
      return { ok: r.ok, latencyMs, detail: r.ok ? undefined : `HTTP ${r.status}` };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - t0, detail: (err as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }
}

interface ParsedFrame {
  delta?: string;
  done?: boolean;
  usage?: AIUsage;
  toolCallDelta?: ChatToolCallWire[];
  finishReason?: AICompletionResult['finishReason'];
}

function parseSseFrame(frame: string): ParsedFrame[] {
  const out: ParsedFrame[] = [];
  for (const line of frame.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    if (payload === '[DONE]') {
      out.push({ done: true });
      continue;
    }
    try {
      const data = JSON.parse(payload) as ChatResponse;
      const choice = data.choices?.[0];
      const delta = choice?.delta?.content;
      const finish = choice?.finish_reason;
      const toolCallDelta = choice?.delta?.tool_calls ?? undefined;
      if (delta) out.push({ delta });
      if (toolCallDelta && toolCallDelta.length > 0) out.push({ toolCallDelta });
      if (data.usage) {
        out.push({
          usage: {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            costUSD: null,
          },
        });
      }
      if (finish) {
        const mapped = FINISH_MAP[finish] ?? 'stop';
        out.push({ done: true, finishReason: mapped });
      }
    } catch {
      // Ignore malformed frame; servers occasionally emit comments.
    }
  }
  return out;
}

/**
 * Stream tool-call delta accumulator. OpenAI emits tool_calls in chunks where
 * `index` identifies which call each delta belongs to. Final shape is the same
 * as non-stream `message.tool_calls`.
 */
class ToolCallAccumulator {
  private readonly slots = new Map<number, { id: string; name: string; args: string }>();

  absorb(deltas: ChatToolCallWire[]): void {
    for (const d of deltas) {
      const idx = d.index ?? 0;
      const slot = this.slots.get(idx) ?? { id: '', name: '', args: '' };
      if (d.id) slot.id = d.id;
      if (d.function?.name) slot.name += d.function.name;
      if (d.function?.arguments) slot.args += d.function.arguments;
      this.slots.set(idx, slot);
    }
  }

  finalize(): AIToolCall[] {
    return Array.from(this.slots.entries())
      .sort(([a], [b]) => a - b)
      .map(([idx, s]) => ({ id: s.id || `call_${idx}`, name: s.name, arguments: s.args }))
      .filter((t) => t.name.length > 0);
  }
}

function normalizeToolCalls(raw: ChatToolCallWire[] | null | undefined): AIToolCall[] {
  if (!raw || raw.length === 0) return [];
  return raw
    .map((t, i) => ({
      id: t.id || `call_${i}`,
      name: t.function?.name ?? '',
      arguments: t.function?.arguments ?? '',
    }))
    .filter((t) => t.name.length > 0);
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '(unreadable)';
  }
}

// Re-export for convenience.
export { AppError };
