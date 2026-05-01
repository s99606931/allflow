import { describe, expect, it, vi } from 'vitest';
import {
  BraveSearchAdapter,
  buildWebSearchAdapter,
  NoopWebSearchAdapter,
  SearxNGAdapter,
} from './web-search-adapter.js';

describe('NoopWebSearchAdapter', () => {
  it('search → 항상 빈 배열 반환', async () => {
    const adapter = new NoopWebSearchAdapter();
    const result = await adapter.search('테스트 쿼리');
    expect(result).toEqual([]);
  });

  it('maxResults 인수 무시하고 빈 배열 반환', async () => {
    const adapter = new NoopWebSearchAdapter();
    const result = await adapter.search('query', 10);
    expect(result).toEqual([]);
  });
});

describe('SearxNGAdapter', () => {
  it('fetch 실패(res.ok=false) → 빈 배열 반환', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new SearxNGAdapter('http://localhost:8080');
    const result = await adapter.search('test query');
    expect(result).toEqual([]);

    vi.unstubAllGlobals();
  });

  it('fetch 성공 → results 파싱 후 반환', async () => {
    const mockData = {
      results: [
        { title: '제목1', url: 'https://example.com/1', content: '내용1' },
        { title: '제목2', url: 'https://example.com/2', content: '내용2' },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new SearxNGAdapter('http://localhost:8080');
    const result = await adapter.search('test');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      title: '제목1',
      url: 'https://example.com/1',
      snippet: '내용1',
    });

    vi.unstubAllGlobals();
  });

  it('maxResults 제한 적용', async () => {
    const mockData = {
      results: Array.from({ length: 10 }, (_, i) => ({
        title: `제목${i}`,
        url: `https://example.com/${i}`,
        content: `내용${i}`,
      })),
    };
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new SearxNGAdapter('http://localhost:8080');
    const result = await adapter.search('test', 3);
    expect(result).toHaveLength(3);

    vi.unstubAllGlobals();
  });

  it('results가 undefined → 빈 배열 반환', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new SearxNGAdapter('http://localhost:8080');
    const result = await adapter.search('test');
    expect(result).toEqual([]);

    vi.unstubAllGlobals();
  });
});

describe('BraveSearchAdapter', () => {
  it('fetch 성공 → web.results 파싱', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: 'Brave', url: 'https://brave.com', description: '검색엔진' },
            { title: 'Brave Docs', url: 'https://brave.com/docs', description: '문서' },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new BraveSearchAdapter('test-key');
    const result = await adapter.search('brave', 5);
    expect(result).toHaveLength(2);
    expect(result[0]?.url).toBe('https://brave.com');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = (fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers;
    expect(headers['X-Subscription-Token']).toBe('test-key');
    vi.unstubAllGlobals();
  });

  it('fetch 실패 → 빈 배열', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new BraveSearchAdapter('test-key');
    const result = await adapter.search('q');
    expect(result).toEqual([]);
    vi.unstubAllGlobals();
  });
});

describe('buildWebSearchAdapter', () => {
  it('아무 env 없으면 NoopWebSearchAdapter 반환', () => {
    const adapter = buildWebSearchAdapter({});
    expect(adapter).toBeInstanceOf(NoopWebSearchAdapter);
  });

  it('SEARXNG_URL 있으면 SearxNGAdapter 반환 (legacy)', () => {
    const adapter = buildWebSearchAdapter({ SEARXNG_URL: 'http://localhost:8080' });
    expect(adapter).toBeInstanceOf(SearxNGAdapter);
  });

  it('WEB_SEARCH_PROVIDER=brave + key 있으면 BraveSearchAdapter 반환', () => {
    const adapter = buildWebSearchAdapter({
      WEB_SEARCH_PROVIDER: 'brave',
      BRAVE_SEARCH_API_KEY: 'k',
    });
    expect(adapter).toBeInstanceOf(BraveSearchAdapter);
  });

  it('WEB_SEARCH_PROVIDER=brave 인데 key 없으면 fallback', () => {
    const adapter = buildWebSearchAdapter({ WEB_SEARCH_PROVIDER: 'brave' });
    expect(adapter).toBeInstanceOf(NoopWebSearchAdapter);
  });

  it('WEB_SEARCH_PROVIDER=searxng + URL 있으면 SearxNGAdapter 반환', () => {
    const adapter = buildWebSearchAdapter({
      WEB_SEARCH_PROVIDER: 'searxng',
      SEARXNG_URL: 'http://localhost:8080',
    });
    expect(adapter).toBeInstanceOf(SearxNGAdapter);
  });
});
