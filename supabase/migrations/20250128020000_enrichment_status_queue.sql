BEGIN;

-- Enum for enrichment status
DO $$ BEGIN
  CREATE TYPE enrichment_status AS ENUM ('pending','ok','failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add status column to movies if not exists
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS enrichment_status enrichment_status DEFAULT 'pending';

-- TMDB cache table
CREATE TABLE IF NOT EXISTS tmdb_cache (
  tmdb_id integer PRIMARY KEY,
  data jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now()
);

-- Retry queue for failed enrichments (simpler than generic job queue)
CREATE TABLE IF NOT EXISTS movie_enrichment_retry (
  movie_id text PRIMARY KEY,
  attempts integer DEFAULT 0,
  last_attempt_at timestamptz
);

COMMIT; 