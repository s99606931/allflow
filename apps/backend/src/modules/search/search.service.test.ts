/**
 * search.service.ts 단위 테스트.
 * fetch (OpenAI embeddings)와 prisma raw query를 모킹하여 외부 의존 없이 검증.
 */
import type { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semanticSearch, upsertEmbedding } from './search.service.js';

const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => (i % 100) / 100);

// biome-ignore lint/suspicious/noExplicitAny: mock
type AnyArgs = any;

function mockFetchOk() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [{ embedding: FAKE_EMBEDDING }] }),
  });
}

function makePrisma(rows: { id: string; title: string; project_id: string; score: number }[] = []): PrismaClient {
  return {
    $queryRawUnsafe: vi.fn().mockResolvedValue(rows),
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
  } as unknown as PrismaClient;
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'sk-test-key';
  mockFetchOk();
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  vi.restoreAllMocks();
});

describe('semanticSearch', () => {
  it('returns mapped hits from query result', async () => {
    const rows = [
      { id: 'task-1', title: '배포 자동화', project_id: 'p1', score: 0.92 },
      { id: 'issue-2', title: '로그인 버그', project_id: 'p2', score: 0.85 },
    ];
    const prisma = makePrisma(rows);
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue(rows);

    const hits = await semanticSearch(prisma, {
      query: '배포',
      targets: ['tasks'],
    });

    expect(hits).toHaveLength(2);
    expect(hits[0]?.score).toBeGreaterThanOrEqual(hits[1]?.score ?? 0);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns empty array when prisma returns no rows', async () => {
    const prisma = makePrisma([]);

    const hits = await semanticSearch(prisma, { query: '없는 쿼리' });

    expect(hits).toEqual([]);
  });

  it('throws when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const prisma = makePrisma();

    await expect(semanticSearch(prisma, { query: 'test' })).rejects.toThrow('OPENAI_API_KEY');
  });

  it('throws when OpenAI API returns !ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
    const prisma = makePrisma();

    await expect(semanticSearch(prisma, { query: 'test' })).rejects.toThrow(/401/);
  });

  it('passes projectId filter: calls $queryRawUnsafe with 3 params', async () => {
    const prisma = makePrisma([]);

    await semanticSearch(prisma, { query: 'x', projectId: 'p1', targets: ['tasks'] });

    const calls = (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
    const args = calls[0] as AnyArgs[];
    expect(args).toHaveLength(4); // sql + vec + limit + projectId
  });

  it('without projectId: $queryRawUnsafe gets 3 args (sql + vec + limit)', async () => {
    const prisma = makePrisma([]);

    await semanticSearch(prisma, { query: 'x', targets: ['tasks'] });

    const calls = (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
    const args = calls[0] as AnyArgs[];
    expect(args).toHaveLength(3); // sql + vec + limit
  });

  it('respects limit option (max 50)', async () => {
    const prisma = makePrisma([]);

    await semanticSearch(prisma, { query: 'x', limit: 100, targets: ['tasks'] });

    const calls = (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
    const args = calls[0] as AnyArgs[];
    expect(args[2]).toBe(50); // clamped to 50
  });
});

describe('upsertEmbedding', () => {
  it('calls $executeRawUnsafe with correct SQL and params', async () => {
    const prisma = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    } as unknown as PrismaClient;

    await upsertEmbedding(prisma, 'task', 'task-123', '배포 태스크 제목');

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('tasks'),
      expect.any(String), // pgvector formatted string
      'task-123',
    );
  });

  it('uses "issues" table for issue kind', async () => {
    const prisma = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    } as unknown as PrismaClient;

    await upsertEmbedding(prisma, 'issue', 'issue-456', '이슈 제목');

    const sql = (prisma.$executeRawUnsafe as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(sql).toContain('issues');
  });

  it('throws when OPENAI_API_KEY is absent', async () => {
    delete process.env.OPENAI_API_KEY;
    const prisma = makePrisma();

    await expect(upsertEmbedding(prisma, 'task', 't1', 'x')).rejects.toThrow('OPENAI_API_KEY');
  });
});
