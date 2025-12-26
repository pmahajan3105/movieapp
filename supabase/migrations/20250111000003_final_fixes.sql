-- Final Database Fixes and Enhancements
-- Migration: 20250111000003_final_fixes.sql
--
-- This migration fixes:
-- 1. conversational_memory table - adds missing columns
-- 2. movies table - adds missing popularity and release_date columns
-- 3. user_interactions - creates compatibility view
-- 4. All remaining schema issues

BEGIN;

-- =============================================================================
-- FIX 1: conversational_memory Table - Add Missing Columns
-- =============================================================================

-- Add missing columns that are referenced in code
ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS memory_key TEXT;

ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS memory_text TEXT;

ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS preference_strength DECIMAL(3,2) DEFAULT 0.5;

ALTER TABLE conversational_memory
  ADD COLUMN IF NOT EXISTS times_reinforced INTEGER DEFAULT 1;

-- Create sync trigger to keep duplicate columns in sync
-- (This handles the fact that different parts of code use different column names)
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

-- Add helpful comments
COMMENT ON COLUMN conversational_memory.memory_key IS 'Unique identifier for the preference (e.g., actor name, director name, genre name)';
COMMENT ON COLUMN conversational_memory.memory_text IS 'Alternative column name for preference_text (for API compatibility)';
COMMENT ON COLUMN conversational_memory.preference_strength IS 'Alternative column name for memory_strength (for API compatibility)';
COMMENT ON COLUMN conversational_memory.times_reinforced IS 'Alternative column name for mention_count (for API compatibility)';

-- =============================================================================
-- FIX 2: movies Table - Add Missing Columns
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

-- Add comments
COMMENT ON COLUMN movies.popularity IS 'TMDB popularity score (0-100)';
COMMENT ON COLUMN movies.release_date IS 'Full release date (alternative to year column)';

-- =============================================================================
-- FIX 3: user_interactions Compatibility
-- =============================================================================

-- Check which table exists and create compatibility view/alias

DO $$
BEGIN
  -- If user_movie_interactions exists but user_interactions doesn't, create view
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_movie_interactions')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_interactions')
  THEN
    CREATE OR REPLACE VIEW user_interactions AS
    SELECT * FROM user_movie_interactions;

    COMMENT ON VIEW user_interactions IS 'Compatibility view for user_movie_interactions table';
  END IF;

  -- If user_interactions exists but user_movie_interactions doesn't, create view
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_interactions')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_movie_interactions')
  THEN
    CREATE OR REPLACE VIEW user_movie_interactions AS
    SELECT * FROM user_interactions;

    COMMENT ON VIEW user_movie_interactions IS 'Compatibility view for user_interactions table';
  END IF;
END $$;

-- =============================================================================
-- FIX 4: Add Missing Columns to Other Tables
-- =============================================================================

-- user_profiles: Add ai_settings column if referenced in code
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_user_profiles_ai_settings
  ON user_profiles USING gin(ai_settings);

COMMENT ON COLUMN user_profiles.ai_settings IS 'User AI preferences and settings';

-- ratings: Add interaction_context column
ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS interaction_context JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ratings_context
  ON ratings USING gin(interaction_context);

COMMENT ON COLUMN ratings.interaction_context IS 'Additional context about the rating interaction';

-- =============================================================================
-- FIX 5: Add Missing Triggers
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
-- FIX 6: Add Missing RLS Policies
-- =============================================================================

-- Ensure all user-owned tables have basic RLS policies

-- conversational_memory (if not already set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversational_memory'
    AND policyname = 'Users can access their own conversational memory'
  ) THEN
    CREATE POLICY "Users can access their own conversational memory"
      ON conversational_memory
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- user_preference_insights (if not already set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_preference_insights'
    AND policyname = 'Users can view own insights'
  ) THEN
    CREATE POLICY "Users can view own insights"
      ON user_preference_insights
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================================================
-- FIX 7: Create Helper Views
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
  SELECT user_id, COUNT(*) as interaction_count, MAX(interaction_time) as last_interaction
  FROM user_movie_interactions
  WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_movie_interactions')
  GROUP BY user_id
) i ON u.id = i.user_id;

COMMENT ON VIEW user_recent_activity IS 'Summary of recent user activity across all tables';

-- =============================================================================
-- FIX 8: Data Cleanup Functions
-- =============================================================================

-- Function to clean up orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE(table_name TEXT, rows_deleted BIGINT) AS $$
DECLARE
  result_record RECORD;
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

  -- Clean up orphaned user_movie_interactions
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_movie_interactions') THEN
    DELETE FROM user_movie_interactions
    WHERE movie_id NOT IN (SELECT id FROM movies);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'user_movie_interactions (orphaned)';
    rows_deleted := deleted_count;
    RETURN NEXT;
  END IF;

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

COMMENT ON FUNCTION cleanup_orphaned_data IS 'Removes orphaned and expired data from all tables';

-- =============================================================================
-- FIX 9: Update Statistics
-- =============================================================================

-- Update PostgreSQL statistics for all tables
ANALYZE user_profiles;
ANALYZE movies;
ANALYZE watchlist;
ANALYZE ratings;
ANALYZE chat_sessions;
ANALYZE conversational_memory;
ANALYZE conversation_sessions;
ANALYZE conversation_exchanges;
ANALYZE preference_insights;

-- Analyze user_movie_interactions if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_movie_interactions') THEN
    EXECUTE 'ANALYZE user_movie_interactions';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Success Message and Summary
-- =============================================================================

SELECT
  'Final fixes applied successfully!' as status,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM pg_constraint WHERE connamespace = 'public'::regnamespace) as total_constraints,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers;

-- =============================================================================
-- Verification Queries (commented out - run these manually to verify)
-- =============================================================================

-- Check conversational_memory columns
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'conversational_memory'
-- ORDER BY ordinal_position;

-- Check movies columns
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'movies'
-- ORDER BY ordinal_position;

-- Check user_interactions compatibility
-- SELECT * FROM user_interactions LIMIT 1;
-- SELECT * FROM user_movie_interactions LIMIT 1;

-- Test cleanup function
-- SELECT * FROM cleanup_orphaned_data();

-- View user activity summary
-- SELECT * FROM user_recent_activity LIMIT 5;
