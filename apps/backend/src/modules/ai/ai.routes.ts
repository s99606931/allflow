import { ValidationError } from '@all-flow/shared/errors';
/**
 * AI 라우트 — `POST /ai/complete` (non-stream + SSE) + tool-call agentic loop.
 *
 * OpenAPI 컨트랙트:
 *   요청: { prompt: string, context?: object, stream?: boolean, useTools?: boolean }
 *   응답 (stream=false):
 *     { text, citations: [...], toolTrace?: [{id,name,arguments,result,iteration,latencyMs}] }
 *   응답 (stream=true): SSE — `data: <JSON {delta?, done?, citations?, toolTrace?}>\n\n`
 *
 * 어댑터:
 *   - registry.get() 의 기본 adapter 사용 (LLM 미설정 시 InMemoryAdapter).
 *   - context 는 system prompt 로 직렬화하여 첫 메시지에 주입.
 *   - opts.dispatcher 가 주입되면 tool-call loop 활성화 (기본 useTools=true).
 *
 * 후속:
 *   - 토큰/비용 메트릭 + 프롬프트 버전.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { recordAICall, resolveCost } from '../reports/ai-observability.js';
import type { AIAdapter, AIAdapterRegistry, AIMessage, AIUsage } from './ai-adapter.js';
import { DEFAULT_THRESHOLD, extractActions, SOURCES } from './extract-actions.js';
import type { ToolDispatcher, ToolExecCtx } from './tool-dispatcher.js';
import { runToolLoop, type ToolTraceEntry } from './tool-loop.js';
import type { WebSearchAdapter } from './web-search-adapter.js';

const CompleteRequest = z.object({
  prompt: z.string().min(1).max(8000),
  context: z.record(z.string(), z.unknown()).optional(),
  stream: z.boolean().default(false),
  /** 기본 true. dispatcher 미주입이면 항상 비활성. */
  useTools: z.boolean().default(true),
});

interface Citation {
  kind: 'task' | 'doc' | 'message' | 'issue';
  id: string;
}

/** F3 — tool-call 토큰 사용량/비용 메트릭 응답 페이로드. */
interface UsageMetric {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number | null;
  model?: string;
}

interface CompleteResponse {
  text: string;
  citations: Citation[];
  toolTrace?: ToolTraceEntry[];
  usage?: UsageMetric;
}

function toUsageMetric(usage: AIUsage, model: string | undefined): UsageMetric {
  const out: UsageMetric = {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.promptTokens + usage.completionTokens,
    costUSD: resolveCost(usage, model),
  };
  if (model) out.model = model;
  return out;
}

declare module 'fastify' {
  interface FastifyInstance {
    aiRegistry: AIAdapterRegistry;
  }
}

export interface AIRoutesOptions {
  registry: AIAdapterRegistry;
  /** 주입 시 tool-call agentic loop 활성화. */
  dispatcher?: ToolDispatcher;
  /** dispatcher 의 web_search tool 이 사용할 어댑터. */
  webSearch?: WebSearchAdapter;
}

export async function aiRoutes(app: FastifyInstance, opts: AIRoutesOptions): Promise<void> {
  if (!app.hasDecorator('aiRegistry')) {
    app.decorate('aiRegistry', opts.registry);
  }

  app.post('/ai/complete', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = CompleteRequest.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { prompt, context, stream, useTools } = parsed.data;

    const messages = buildMessages(prompt, context);
    const adapter = opts.registry.get();
    const useToolLoop = useTools && !!opts.dispatcher;
    const userId = req.user?.id;

    if (!stream) {
      const result = useToolLoop
        ? await runWithTools(adapter, messages, opts, req.id, userId, app)
        : await runNonStream(adapter, messages, req.id);
      recordAICall(req.log, {
        route: '/ai/complete',
        adapter: adapter.name,
        promptKey: 'ai.complete',
        model: result.model,
        usage: result.usage,
      });
      const body: CompleteResponse = {
        text: result.text,
        citations: result.citations,
        usage: toUsageMetric(result.usage, result.model),
      };
      if (result.toolTrace && result.toolTrace.length > 0) body.toolTrace = result.toolTrace;
      return body;
    }

    return await runStream(adapter, messages, req.id, reply, req.log, opts, useToolLoop, userId, app);
  });

  app.post('/ai/extract-actions', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = ExtractActionsRequest.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const adapter = opts.registry.get();
    const out = await extractActions(adapter, parsed.data, { traceId: req.id });
    recordAICall(req.log, {
      route: '/ai/extract-actions',
      adapter: adapter.name,
      promptKey: 'ai.extract-actions',
    });
    return out;
  });
}

const ExtractActionsRequest = z.object({
  source: z.enum(SOURCES),
  content: z.string().min(1).max(50_000),
  threshold: z.number().min(0).max(1).default(DEFAULT_THRESHOLD),
});

/**
 * 인용 마커 가이드 — F1.
 *
 * tool-call (rag_search/search_tasks/search_issues) 또는 컨텍스트에서 얻은
 * task/issue/doc/message ID 를 답변 본문에 `[kind:id]` 형식으로 직접 삽입하도록
 * 모델에 지시한다. 모델 출력은 `extractCitations` 가 그대로 파싱해
 * `citations` 배열로 변환된다.
 */
