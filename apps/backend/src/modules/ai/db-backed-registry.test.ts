/**
 * DbBackedAIRegistry 단위 테스트.
 * Prisma를 모킹하여 캐시·폴백·무효화 로직을 검증.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIAdapterError, InMemoryAIAdapter } from './ai-adapter.js';
import { DbBackedAIRegistry } from './db-backed-registry.js';

// biome-ignore lint/suspicious/noExplicitAny: mock
type AnyArgs = any;

function makePrisma(row: Record<string, unknown> | null = null) {
  return {
    llmConnection: {
      findFirst: vi.fn().mockResolvedValue(row),
    },
  };
}

function makeRegistry(row: Record<string, unknown> | null = null, cacheTtlMs = 30_000) {
  const prisma = makePrisma(row);
  const fallback = new InMemoryAIAdapter({ test: 'fallback response' });
  const registry = new DbBackedAIRegistry({ prisma: prisma as AnyArgs, fallback, cacheTtlMs });
  return { registry, prisma, fallback };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DbBackedAIRegistry — get()', () => {
  it('returns fallback by name', () => {
    const { registry, fallback } = makeRegistry();
    expect(registry.get(fallback.name)).toBe(fallback);
  });

  it('throws AIAdapterError for unknown named adapter', () => {
    const { registry } = makeRegistry();
    expect(() => registry.get('nonexistent')).toThrow(AIAdapterError);
  });

  it('returns fallback on cold start (no cache yet)', async () => {
    const { registry, fallback } = makeRegistry(null);
    const adapter = registry.get();
    expect(adapter).toBe(fallback);
    // Allow background refresh to settle
    await new Promise((r) => setTimeout(r, 10));
  });

  it('returns cached adapter after invalidate + active row', async () => {
    const dbRow = {
      id: 'lc-1',
      kind: 'lmstudio',
      model: 'gemma-4b',
      baseUrl: 'http://localhost:1234',
      apiKey: null,
      isActive: true,
      updatedAt: new Date('2026-05-01T00:00:00Z'),
    };
    const { registry } = makeRegistry(dbRow);

    await registry.invalidate();
    const adapter = registry.get();

    expect(adapter.name).toBe('lmstudio:gemma-4b');
  });

  it('serves stale cache without DB hit when TTL not expired', async () => {
    const dbRow = {
      id: 'lc-2',
      kind: 'ollama',
      model: 'llama3',
      baseUrl: 'http://localhost:11434',
      apiKey: null,
      isActive: true,
      updatedAt: new Date(),
    };
    const { registry, prisma } = makeRegistry(dbRow, 60_000);

    await registry.invalidate();
    prisma.llmConnection.findFirst.mockClear();

    registry.get();
    registry.get();
    registry.get();

    // No additional DB calls because cache is fresh
    expect(prisma.llmConnection.findFirst).not.toHaveBeenCalled();
  });
});

describe('DbBackedAIRegistry — invalidate()', () => {
  it('clears cache so next get() triggers DB refresh', async () => {
    const dbRow = {
      id: 'lc-3',
      kind: 'lmstudio',
      model: 'phi-4',
      baseUrl: 'http://localhost:1234',
      apiKey: null,
      isActive: true,
      updatedAt: new Date(),
    };
    const { registry, prisma } = makeRegistry(dbRow);

    await registry.invalidate();
    const callsBefore = prisma.llmConnection.findFirst.mock.calls.length;

    await registry.invalidate();
    const callsAfter = prisma.llmConnection.findFirst.mock.calls.length;

    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});

describe('DbBackedAIRegistry — DB fallback paths', () => {
  it('falls back when no active row in DB', async () => {
    const { registry, fallback } = makeRegistry(null);
    await registry.invalidate();
    expect(registry.get()).toBe(fallback);
  });

  it('falls back silently on DB error, logs warn', async () => {
    const prisma = {
      llmConnection: { findFirst: vi.fn().mockRejectedValue(new Error('DB down')) },
    };
    const fallback = new InMemoryAIAdapter();
    const warnSpy = vi.fn();
    const registry = new DbBackedAIRegistry({
      prisma: prisma as AnyArgs,
      fallback,
      log: { warn: warnSpy },
    });

    await registry.invalidate();

    expect(registry.get()).toBe(fallback);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('DbBackedAIRegistry — list()', () => {
  it('always includes fallback name', () => {
    const { registry, fallback } = makeRegistry();
    expect(registry.list()).toContain(fallback.name);
  });

  it('includes DB adapter name after invalidate', async () => {
    const dbRow = {
      id: 'lc-4',
      kind: 'custom_openai_compat',
      model: 'gpt-local',
      baseUrl: 'http://myserver:8080',
      apiKey: 'sk-x',
      isActive: true,
      updatedAt: new Date(),
    };
    const { registry } = makeRegistry(dbRow);
    await registry.invalidate();
    expect(registry.list()).toContain('custom_openai_compat:gpt-local');
  });
});
