-- Restore HNSW indexes on tasks/issues embedding columns (F2 — Phase 2).
-- 20260501134457_add_ai_tables 가 두 인덱스를 DROP 하였으나 pgvector RAG 검색 의존성 유지를 위해 복구.
-- PRD 가이드: m=16, ef_construction=64. (원본 64 ≤ 128 사이의 절충값으로 빌드 시간/품질 균형)

CREATE INDEX IF NOT EXISTS tasks_embedding_hnsw_idx
  ON "tasks" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS issues_embedding_hnsw_idx
  ON "issues" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
