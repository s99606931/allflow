import { describe, expect, it } from 'vitest';
import {
  AIAdapterError,
  AIAdapterRegistry,
  InMemoryAIAdapter,
  OpenAIAdapter,
  buildDefaultAIRegistry,
} from './ai-adapter.js';

describe('AI adapter — InMemoryAdapter', () => {
  it('canned 매칭 → 등록된 응답', async () => {
    const a = new InMemoryAIAdapter({ ping: 'pong' });
    const r = await a.complete([{ role: 'user', content: 'ping' }]);
    expect(r.text).toBe('pong');
    expect(r.finishReason).toBe('stop');
    expect(r.usage.promptTokens).toBeGreaterThan(0);
    expect(r.usage.completionTokens).toBe('pong'.length);
  });

  it('canned 미매칭 → echo', async () => {
    const a = new InMemoryAIAdapter();
    const r = await a.complete([{ role: 'user', content: 'hello' }]);
    expect(r.text).toBe('echo: hello');
  });

  it('빈 메시지 → AIAdapterError', async () => {
    const a = new InMemoryAIAdapter();
    await expect(a.complete([])).rejects.toBeInstanceOf(AIAdapterError);
  });

  it('stream → 청크 배열로 분할 + done 마지막', async () => {
    const a = new InMemoryAIAdapter({ q: 'abcdefgh' });
    const chunks: { delta: string; done: boolean }[] = [];
    for await (const c of a.stream([{ role: 'user', content: 'q' }])) chunks.push(c);
    const last = chunks[chunks.length - 1];
    expect(last?.done).toBe(true);
    const text = chunks
      .filter((c) => !c.done)
      .map((c) => c.delta)
      .join('');
    expect(text).toBe('abcdefgh');
  });
});

describe('AI adapter — OpenAIAdapter (skeleton)', () => {
  it('apiKey 누락 → AIAdapterError', () => {
    expect(() => new OpenAIAdapter({ apiKey: '' })).toThrow(AIAdapterError);
  });

  it('complete/stream 호출 → 미구현 에러 (T-402 예정)', async () => {
    const a = new OpenAIAdapter({ apiKey: 'sk-test' });
    await expect(a.complete([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AIAdapterError,
    );
  });
});

describe('AI adapter — Registry', () => {
  it('default 미설정 시 첫 등록이 default', () => {
    const reg = new AIAdapterRegistry();
    reg.register(new InMemoryAIAdapter());
    expect(reg.get().name).toBe('in-memory');
  });

  it('미등록 이름 → AIAdapterError', () => {
    const reg = new AIAdapterRegistry();
    reg.register(new InMemoryAIAdapter());
    expect(() => reg.get('unknown')).toThrow(AIAdapterError);
  });

  it('빈 레지스트리 get → AIAdapterError', () => {
    const reg = new AIAdapterRegistry();
    expect(() => reg.get()).toThrow(AIAdapterError);
  });

  it('buildDefaultAIRegistry: OPENAI_API_KEY 없으면 in-memory default', () => {
    const reg = buildDefaultAIRegistry({});
    expect(reg.get().name).toBe('in-memory');
    expect(reg.list()).toContain('in-memory');
  });

  it('buildDefaultAIRegistry: OPENAI_API_KEY 있으면 openai default', () => {
    const reg = buildDefaultAIRegistry({ OPENAI_API_KEY: 'sk-test' });
    expect(reg.get().name).toBe('openai');
    expect(reg.list()).toEqual(expect.arrayContaining(['openai', 'in-memory']));
  });
});
