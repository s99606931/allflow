export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchAdapter {
  search(query: string, maxResults?: number): Promise<WebSearchResult[]>;
}

export class SearxNGAdapter implements WebSearchAdapter {
  constructor(private readonly baseUrl: string) {}

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('engines', 'google,bing,duckduckgo');
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    return (data.results ?? []).slice(0, maxResults).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content ?? '',
    }));
  }
}

export class NoopWebSearchAdapter implements WebSearchAdapter {
  async search(_query: string, _maxResults?: number): Promise<WebSearchResult[]> {
    return [];
  }
}

export function buildWebSearchAdapter(env: { SEARXNG_URL?: string }): WebSearchAdapter {
  if (env.SEARXNG_URL) return new SearxNGAdapter(env.SEARXNG_URL);
  return new NoopWebSearchAdapter();
}