export const CITATION_SYSTEM_PROMPT = [
  '당신은 ALL-Flow 프로젝트 어시스턴트입니다.',
  '답변에 다음 ID 를 참조할 때는 반드시 `[kind:id]` 형식의 인용 마커를 본문에 직접 삽입하세요.',
  '  - task → `[task:<id>]`',
  '  - issue → `[issue:<id>]`',
  '  - doc → `[doc:<id>]`',
  '  - message → `[message:<id>]`',
  'rag_search / search_tasks / search_issues 결과의 항목을 사용했다면 해당 ID 를 누락 없이 마커로 표기합니다.',
  '추측한 ID 는 사용하지 마세요. 컨텍스트나 도구 응답에 없는 ID 는 인용하지 않습니다.',
].join('\n');

function buildMessages(prompt: string, context?: Record<string, unknown>): AIMessage[] {
  const messages: AIMessage[] = [{ role: 'system', content: CITATION_SYSTEM_PROMPT }];
  if (context && Object.keys(context).length > 0) {
    messages.push({
      role: 'system',
      content: `다음 컨텍스트를 참고하여 답변하세요:\n${JSON.stringify(context, null, 2)}`,
    });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

interface NonStreamResult {
  text: string;
  citations: Citation[];
  toolTrace?: ToolTraceEntry[];
  model: string;
  usage: AIUsage;
}

async function runNonStream(
  adapter: AIAdapter,
  messages: AIMessage[],
  traceId: string,
): Promise<NonStreamResult> {
  const r = await adapter.complete(messages, { traceId });
  return {
    text: r.text,
    citations: extractCitations(r.text),
    model: r.model,
    usage: r.usage,
  };
}

async function runWithTools(
  adapter: AIAdapter,
  messages: AIMessage[],
  opts: AIRoutesOptions,
  traceId: string,
  userId: string | undefined,
  app: FastifyInstance,
): Promise<NonStreamResult> {
  const dispatcher = opts.dispatcher;
  if (!dispatcher) return runNonStream(adapter, messages, traceId);
  const ctx: ToolExecCtx = {
    prisma: app.prisma,
    ...(opts.webSearch ? { webSearch: opts.webSearch } : {}),
    ...(userId ? { userId } : {}),
  };
  const r = await runToolLoop({ adapter, messages, dispatcher, ctx, traceId });
  return {
    text: r.text,
    citations: extractCitations(r.text),
    model: r.model,
    usage: r.usage,
    ...(r.trace.length > 0 ? { toolTrace: r.trace } : {}),
  };
}

async function runStream(
  adapter: AIAdapter,
  messages: AIMessage[],
  traceId: string,
  reply: import('fastify').FastifyReply,
  log: import('fastify').FastifyBaseLogger,
  opts: AIRoutesOptions,
  useToolLoop: boolean,
  userId: string | undefined,
  app: FastifyInstance,
): Promise<unknown> {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // tool-call loop 결과는 1회 비스트림 호출 후 텍스트 청크로 흘려보낸다.
  if (useToolLoop && opts.dispatcher) {
    const ctx: ToolExecCtx = {
      prisma: app.prisma,
      ...(opts.webSearch ? { webSearch: opts.webSearch } : {}),
      ...(userId ? { userId } : {}),
    };
    const r = await runToolLoop({
      adapter,
      messages,
      dispatcher: opts.dispatcher,
      ctx,
      traceId,
    });
    if (r.text) reply.raw.write(`data: ${JSON.stringify({ delta: r.text })}\n\n`);
    const finalPayload = {
      done: true,
      citations: extractCitations(r.text),
      usage: toUsageMetric(r.usage, r.model),
      ...(r.trace.length > 0 ? { toolTrace: r.trace } : {}),
    };
    reply.raw.write(`data: ${JSON.stringify(finalPayload)}\n\n`);
    reply.raw.end();
    recordAICall(log, {
      route: '/ai/complete',
      adapter: adapter.name,
      promptKey: 'ai.complete',
      model: r.model,
      usage: r.usage,
    });
    return reply;
  }

  let fullText = '';
  let finalUsage: AIUsage | undefined;
  for await (const chunk of adapter.stream(messages, { traceId })) {
    if (chunk.delta) {
      fullText += chunk.delta;
      reply.raw.write(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
    }
    if (chunk.done) {
      finalUsage = chunk.usage;
      const citations = extractCitations(fullText);
      const donePayload: Record<string, unknown> = { done: true, citations };
      if (finalUsage) donePayload.usage = toUsageMetric(finalUsage, adapter.name);
      reply.raw.write(`data: ${JSON.stringify(donePayload)}\n\n`);
    }
  }
  reply.raw.end();
  recordAICall(log, {
    route: '/ai/complete',
    adapter: adapter.name,
    promptKey: 'ai.complete',
    usage: finalUsage,
  });
  return reply;
}

/**
 * 본문에서 [kind:id] 형식 인용 마커를 추출.
 * 예: "관련 태스크 [task:t-123]" → [{ kind: 'task', id: 't-123' }]
 */
const CITATION_RE = /\[(task|doc|message|issue):([A-Za-z0-9_-]+)\]/g;

export function extractCitations(text: string): Citation[] {
  const out: Citation[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    out.push({ kind: m[1] as Citation['kind'], id: m[2] ?? '' });
  }
  return out;
}
