/**
 * Tests for the OpenAI-compatible HTTP adapter (LMStudio/Ollama/OpenAI).
 * fetch is fully mocked — no network access.
 */
import { describe, expect, it } from 'vitest';
import { AIAdapterError } from './ai-adapter.js';
import { OpenAICompatAdapter } from './openai-compat-adapter.js';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('OpenAICompatAdapter', () => {
  it('complete() → POST /v1/chat/completions + parses choice + usage', async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    const adapter = new OpenAICompatAdapter({
      name: 'lmstudio:gemma',
      baseUrl: 'http://192.168.0.104:1234',
      model: 'gemma-4-e4b-it',
      fetchImpl: async (url, init) => {
        captured = { url: String(url), init: init as RequestInit };
        return jsonResponse({
          choices: [{ message: { content: 'hi from gemma' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 12, completion_tokens: 5 },
          model: 'gemma-4-e4b-it',
        });
      },
    });
    const r = await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(captured.url).toBe('http://192.168.0.104:1234/v1/chat/completions');
    expect((captured.init as RequestInit).method).toBe('POST');
    expect(r.text).toBe('hi from gemma');
    expect(r.usage.promptTokens).toBe(12);
    expect(r.usage.completionTokens).toBe(5);
    expect(r.model).toBe('gemma-4-e4b-it');
    expect(r.finishReason).toBe('stop');
  });

  it('complete() → non-2xx maps to AIAdapterError 502', async () => {
    const adapter = new OpenAICompatAdapter({
      name: 'x',
      baseUrl: 'http://localhost:9999',
      model: 'm',
      fetchImpl: async () => new Response('boom', { status: 500 }),
    });
    await expect(adapter.complete([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AIAdapterError,
    );
  });

  it('complete() → fetch throw maps to AIAdapterError', async () => {
    const adapter = new OpenAICompatAdapter({
      name: 'x',
      baseUrl: 'http://localhost:9999',
      model: 'm',
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    await expect(adapter.complete([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AIAdapterError,
    );
  });

  it('apiKey absent → no Authorization header (local LLM safe)', async () => {
    let headers: Headers | undefined;
    const adapter = new OpenAICompatAdapter({
      name: 'x',
      baseUrl: 'http://localhost:1234',
      model: 'm',
      fetchImpl: async (_url, init) => {
        headers = new Headers((init as RequestInit).headers);
        return jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });
      },
    });
    await adapter.complete([{ role: 'user', content: 'hi' }]);
    expect(headers?.get('authorization')).toBeNull();
  });

  it('apiKey present → Bearer token sent', async () => {
    let headers: Headers | undefined;
    const adapter = new OpenAICompatAdapter({
      name: 'x',
      baseUrl: 'http://localhost:1234',
      model: 'm',
      apiKey: 'sk-test',
      fetchImpl: async (_url, init) => {
        headers = new Headers((init as RequestInit).headers);
        return jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });
      },
    });
    await adapter.complete([{ role: 'user', content: 'hi' }]);
    expect(headers?.get('authorization')).toBe('Bearer sk-test');
  });

  it('ping() → ok=true on 200', async () => {
    const adapter = new OpenAICompatAdapter({
      name: 'x',
      baseUrl: 'http://localhost:1234',
      model: 'm',
      fetchImpl: async () => new Response('{}', { status: 200 }),
    });
    const r = await adapter.ping();
    expect(r.ok).toBe(true);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('ping() → ok=false on connection error', async () => {
    const adapter = new OpenAICompatAdapter({
      name: 'x',
      baseUrl: 'http://localhost:9999',
      model: 'm',
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    const r = await adapter.ping();
    expect(r.ok).toBe(false);
    expect(r.detail).toMatch(/ECONNREFUSED/);
  });

  it('stream() → parses SSE deltas + done sentinel', async () => {
    const sse =
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n' +
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
      'data: [DONE]\n\n';
    const adapter = new OpenAICompatAdapter({
      name: 'x',
      baseUrl: 'http://localhost:1234',
      model: 'm',
      fetchImpl: async () =>
        new Response(sse, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
    });
    const out: string[] = [];
    let done = false;
    for await (const c of adapter.stream([{ role: 'user', content: 'hi' }])) {
      if (c.delta) out.push(c.delta);
      if (c.done) done = true;
    }
    expect(out.join('')).toBe('Hello');
    expect(done).toBe(true);
  });

  it('constructor → empty baseUrl/model throws', () => {
    expect(() => new OpenAICompatAdapter({ name: 'x', baseUrl: '', model: 'm' })).toThrow(
      AIAdapterError,
    );
    expect(() => new OpenAICompatAdapter({ name: 'x', baseUrl: 'http://x', model: '' })).toThrow(
      AIAdapterError,
    );
  });
});
