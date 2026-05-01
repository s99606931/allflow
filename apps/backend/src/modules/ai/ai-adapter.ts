/**
 * AI 어댑터 추상화 (T-401).
 *
 * 목적:
 *  - OpenAI 1차 구현이지만 외부에는 인터페이스만 노출 → Anthropic/로컬 모델로 무중단 교체
 *  - 도메인 코드(reports/extract-actions)는 `AIAdapter`만 의존
 *  - 토큰 사용량/비용 메트릭은 `AICompletionResult.usage` 로 표면화 (T-406)
 *
 * 본 단계에서는:
 *  - 인터페이스 + 메시지/옵션/결과 타입 + 에러 클래스 + 레지스트리 정의
 *  - 1개의 기본 구현체(OpenAIAdapter) 골격 (실제 fetch 호출은 T-402)
 *  - 테스트용 InMemoryAdapter (결정론적 응답)
 */
import { AppError } from '@all-flow/shared/errors';

export type AIRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIRole;
  content: string;
}

/**
 * OpenAI tool-calling spec — function tools만 지원 (2026-05 baseline).
 * MCP/내부 tools 모두 동일 shape으로 어댑터에 전달된다.
 */
export interface AIToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

/** 모델이 호출하기로 결정한 tool 1건 — `complete()` 결과 또는 stream done 청크에 포함. */
export interface AIToolCall {
  id: string;
  name: string;
  /** JSON-stringified arguments (OpenAI/LMStudio/Ollama 동일 형식). */
  arguments: string;
}

export interface AICompleteOptions {
  /** 모델 식별자 (예: gpt-5, gpt-5-mini). adapter 마다 매핑된다. */
  model?: string;
  /** 0 ~ 2. 미지정 시 어댑터 기본값. */
  temperature?: number;
  /** 최대 출력 토큰. */
  maxTokens?: number;
  /** stop sequence. */
  stop?: string[];
  /** trace/billing 식별자 (req.id 등). */
  traceId?: string;
  /** abort 신호. */
  signal?: AbortSignal;
  /**
   * 모델에 전달할 tool 정의. 비어있거나 미지정이면 일반 텍스트 응답만 반환된다.
   * 어댑터가 tool-call 미지원이면 무시된다 (graceful degradation).
   */
  tools?: AIToolDef[];
  /** OpenAI tool_choice — 'auto' (기본) / 'none' / 강제 함수. */
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  /** 1k 토큰 당 USD 환산 비용. 어댑터가 알 수 없으면 null. */
  costUSD: number | null;
}

export interface AICompletionResult {
  text: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
  usage: AIUsage;
  model: string;
  /** finishReason==='tool_calls' 일 때 모델이 요청한 호출 목록. */
  toolCalls?: AIToolCall[];
}

export interface AIStreamChunk {
  delta: string;
  done: boolean;
  usage?: AIUsage;
  /** 스트리밍 종료 시 누적된 tool_calls (있을 때만 동봉). */
  toolCalls?: AIToolCall[];
  /** 'stop' | 'tool_calls' | 'length' | ... */
  finishReason?: AICompletionResult['finishReason'];
}

export interface AIAdapter {
  readonly name: string;
  complete(messages: AIMessage[], opts?: AICompleteOptions): Promise<AICompletionResult>;
  stream(messages: AIMessage[], opts?: AICompleteOptions): AsyncIterable<AIStreamChunk>;
}

export class AIAdapterError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'AI_ADAPTER_ERROR', message, statusCode: 502, details });
    this.name = 'AIAdapterError';
  }
}

/**
 * 결정론적 InMemoryAdapter — 단위 테스트와 PDCA Plan 단계용.
 * 입력 메시지를 echo + 사전 등록된 응답을 반환한다.
 *
 * Tool-call 모킹: canned 값이 `tool_call:<JSON>` 형식이면 `toolCalls` 를 반환한다.
 *   예: { Hello: 'tool_call:[{"id":"c1","name":"search_tasks","arguments":"{\\"query\\":\\"x\\"}"}]' }
 */
export class InMemoryAIAdapter implements AIAdapter {
  readonly name = 'in-memory';
  private readonly canned: Map<string, string>;

  constructor(canned: Record<string, string> = {}) {
    this.canned = new Map(Object.entries(canned));
  }

  async complete(
    messages: AIMessage[],
    _opts: AICompleteOptions = {},
  ): Promise<AICompletionResult> {
    const last = messages[messages.length - 1];
    if (!last) throw new AIAdapterError('빈 messages 배열');
    const text = this.canned.get(last.content) ?? `echo: ${last.content}`;
    const toolCalls = parseCannedToolCalls(text);
    const baseUsage: AIUsage = {
      promptTokens: messages.reduce((s, m) => s + m.content.length, 0),
      completionTokens: text.length,
      costUSD: 0,
    };
    if (toolCalls) {
      return {
        text: '',
        finishReason: 'tool_calls',
        usage: baseUsage,
        model: 'in-memory',
        toolCalls,
      };
    }
    return { text, finishReason: 'stop', usage: baseUsage, model: 'in-memory' };
  }

