import { ValidationError } from '@all-flow/shared/errors';
/**
 * AI 라우트 — T-402: `POST /ai/complete` (non-stream + SSE).
 *
 * OpenAPI 컨트랙트:
 *   요청: { prompt: string, context?: object, stream?: boolean }
 *   응답:
 *     - stream=false: { text, citations: [{ kind, id }] }
 *     - stream=true : SSE — `data: <JSON {delta?, done?, citations?}>\n\n`
 *
 * 어댑터:
 *   - registry.get() 의 기본 adapter 사용 (OPENAI_API_KEY 없으면 InMemoryAdapter).
 *   - context 는 system prompt 로 직렬화하여 첫 메시지에 주입.
 *
 * 후속:
 *   - T-403: extract-actions
 *   - T-406: 토큰/비용 메트릭 + 프롬프트 버전.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { recordAICall } from '../reports/ai-observability.js';
import type { AIAdapter, AIAdapterRegistry, AIMessage, AIUsage } from './ai-adapter.js';
import { DEFAULT_THRESHOLD, extractActions, SOURCES } from './extract-actions.js';

const CompleteRequest = z.object({
  prompt: z.string().min(1).max(8000),
  context: z.record(z.string(), z.unknown()).optional(),
  stream: z.boolean().default(false),
});

interface Citation {
  kind: 'task' | 'doc' | 'message' | 'issue';
  id: string;
}

interface CompleteResponse {
  text: string;
  citations: Citation[];
}

declare module 'fastify' {
  interface FastifyInstance {
    aiRegistry: AIAdapterRegistry;
  }
}

export interface AIRoutesOptions {
  registry: AIAdapterRegistry;
}

export async function aiRoutes(app: FastifyInstance, opts: AIRoutesOptions): Promise<void> {
  if (!app.hasDecorator('aiRegistry')) {
    app.decorate('aiRegistry', opts.registry);
  }

  app.post('/ai/complete', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = CompleteRequest.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { prompt, context, stream } = parsed.data;

    const messages = buildMessages(prompt, context);
    const adapter = opts.registry.get();

    if (!stream) {
      const result = await runNonStream(adapter, messages, req.id);
      recordAICall(req.log, {
        route: '/ai/complete',
        adapter: adapter.name,
        promptKey: 'ai.complete',
        model: result.model,
        usage: result.usage,
      });
      return { text: result.text, citations: result.citations };
    }

    return await runStream(adapter, messages, req.id, reply, req.log);
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

function buildMessages(prompt: string, context?: Record<string, unknown>): AIMessage[] {
  const messages: AIMessage[] = [];
  if (context && Object.keys(context).length > 0) {
    messages.push({
      role: 'system',
      content: `다음 컨텍스트를 참고하여 답변하세요:\n${JSON.stringify(context, null, 2)}`,
    });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

interface NonStreamResult extends CompleteResponse {
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

async function runStream(
  adapter: AIAdapter,
  messages: AIMessage[],
  traceId: string,
  reply: import('fastify').FastifyReply,
  log: import('fastify').FastifyBaseLogger,
): Promise<unknown> {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

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
      reply.raw.write(`data: ${JSON.stringify({ done: true, citations })}\n\n`);
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
