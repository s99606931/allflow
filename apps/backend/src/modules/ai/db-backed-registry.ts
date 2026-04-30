/**
 * DB-backed AI adapter registry.
 *
 * Resolves the active LLM adapter at request time from the `llm_connections`
 * table. The active row is cached for `cacheTtlMs` to avoid a DB hit on every
 * `/ai/complete` call. `invalidate()` is called after every admin write.
 *
 * Falls back to:
 *   - the `seed` adapter passed in (e.g. OpenAI from env, or InMemory) when
 *     the DB has no active row, or when the DB query fails.
 *
 * This keeps `aiRoutes` unchanged: it still calls `registry.get()`.
 */
import type { PrismaClient } from '@prisma/client';
import type { AIAdapter, AIAdapterRegistry } from './ai-adapter.js';
import { AIAdapterError, InMemoryAIAdapter } from './ai-adapter.js';
import { OpenAICompatAdapter } from './openai-compat-adapter.js';

export interface DbBackedRegistryOptions {
  prisma: PrismaClient;
  /** Adapter used when DB has no active row or DB is unreachable. */
  fallback: AIAdapter;
  /** Cache TTL in ms for the active connection lookup. Default 30s. */
  cacheTtlMs?: number;
  /** Logger. */
  log?: { warn: (obj: unknown, msg?: string) => void };
}

export class DbBackedAIRegistry implements AIAdapterRegistry {
  private readonly prisma: PrismaClient;
  private readonly fallback: AIAdapter;
  private readonly cacheTtlMs: number;
  private readonly log?: DbBackedRegistryOptions['log'];

  private cachedAdapter: AIAdapter | null = null;
  private cachedKey = '';
  private cachedAt = 0;
  private inflight: Promise<AIAdapter> | null = null;

  constructor(opts: DbBackedRegistryOptions) {
    this.prisma = opts.prisma;
    this.fallback = opts.fallback;
    this.cacheTtlMs = opts.cacheTtlMs ?? 30_000;
    this.log = opts.log;
  }

  // AIAdapterRegistry contract — used by aiRoutes.
  // The synchronous `get()` cannot await DB; it returns the cached adapter
  // (refreshed lazily). On cold start, returns fallback once and triggers
  // background refresh.
  get(name?: string): AIAdapter {
    if (name) {
      // Named lookups bypass DB cache (used by tests / direct callers).
      if (name === this.fallback.name) return this.fallback;
      throw new AIAdapterError(`등록되지 않은 AI adapter: ${name}`);
    }
    const fresh = Date.now() - this.cachedAt < this.cacheTtlMs;
    if (this.cachedAdapter && fresh) return this.cachedAdapter;
    // Trigger background refresh; serve cached or fallback synchronously.
    void this.refresh();
    return this.cachedAdapter ?? this.fallback;
  }

  list(): string[] {
    const out = new Set<string>();
    out.add(this.fallback.name);
    if (this.cachedAdapter) out.add(this.cachedAdapter.name);
    return Array.from(out);
  }

  /** Force a registry rebuild. Awaited by admin write handlers. */
  async invalidate(): Promise<void> {
    this.cachedAdapter = null;
    this.cachedAt = 0;
    this.cachedKey = '';
    await this.refresh();
  }

  /** One-shot rebuild from DB. Idempotent under concurrent calls. */
  private async refresh(): Promise<AIAdapter> {
    if (this.inflight) return this.inflight;
    this.inflight = this.doRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async doRefresh(): Promise<AIAdapter> {
    try {
      const row = await this.prisma.llmConnection.findFirst({ where: { isActive: true } });
      if (!row) {
        this.cachedAdapter = this.fallback;
        this.cachedKey = `fallback:${this.fallback.name}`;
        this.cachedAt = Date.now();
        return this.fallback;
      }
      const key = `${row.id}:${row.updatedAt.getTime()}`;
      if (this.cachedAdapter && key === this.cachedKey) {
        this.cachedAt = Date.now();
        return this.cachedAdapter;
      }
      const adapter = new OpenAICompatAdapter({
        name: `${row.kind}:${row.model}`,
        baseUrl: row.baseUrl,
        model: row.model,
        apiKey: row.apiKey,
      });
      this.cachedAdapter = adapter;
      this.cachedKey = key;
      this.cachedAt = Date.now();
      return adapter;
    } catch (err) {
      this.log?.warn({ err: (err as Error).message }, 'llm registry refresh 실패 — fallback 사용');
      this.cachedAdapter = this.fallback;
      this.cachedAt = Date.now();
      return this.fallback;
    }
  }
}

/**
 * Test/dev helper: build a registry with InMemory fallback when no Prisma is
 * available. Production path uses `new DbBackedAIRegistry({ prisma, fallback })`.
 */
export function buildInMemoryFallback(): InMemoryAIAdapter {
  return new InMemoryAIAdapter();
}
