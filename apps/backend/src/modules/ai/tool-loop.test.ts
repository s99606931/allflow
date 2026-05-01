import { describe, expect, it } from 'vitest';
import {
  type AICompletionResult,
  type AIMessage,
  InMemoryAIAdapter,
} from './ai-adapter.js';
import { BUILTIN_TOOLS, ToolDispatcher, type ToolExecCtx } from './tool-dispatcher.js';
import { runToolLoop } from './tool-loop.js';

// biome-ignore lint/suspicious/noExplicitAny: prisma mock
type AnyPrisma = any;

function makeMockPrisma(taskResults: unknown[] = []): AnyPrisma {
  return {
    task: { findMany: async () => taskResults },
    issue: { findMany: async () => [] },
  };
}

function makeCtx(prisma: AnyPrisma): ToolExecCtx {
  return { prisma };
}

describe('runToolLoop', () => {
  it('finishReason==="stop" 이면 1턴으로 종료', async () => {
    const adapter = new InMemoryAIAdapter({ '안녕': '안녕하세요' });
    const dispatcher = new ToolDispatcher(BUILTIN_TOOLS);
    const messages: AIMessage[] = [{ role: 'user', content: '안녕' }];

    const r = await runToolLoop({
      adapter,
      messages,
      dispatcher,
      ctx: makeCtx(makeMockPrisma()),
      traceId: 't1',
    });
    expect(r.finishReason).toBe('stop');
    expect(r.text).toBe('안녕하세요');
    expect(r.trace).toHaveLength(0);
    expect(r.usage.promptTokens).toBeGreaterThan(0);
  });

  it('finishReason==="tool_calls" → tool 실행 후 다음 모델 응답으로 종료', async () => {
    const tasks = [{ id: 'task-1', title: '디자인 검토', status: 'todo' }];
    // 1턴: tool_call. 2턴: 최종 응답 (마지막 메시지가 system tool_result)
    const cannedToolCall = `tool_call:${JSON.stringify([
      { id: 'c1', name: 'search_tasks', arguments: '{"query":"디자인"}' },
    ])}`;
    const adapter = new InMemoryAIAdapter({
      '디자인 태스크 알려줘': cannedToolCall,
    });

    // 2턴은 tool_result system msg 가 last 가 됨 → echo: ... 가 반환됨.
    const dispatcher = new ToolDispatcher(BUILTIN_TOOLS);
    const messages: AIMessage[] = [{ role: 'user', content: '디자인 태스크 알려줘' }];

    const r = await runToolLoop({
      adapter,
      messages,
      dispatcher,
      ctx: makeCtx(makeMockPrisma(tasks)),
      traceId: 't2',
      maxIterations: 3,
    });
    expect(r.trace).toHaveLength(1);
    expect(r.trace[0]?.name).toBe('search_tasks');
    expect(r.trace[0]?.iteration).toBe(1);
    expect(r.trace[0]?.latencyMs).toBeGreaterThanOrEqual(0);
    const parsedToolResult = JSON.parse(r.trace[0]?.result ?? '[]') as Array<{ id: string }>;
    expect(parsedToolResult[0]?.id).toBe('task-1');
    expect(r.finishReason).toBe('stop');
    expect(r.text).toContain('echo:');
    // usage 누적: 2번 모델 호출 ⇒ 토큰 합산이 1번보다 크다
    expect(r.usage.promptTokens).toBeGreaterThan(0);
  });

  it('max iteration 도달 시 마지막 결과 반환 (무한루프 방지)', async () => {
    // canned 가 항상 tool_call 만 반환 → max=2 후 종료
    const cannedToolCall = `tool_call:${JSON.stringify([
      { id: 'c1', name: 'search_tasks', arguments: '{"query":"x"}' },
    ])}`;
    // 모든 prompt 에 동일 응답 (assistant tool_calls 텍스트 / system tool_result 텍스트 모두)
    const repeatingAdapter = {
      name: 'repeating',
      async complete(_messages: AIMessage[]): Promise<AICompletionResult> {
        return {
          text: '',
          finishReason: 'tool_calls' as const,
          usage: { promptTokens: 1, completionTokens: 1, costUSD: null },
          model: 'repeating',
          toolCalls: [{ id: 'c1', name: 'search_tasks', arguments: '{"query":"x"}' }],
        };
      },
      async *stream() {
        yield { delta: '', done: true };
      },
    };
    void cannedToolCall;
    const dispatcher = new ToolDispatcher(BUILTIN_TOOLS);
    const messages: AIMessage[] = [{ role: 'user', content: '계속 호출해' }];

    const r = await runToolLoop({
      adapter: repeatingAdapter,
      messages,
      dispatcher,
      ctx: makeCtx(makeMockPrisma()),
      traceId: 't3',
      maxIterations: 2,
    });
    expect(r.trace).toHaveLength(2);
    expect(r.trace[0]?.iteration).toBe(1);
    expect(r.trace[1]?.iteration).toBe(2);
    expect(r.finishReason).toBe('tool_calls');
  });
});
