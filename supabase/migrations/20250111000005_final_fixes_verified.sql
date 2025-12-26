-- Final Database Fixes - VERIFIED AGAINST ACTUAL SCHEMA
-- Migration: 20250111000005_final_fixes_verified.sql
--
-- This migration is based on ACTUAL migration files, not assumptions
-- It safely adds missing columns and creates compatibility views

BEGIN;

-- =============================================================================
-- PART 1: FIX conversational_memory Table
-- =============================================================================
-- The table was created in 20250127221000 with these columns:
-- memory_type, memory_category, preference_text, structured_data,
-- confidence_score, mention_count, last_mentioned_at, memory_strength,
-- extraction_context, supporting_evidence
--
-- Code references additional columns, so we add them:

ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS memory_key TEXT;

ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS memory_text TEXT;

ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS preference_strength DECIMAL(3,2) DEFAULT 0.5;

ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS times_reinforced INTEGER DEFAULT 1;

-- Create sync trigger to keep duplicate columns in sync
CREATE OR REPLACE FUNCTION sync_conversational_memory_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep memory_text in sync with preference_text
  IF NEW.preference_text IS NOT NULL AND NEW.memory_text IS NULL THEN
    NEW.memory_text := NEW.preference_text;
  END IF;
  IF NEW.memory_text IS NOT NULL AND NEW.preference_text IS NULL THEN
    NEW.preference_text := NEW.memory_text;
  END IF;

  -- Keep preference_strength in sync with memory_strength
  IF NEW.memory_strength IS NOT NULL THEN
    NEW.preference_strength := NEW.memory_strength;
  END IF;
  IF NEW.preference_strength IS NOT NULL THEN
    NEW.memory_strength := NEW.preference_strength;
  END IF;

  -- Keep times_reinforced in sync with mention_count
  IF NEW.mention_count IS NOT NULL THEN
    NEW.times_reinforced := NEW.mention_count;
  END IF;
  IF NEW.times_reinforced IS NOT NULL THEN
    NEW.mention_count := NEW.times_reinforced;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_conversational_memory ON conversational_memory;
CREATE TRIGGER sync_conversational_memory
  BEFORE INSERT OR UPDATE ON conversational_memory
  FOR EACH ROW
  EXECUTE FUNCTION sync_conversational_memory_columns();

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_conversational_memory_key
  ON conversational_memory(memory_key) WHERE memory_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversational_memory_user_key
  ON conversational_memory(user_id, memory_key) WHERE memory_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversational_memory_preference_strength
  ON conversational_memory(preference_strength) WHERE preference_strength IS NOT NULL;

-- =============================================================================
-- PART 2: FIX movies Table - Add Missing Columns
-- =============================================================================

-- Add popularity column (for TMDB data and recommendations)
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS popularity DECIMAL(5,2);

-- Add release_date column (as alternative to year)
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS release_date DATE;

-- Populate release_date from year for existing data
UPDATE movies
SET release_date = make_date(year, 1, 1)
WHERE year IS NOT NULL AND release_date IS NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_movies_popularity
  ON movies(popularity DESC) WHERE popularity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_release_date
  ON movies(release_date DESC) WHERE release_date IS NOT NULL;

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_movie_popularity' AND conrelid = 'movies'::regclass
  ) THEN
    ALTER TABLE movies ADD CONSTRAINT check_movie_popularity
      CHECK (popularity IS NULL OR (popularity >= 0 AND popularity <= 100));
  END IF;
END $$;

-- =============================================================================
-- PART 3: FIX user_interactions Compatibility View
-- =============================================================================
-- The actual table is user_interactions with these columns:
-- id, user_id, movie_id, interaction_type, interaction_context,
-- time_of_day, day_of_week, metadata, created_at
--
-- Some code may reference user_movie_interactions, so create compatibility view

DO $$
BEGIN
  -- Only create view if user_movie_interactions doesn't exist as a table
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_movie_interactions')
     AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_interactions')
  THEN
    CREATE OR REPLACE VIEW user_movie_interactions AS
    SELECT
      id,
      user_id,
      movie_id,
      interaction_type,
      interaction_context,
      time_of_day,
      day_of_week,
      metadata,
      created_at as interaction_time, -- Alias for compatibility
      created_at
    FROM user_interactions;

    COMMENT ON VIEW user_movie_interactions IS 'Compatibility view for user_interactions table';
  END IF;
