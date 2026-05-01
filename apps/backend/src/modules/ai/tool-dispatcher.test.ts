import { describe, expect, it } from 'vitest';
import {
  BUILTIN_TOOLS,
  ToolDispatcher,
  type ToolExecCtx,
  toolsToOpenAISpec,
} from './tool-dispatcher.js';
import type { WebSearchAdapter, WebSearchResult } from './web-search-adapter.js';

// biome-ignore lint/suspicious/noExplicitAny: prisma mock
type AnyPrisma = any;

function makeMockPrisma(taskResults: unknown[] = [], issueResults: unknown[] = []): AnyPrisma {
  return {
    task: { findMany: async () => taskResults },
    issue: { findMany: async () => issueResults },
    $queryRawUnsafe: async () => [],
  };
}

function makeCtx(prisma: AnyPrisma, webSearch?: WebSearchAdapter): ToolExecCtx {
  return webSearch ? { prisma, webSearch } : { prisma };
}

class StubWebSearch implements WebSearchAdapter {
  constructor(private readonly results: WebSearchResult[]) {}
  async search(_q: string, max?: number): Promise<WebSearchResult[]> {
    return this.results.slice(0, max ?? 5);
  }
}

describe('BUILTIN_TOOLS', () => {
  it('4개 툴 등록 (search_tasks, search_issues, rag_search, web_search)', () => {
    const names = BUILTIN_TOOLS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['search_tasks', 'search_issues', 'rag_search', 'web_search']),
    );
    expect(names).toHaveLength(4);
  });

  it('각 툴에 name/description/parameters/execute 필드 존재', () => {
    for (const tool of BUILTIN_TOOLS) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.parameters).toBe('object');
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('toolsToOpenAISpec → OpenAI function-tool 형식 변환', () => {
    const specs = toolsToOpenAISpec(BUILTIN_TOOLS);
    expect(specs).toHaveLength(4);
    for (const s of specs) {
      expect(s.type).toBe('function');
      expect(typeof s.function.name).toBe('string');
      expect(typeof s.function.description).toBe('string');
      expect(typeof s.function.parameters).toBe('object');
    }
  });
});

describe('ToolDispatcher', () => {
  it('list() → 등록된 툴 반환', () => {
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    expect(d.list()).toHaveLength(4);
    expect(d.list().map((t) => t.name)).toContain('search_tasks');
  });

  it('listAsOpenAISpec() → MCP 없을 때 빌트인만 반환', async () => {
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const specs = await d.listAsOpenAISpec();
    expect(specs).toHaveLength(4);
  });

  it('dispatch(search_tasks) → JSON 문자열 반환', async () => {
    const tasks = [{ id: 't1', title: '테스트', status: 'todo' }];
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch(
      'search_tasks',
      { query: '테스트' },
      makeCtx(makeMockPrisma(tasks)),
    );
    const parsed = JSON.parse(result) as unknown[];
    expect(parsed).toHaveLength(1);
    expect((parsed[0] as { id: string }).id).toBe('t1');
  });

  it('dispatch(search_issues) → JSON 문자열 반환', async () => {
    const issues = [{ id: 'i1', title: '이슈', status: 'open' }];
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch(
      'search_issues',
      { query: '이슈' },
      makeCtx(makeMockPrisma([], issues)),
    );
    const parsed = JSON.parse(result) as unknown[];
    expect(parsed).toHaveLength(1);
    expect((parsed[0] as { id: string }).id).toBe('i1');
  });

  it('dispatch(web_search) → 어댑터 없으면 error', async () => {
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch('web_search', { query: 'foo' }, makeCtx(makeMockPrisma()));
    const parsed = JSON.parse(result) as { error?: string };
    expect(parsed.error).toContain('웹 검색 어댑터');
  });

  it('dispatch(web_search) → 어댑터 있으면 결과 반환', async () => {
    const stub = new StubWebSearch([
      { title: 'TypeScript', url: 'https://ts.dev', snippet: 'lang' },
      { title: 'Go', url: 'https://go.dev', snippet: 'lang' },
    ]);
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch(
      'web_search',
      { query: 'lang', limit: 5 },
      makeCtx(makeMockPrisma(), stub),
    );
    const parsed = JSON.parse(result) as Array<{ url: string }>;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.url).toBe('https://ts.dev');
  });

  it('dispatch(web_search) → 빈 query 면 error', async () => {
    const stub = new StubWebSearch([]);
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch('web_search', { query: '' }, makeCtx(makeMockPrisma(), stub));
    const parsed = JSON.parse(result) as { error?: string };
    expect(parsed.error).toContain('비어있습니다');
  });

  it('dispatch(rag_search) → 빈 query 면 error', async () => {
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch('rag_search', { query: '' }, makeCtx(makeMockPrisma()));
    const parsed = JSON.parse(result) as { error?: string };
    expect(parsed.error).toContain('비어있습니다');
  });

  it('dispatch(rag_search) → OPENAI_API_KEY 없으면 error JSON 반환 (throw 안함)', async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = undefined;
    try {
      const d = new ToolDispatcher(BUILTIN_TOOLS);
      const result = await d.dispatch(
        'rag_search',
        { query: '디자인' },
        makeCtx(makeMockPrisma()),
      );
      const parsed = JSON.parse(result) as { error?: string };
      expect(parsed.error).toBeTruthy();
      expect(parsed.error).toContain('rag_search 실패');
    } finally {
      if (prevKey === undefined) {
        process.env.OPENAI_API_KEY = undefined;
      } else {
        process.env.OPENAI_API_KEY = prevKey;
      }
    }
  });

  it('dispatch(unknown_tool) → error JSON 반환', async () => {
    const d = new ToolDispatcher(BUILTIN_TOOLS);
    const result = await d.dispatch('unknown_tool', {}, makeCtx(makeMockPrisma()));
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toContain('알 수 없는 도구');
  });

  it('빈 툴 배열로 생성 후 dispatch → error', async () => {
    const d = new ToolDispatcher([]);
    const result = await d.dispatch('search_tasks', { query: 'x' }, makeCtx(makeMockPrisma()));
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeTruthy();
  });
});
