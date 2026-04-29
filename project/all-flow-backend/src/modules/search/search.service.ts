/**
 * semantic search service — pgvector cosine similarity.
 *
 * Embedding model: OpenAI text-embedding-3-small (1536 dims).
 * Falls back to error if OPENAI_API_KEY is absent.
 *
 * Raw SQL via $queryRawUnsafe: Prisma Unsupported() 타입은 findMany 필터에서
 * vector 연산자를 직접 지원하지 않으므로 raw query 사용.
 */
import type { PrismaClient } from '@prisma/client';
import pgvector from 'pgvector';

export interface SemanticHit {
  id: string;
  title: string;
  kind: 'task' | 'issue';
  score: number; // cosine similarity 0~1
  projectId: string;
}

export interface SemanticSearchOptions {
  query: string;
  limit?: number;
  targets?: Array<'tasks' | 'issues'>;
  projectId?: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set — cannot generate embeddings');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings API error ${res.status}: ${err}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const first = json.data[0];
  if (!first) throw new Error('OpenAI embeddings API returned empty data');
  return first.embedding;
}

export async function semanticSearch(
  prisma: PrismaClient,
  opts: SemanticSearchOptions,
): Promise<SemanticHit[]> {
  const limit = Math.min(opts.limit ?? 10, 50);
  const targets = opts.targets ?? ['tasks', 'issues'];

  const embedding = await generateEmbedding(opts.query);
  const vec = pgvector.toSql(embedding); // '[0.1, 0.2, ...]' format for pg

  const results: SemanticHit[] = [];

  if (targets.includes('tasks')) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; title: string; project_id: string; score: number }>
    >(
      `SELECT id, title, project_id, 1 - (embedding <=> $1::vector) AS score
       FROM tasks
       WHERE embedding IS NOT NULL AND deleted_at IS NULL
       ${opts.projectId ? `AND project_id = '${opts.projectId}'` : ''}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vec,
      limit,
    );
    for (const r of rows) {
      results.push({ id: r.id, title: r.title, kind: 'task', score: r.score, projectId: r.project_id });
    }
  }

  if (targets.includes('issues')) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; title: string; project_id: string; score: number }>
    >(
      `SELECT id, title, project_id, 1 - (embedding <=> $1::vector) AS score
       FROM issues
       WHERE embedding IS NOT NULL AND deleted_at IS NULL
       ${opts.projectId ? `AND project_id = '${opts.projectId}'` : ''}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vec,
      limit,
    );
    for (const r of rows) {
      results.push({ id: r.id, title: r.title, kind: 'issue', score: r.score, projectId: r.project_id });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Upsert embedding for a single task or issue (called after create/update).
 */
export async function upsertEmbedding(
  prisma: PrismaClient,
  kind: 'task' | 'issue',
  id: string,
  text: string,
): Promise<void> {
  const embedding = await generateEmbedding(text);
  const vec = pgvector.toSql(embedding);
  const table = kind === 'task' ? 'tasks' : 'issues';
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET embedding = $1::vector WHERE id = $2`,
    vec,
    id,
  );
}
