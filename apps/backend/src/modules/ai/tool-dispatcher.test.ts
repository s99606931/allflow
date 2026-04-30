import { describe, expect, it } from 'vitest';
import { BUILTIN_TOOLS, ToolDispatcher } from './tool-dispatcher.js';

// biome-ignore lint/suspicious/noExplicitAny: prisma mock
type AnyPrisma = any;

function makeMockPrisma(taskResults: unknown[] = [], issueResults: unknown[] = []): AnyPrisma {
  return {
    task: { findMany: async () => taskResults },
    issue: { findMany: async () => issueResults },
  };
}

describe('BUILTIN_TOOLS', () => {
  it('2개 툴이 등록됨 (search_tasks, search_issues)', () => {
    const names = BUILTIN_TOOLS.map((t) => t.name);
    expect(names).toContain('search_tasks');
    expect(names).toContain('search_issues');
    expect(names).toHaveLength(2);
  });

  it('각 툴에 name/description/parameters/execute 필드 존재', () => {
    for (const tool of BUILTIN_TOOLS) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.parameters).toBe('object');
      expect(typeof tool.execute).toBe('function');
    }
  });
});

describe('ToolDispatcher', () => {
  it('list() → 등록된 툴 반환', () => {
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    expect(d.list()).toHaveLength(2);
    expect(d.list().map((t) => t.name)).toContain('search_tasks');
  });

  it('dispatch(search_tasks) → JSON 문자열 반환', async () => {
    const tasks = [{ id: 't1', title: '테스트', status: 'todo' }];
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch('search_tasks', { query: '테스트' }, makeMockPrisma(tasks));
    const parsed = JSON.parse(result) as unknown[];
    expect(parsed).toHaveLength(1);
    expect((parsed[0] as { id: string }).id).toBe('t1');
  });

  it('dispatch(search_issues) → JSON 문자열 반환', async () => {
    const issues = [{ id: 'i1', title: '이슈', status: 'open' }];
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch('search_issues', { query: '이슈' }, makeMockPrisma([], issues));
    const parsed = JSON.parse(result) as unknown[];
    expect(parsed).toHaveLength(1);
    expect((parsed[0] as { id: string }).id).toBe('i1');
  });

  it('dispatch(unknown_tool) → error JSON 반환', async () => {
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch('unknown_tool', {}, makeMockPrisma());
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toContain('알 수 없는 도구');
  });

  it('빈 툴 배열로 생성 후 dispatch → error', async () => {
    const d = new ToolDispatcher([]);
    const result = await d.dispatch('search_tasks', { query: 'x' }, makeMockPrisma());
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeTruthy();
  });
});
