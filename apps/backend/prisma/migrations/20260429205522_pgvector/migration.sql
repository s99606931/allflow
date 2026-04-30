-- Migration: pgvector extension + embedding columns on tasks and issues
-- Similarity search: HNSW index (ef_construction=128, m=16) for approximate nearest neighbor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to tasks (1536 dims = OpenAI text-embedding-3-small)
ALTER TABLE "tasks" ADD COLUMN "embedding" vector(1536);

-- 3. Add embedding column to issues
ALTER TABLE "issues" ADD COLUMN "embedding" vector(1536);

-- 4. HNSW index on tasks for cosine similarity search
CREATE INDEX tasks_embedding_hnsw_idx
  ON "tasks" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- 5. HNSW index on issues for cosine similarity search
CREATE INDEX issues_embedding_hnsw_idx
  ON "issues" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);
