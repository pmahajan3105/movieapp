BEGIN;

-- Storyline enrichment columns
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS storyline_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS review_sentiment JSONB,
  ADD COLUMN IF NOT EXISTS social_buzz_score DECIMAL(3,2);

COMMIT; 