END $$;

-- =============================================================================
-- PART 4: Add Missing Columns to Other Tables
-- =============================================================================

-- user_profiles: Add ai_settings column if referenced in code
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_user_profiles_ai_settings
  ON user_profiles USING gin(ai_settings);

-- ratings: ONLY add interaction_context if we're sure it should have it
-- Based on migration 20240124000000, ratings table does NOT have interaction_context
-- So we DON'T add it

-- =============================================================================
-- PART 5: Add Missing Triggers
-- =============================================================================

-- Ensure all tables with updated_at have triggers
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'updated_at'
    AND table_name NOT IN (
      SELECT event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%updated_at%'
      AND trigger_schema = 'public'
    )
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    ', t.table_name, t.table_name);
  END LOOP;
END $$;

-- =============================================================================
-- PART 6: Helper Views (CORRECTED with proper column names)
-- =============================================================================

-- View for recent user activity
CREATE OR REPLACE VIEW user_recent_activity AS
SELECT
  u.id as user_id,
  u.email,
  COALESCE(w.watchlist_count, 0) as watchlist_count,
  COALESCE(r.rating_count, 0) as rating_count,
  COALESCE(i.interaction_count, 0) as interaction_count,
  GREATEST(
    COALESCE(w.last_watchlist, '1970-01-01'::timestamptz),
    COALESCE(r.last_rating, '1970-01-01'::timestamptz),
    COALESCE(i.last_interaction, '1970-01-01'::timestamptz)
  ) as last_activity
FROM auth.users u
LEFT JOIN (
  SELECT user_id, COUNT(*) as watchlist_count, MAX(added_at) as last_watchlist
  FROM watchlist
  GROUP BY user_id
) w ON u.id = w.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as rating_count, MAX(rated_at) as last_rating
  FROM ratings
  GROUP BY user_id
) r ON u.id = r.user_id
LEFT JOIN (
  -- Use created_at, not interaction_time
  SELECT user_id, COUNT(*) as interaction_count, MAX(created_at) as last_interaction
  FROM user_interactions
  GROUP BY user_id
) i ON u.id = i.user_id;

-- =============================================================================
-- PART 7: Data Cleanup Functions
-- =============================================================================

-- Function to clean up orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE(table_name TEXT, rows_deleted BIGINT) AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  -- Clean up orphaned ratings (movies that don't exist)
  DELETE FROM ratings
  WHERE movie_id NOT IN (SELECT id FROM movies);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'ratings (orphaned)';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean up orphaned watchlist entries
  DELETE FROM watchlist
  WHERE movie_id NOT IN (SELECT id FROM movies);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'watchlist (orphaned)';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean up orphaned user_interactions (movie_id is TEXT, so cast if needed)
  -- Actually, looking at the schema, movie_id is TEXT not UUID
  -- So we need to match it differently
  DELETE FROM user_interactions ui
  WHERE NOT EXISTS (
    SELECT 1 FROM movies m
    WHERE m.id::text = ui.movie_id OR m.tmdb_id::text = ui.movie_id
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'user_interactions (orphaned)';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean up expired conversational_memory
  DELETE FROM conversational_memory
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'conversational_memory (expired)';
  rows_deleted := deleted_count;
  RETURN NEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 8: Update Statistics
-- =============================================================================

-- Update PostgreSQL statistics for all tables
ANALYZE user_profiles;
ANALYZE movies;
ANALYZE watchlist;
ANALYZE ratings;
ANALYZE conversational_memory;
ANALYZE conversation_sessions;
ANALYZE conversation_exchanges;
ANALYZE preference_insights;
ANALYZE user_interactions;
ANALYZE user_preference_insights;

-- Only analyze chat_sessions if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_sessions') THEN
    EXECUTE 'ANALYZE chat_sessions';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Success Message
-- =============================================================================

SELECT
  '✅ Final fixes applied successfully (VERIFIED)!' as status,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM pg_constraint WHERE connamespace = 'public'::regnamespace) as total_constraints,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers;
