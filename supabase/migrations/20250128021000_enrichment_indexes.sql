BEGIN;

-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure enrichment columns exist in case earlier migration was skipped
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS storyline_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS review_sentiment JSONB,
  ADD COLUMN IF NOT EXISTS social_buzz_score DECIMAL(3,2);

-- IVFFlat index for fast cosine similarity on storyline embeddings
DO $$ BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_movies_storyline_embedding_cosine'
  ) THEN
    CREATE INDEX idx_movies_storyline_embedding_cosine
      ON movies USING ivfflat (storyline_embedding vector_cosine_ops) WITH (lists = 100);
  END IF;
END $$;

-- GIN index on review_sentiment JSONB
CREATE INDEX IF NOT EXISTS idx_movies_review_sentiment ON movies USING gin (review_sentiment);

-- Materialised view for minimal movie vector search
CREATE MATERIALIZED VIEW IF NOT EXISTS movies_minimal AS
  SELECT id, title, storyline_embedding FROM movies WHERE storyline_embedding IS NOT NULL;

-- Refresh the view immediately so it's usable
REFRESH MATERIALIZED VIEW movies_minimal;

COMMIT; 