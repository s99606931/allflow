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

/**
 * Brave Search API 어댑터 (https://api.search.brave.com).
 * 무료 1q/s tier 부터 시작 가능. API key 헤더는 `X-Subscription-Token`.
 */
export class BraveSearchAdapter implements WebSearchAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.search.brave.com',
  ) {}

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    const url = new URL('/res/v1/web/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(Math.min(maxResults, 20)));
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };
    const results = data.web?.results ?? [];
    return results.slice(0, maxResults).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.description ?? '',
    }));
  }
}

export class NoopWebSearchAdapter implements WebSearchAdapter {
  async search(_query: string, _maxResults?: number): Promise<WebSearchResult[]> {
    return [];
  }
}

/**
 * 우선순위:
 *   WEB_SEARCH_PROVIDER=brave + BRAVE_SEARCH_API_KEY → BraveSearchAdapter
 *   WEB_SEARCH_PROVIDER=searxng + SEARXNG_URL        → SearxNGAdapter
 *   (legacy) SEARXNG_URL                              → SearxNGAdapter
 *   else                                              → NoopWebSearchAdapter
 */
export function buildWebSearchAdapter(env: {
  WEB_SEARCH_PROVIDER?: string;
  SEARXNG_URL?: string;
  BRAVE_SEARCH_API_KEY?: string;
}): WebSearchAdapter {
  const provider = env.WEB_SEARCH_PROVIDER?.toLowerCase();
  if (provider === 'brave' && env.BRAVE_SEARCH_API_KEY) {
    return new BraveSearchAdapter(env.BRAVE_SEARCH_API_KEY);
  }
  if (provider === 'searxng' && env.SEARXNG_URL) {
    return new SearxNGAdapter(env.SEARXNG_URL);
  }
  if (env.SEARXNG_URL) return new SearxNGAdapter(env.SEARXNG_URL);
  return new NoopWebSearchAdapter();
}