  async *stream(messages: AIMessage[], opts: AICompleteOptions = {}): AsyncIterable<AIStreamChunk> {
    const result = await this.complete(messages, opts);
    if (result.toolCalls) {
      const out: AIStreamChunk = {
        delta: '',
        done: true,
        usage: result.usage,
        toolCalls: result.toolCalls,
        finishReason: 'tool_calls',
      };
      yield out;
      return;
    }
    const chunkSize = 4;
    for (let i = 0; i < result.text.length; i += chunkSize) {
      yield { delta: result.text.slice(i, i + chunkSize), done: false };
    }
    yield { delta: '', done: true, usage: result.usage, finishReason: 'stop' };
  }
}

/** `tool_call:<json-array>` prefix 를 파싱하여 AIToolCall[] 반환. 그 외엔 null. */
function parseCannedToolCalls(text: string): AIToolCall[] | null {
  if (!text.startsWith('tool_call:')) return null;
  try {
    const arr = JSON.parse(text.slice('tool_call:'.length)) as unknown;
    if (!Array.isArray(arr)) return null;
    const out: AIToolCall[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      if (!name) continue;
      out.push({
        id: typeof o.id === 'string' ? o.id : `c${out.length}`,
        name,
        arguments: typeof o.arguments === 'string' ? o.arguments : '{}',
      });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * OpenAI 어댑터 — T-401 단계는 인터페이스 노출만. 실제 fetch 호출은 T-402.
 * 의존성 추가를 피하기 위해 fetch 기반으로 구현 예정.
 */
export class OpenAIAdapter implements AIAdapter {
  readonly name = 'openai';

  constructor(readonly opts: { apiKey: string; baseUrl?: string; defaultModel?: string }) {
    if (!opts.apiKey) throw new AIAdapterError('OPENAI_API_KEY가 비어있습니다');
  }

  async complete(
    _messages: AIMessage[],
    _opts: AICompleteOptions = {},
  ): Promise<AICompletionResult> {
    // T-402 에서 fetch(`${baseUrl}/chat/completions`, ...) 로 구현
    throw new AIAdapterError('OpenAIAdapter.complete은 T-402에서 구현됩니다');
  }

  stream(_messages: AIMessage[], _opts: AICompleteOptions = {}): AsyncIterable<AIStreamChunk> {
    throw new AIAdapterError('OpenAIAdapter.stream은 T-402에서 구현됩니다');
  }
}

/**
 * Registry contract — `aiRoutes` and `reportsRoutes` only need `get()` + `list()`.
 *
 * Implementations:
 *   - `StaticAIAdapterRegistry` — env-built or test-built, in-memory map.
 *   - `DbBackedAIRegistry`     — DB lookup with TTL cache (production).
 */
export interface AIAdapterRegistry {
  get(name?: string): AIAdapter;
  list(): string[];
}

/** Static registry. Used in tests and as the env-built fallback seed. */
export class StaticAIAdapterRegistry implements AIAdapterRegistry {
  private readonly adapters = new Map<string, AIAdapter>();
  private defaultName: string | null = null;

  register(adapter: AIAdapter, isDefault = false): void {
    this.adapters.set(adapter.name, adapter);
    if (isDefault || this.defaultName === null) this.defaultName = adapter.name;
  }

  get(name?: string): AIAdapter {
    const key = name ?? this.defaultName;
    if (!key) throw new AIAdapterError('등록된 AI adapter가 없습니다');
    const a = this.adapters.get(key);
    if (!a) throw new AIAdapterError(`등록되지 않은 AI adapter: ${key}`);
    return a;
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/** Backwards-compatible alias — existing tests import `AIAdapterRegistry` as a class. */
export const AIAdapterRegistry = StaticAIAdapterRegistry;

/**
 * env 기반 기본 레지스트리 빌더.
 * OPENAI_API_KEY 가 있으면 OpenAIAdapter 등록, 없으면 InMemoryAdapter (개발/테스트 안전망).
 */
export function buildDefaultAIRegistry(env: { OPENAI_API_KEY?: string }): StaticAIAdapterRegistry {
  const reg = new StaticAIAdapterRegistry();
  if (env.OPENAI_API_KEY) {
    reg.register(
      new OpenAIAdapter({
        apiKey: env.OPENAI_API_KEY,
        defaultModel: 'gpt-5-mini',
      }),
      true,
    );
  }
  reg.register(new InMemoryAIAdapter(), !env.OPENAI_API_KEY);
  return reg;
}
