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
import { AppError } from '../../shared/errors.js';

export type AIRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIRole;
  content: string;
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
}

export interface AIStreamChunk {
  delta: string;
  done: boolean;
  usage?: AIUsage;
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
    return {
      text,
      finishReason: 'stop',
      usage: {
        promptTokens: messages.reduce((s, m) => s + m.content.length, 0),
        completionTokens: text.length,
        costUSD: 0,
      },
      model: 'in-memory',
    };
  }

  async *stream(messages: AIMessage[], opts: AICompleteOptions = {}): AsyncIterable<AIStreamChunk> {
    const result = await this.complete(messages, opts);
    // 4 글자 청크로 분할
    const chunkSize = 4;
    for (let i = 0; i < result.text.length; i += chunkSize) {
      yield { delta: result.text.slice(i, i + chunkSize), done: false };
    }
    yield { delta: '', done: true, usage: result.usage };
  }
}

/**
 * OpenAI 어댑터 — T-401 단계는 인터페이스 노출만. 실제 fetch 호출은 T-402.
 * 의존성 추가를 피하기 위해 fetch 기반으로 구현 예정.
 */
export class OpenAIAdapter implements AIAdapter {
  readonly name = 'openai';

  constructor(private readonly opts: { apiKey: string; baseUrl?: string; defaultModel?: string }) {
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

/** 단순 레지스트리. T-406 에서 모델 라우팅/페일오버로 확장. */
export class AIAdapterRegistry {
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

/**
 * env 기반 기본 레지스트리 빌더.
 * OPENAI_API_KEY 가 있으면 OpenAIAdapter 등록, 없으면 InMemoryAdapter (개발/테스트 안전망).
 */
export function buildDefaultAIRegistry(env: { OPENAI_API_KEY?: string }): AIAdapterRegistry {
  const reg = new AIAdapterRegistry();
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
