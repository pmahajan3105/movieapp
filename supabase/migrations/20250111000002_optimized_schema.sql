-- Optimized Database Schema with All Improvements
-- Migration: 20250111000002_optimized_schema.sql
--
-- This migration includes:
-- 1. Missing performance indexes
-- 2. Proper constraints and validations
-- 3. Full-text search support
-- 4. JSONB indexes for AI queries
-- 5. Updated-at triggers for all tables
-- 6. Deduplication of ratings (removed from watchlist)
-- 7. Data quality constraints

BEGIN;

-- =============================================================================
-- PART 1: ADD MISSING PERFORMANCE INDEXES
-- =============================================================================

-- Movies: Full-text search index
CREATE INDEX IF NOT EXISTS idx_movies_title_search
  ON movies USING gin(to_tsvector('english', title));

-- Movies: Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id) WHERE imdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating DESC) WHERE rating IS NOT NULL;

-- Movies: GIN indexes for array columns
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies USING gin(genre);
CREATE INDEX IF NOT EXISTS idx_movies_director ON movies USING gin(director);

-- Watchlist: Core indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_added ON watchlist(user_id, added_at DESC);

-- Watchlist: Partial index for unwatched movies (most common query)
CREATE INDEX IF NOT EXISTS idx_watchlist_unwatched
  ON watchlist(user_id, added_at DESC)
  WHERE watched = FALSE;

-- Ratings: Core indexes
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_rating ON ratings(user_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_rated_at ON ratings(user_id, rated_at DESC);

-- Ratings: Partial index for high ratings
CREATE INDEX IF NOT EXISTS idx_ratings_high_rated
  ON ratings(user_id, rating)
  WHERE rating >= 4;

-- Chat sessions: Performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(user_id, created_at DESC);

-- User interactions: Core indexes (ONLY if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_interactions') THEN
    CREATE INDEX IF NOT EXISTS idx_user_interactions_user_movie
      ON user_interactions(user_id, movie_id);

    CREATE INDEX IF NOT EXISTS idx_user_interactions_type
      ON user_interactions(user_id, interaction_type);

    CREATE INDEX IF NOT EXISTS idx_user_interactions_time
      ON user_interactions(user_id, created_at DESC);

    -- Note: Cannot use NOW() in partial index predicate (not immutable)
    -- So we create a regular index on (user_id, created_at) for recent queries
  END IF;
END $$;

-- Recommendation queue: Performance indexes (ONLY if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'recommendation_queue') THEN
    -- Use created_at (the actual column name, not generated_at)
    CREATE INDEX IF NOT EXISTS idx_recommendation_queue_user
      ON recommendation_queue(user_id, created_at DESC);

    -- Only create consumed index if column exists (older schema version)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'recommendation_queue' AND column_name = 'consumed'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_recommendation_queue_consumed
        ON recommendation_queue(user_id, consumed)
        WHERE consumed = FALSE;
    END IF;
  END IF;
END $$;

-- Conversation sessions: Performance indexes (ONLY if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'conversation_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user
      ON conversation_sessions(user_id, created_at DESC);
  END IF;
END $$;

-- User memories: Performance indexes (ONLY if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_memories') THEN
    CREATE INDEX IF NOT EXISTS idx_user_memories_user_type
      ON user_memories(user_id, memory_type);

    CREATE INDEX IF NOT EXISTS idx_user_memories_importance
      ON user_memories(user_id, importance_score DESC);
  END IF;
END $$;

-- =============================================================================
-- PART 2: ADD DATA QUALITY CONSTRAINTS
-- =============================================================================

-- Movies: Ensure year makes sense
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_movie_year' AND conrelid = 'movies'::regclass
  ) THEN
    ALTER TABLE movies ADD CONSTRAINT check_movie_year
      CHECK (year IS NULL OR (year >= 1900 AND year <= 2100));
  END IF;
END $$;

-- Movies: Ensure rating is valid (0-10 scale)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_movie_rating' AND conrelid = 'movies'::regclass
  ) THEN
    ALTER TABLE movies ADD CONSTRAINT check_movie_rating
      CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));
  END IF;
END $$;

-- Movies: Ensure runtime is positive
-- First, fix any invalid data (set runtime to NULL if it's <= 0)
UPDATE movies SET runtime = NULL WHERE runtime IS NOT NULL AND runtime <= 0;

-- Now add the constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_movie_runtime' AND conrelid = 'movies'::regclass
  ) THEN
    ALTER TABLE movies ADD CONSTRAINT check_movie_runtime
      CHECK (runtime IS NULL OR runtime > 0);
  END IF;
END $$;

-- Watchlist: Ensure watched_at is set only when watched is true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_watched_consistency' AND conrelid = 'watchlist'::regclass
  ) THEN
    ALTER TABLE watchlist ADD CONSTRAINT check_watched_consistency
      CHECK ((watched = FALSE AND watched_at IS NULL) OR (watched = TRUE));
  END IF;
END $$;

-- User interactions: Ensure created_at is not in future
-- Note: Cannot use NOW() in CHECK constraint (not immutable)
-- The application should validate this, or we could use a trigger instead
-- Skipping this constraint to avoid PostgreSQL immutability error

-- User memories: Ensure importance_score is between 0 and 1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_importance_score' AND conrelid = 'user_memories'::regclass
  ) THEN
    ALTER TABLE user_memories ADD CONSTRAINT check_importance_score
      CHECK (importance_score >= 0 AND importance_score <= 1);
  END IF;
END $$;

-- =============================================================================
-- PART 3: ADD UPDATED_AT TRIGGERS FOR ALL TABLES
-- =============================================================================

-- Movies table
DROP TRIGGER IF EXISTS update_movies_updated_at ON movies;
CREATE TRIGGER update_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- User profiles table
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ratings table
DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Watchlist table (if it has updated_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'watchlist' AND column_name = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_watchlist_updated_at ON watchlist;
    EXECUTE 'CREATE TRIGGER update_watchlist_updated_at
             BEFORE UPDATE ON watchlist
             FOR EACH ROW
             EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- Chat sessions table
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Conversation sessions table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'conversation_sessions'
  ) THEN
    DROP TRIGGER IF EXISTS update_conversation_sessions_updated_at ON conversation_sessions;
    EXECUTE 'CREATE TRIGGER update_conversation_sessions_updated_at
             BEFORE UPDATE ON conversation_sessions
             FOR EACH ROW
             EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- User memories table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_memories' AND column_name = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_user_memories_updated_at ON user_memories;
    EXECUTE 'CREATE TRIGGER update_user_memories_updated_at
             BEFORE UPDATE ON user_memories
             FOR EACH ROW
             EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- =============================================================================
-- PART 4: ADD FULL-TEXT SEARCH SUPPORT
-- =============================================================================

-- Add search vector column to movies table
ALTER TABLE movies ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_movies_search
  ON movies USING gin(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION movies_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.plot, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.director, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.genre, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain search vector
DROP TRIGGER IF EXISTS movies_search_update ON movies;
CREATE TRIGGER movies_search_update
  BEFORE INSERT OR UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION movies_search_trigger();

-- Update existing rows with search vector
UPDATE movies SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(plot, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(director, ' '), '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(genre, ' '), '')), 'D')
WHERE search_vector IS NULL;

-- =============================================================================
-- PART 5: ADD JSONB INDEXES FOR AI QUERIES
-- =============================================================================

-- User profiles: Index favorite genres for fast queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_favorite_genres
  ON user_profiles USING gin((preferences->'favorite_genres'))
  WHERE preferences ? 'favorite_genres';

-- User profiles: Index full preferences for general queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences
  ON user_profiles USING gin(preferences);

-- Movies: Index TMDB metadata
CREATE INDEX IF NOT EXISTS idx_movies_metadata_tmdb
  ON movies USING gin((metadata->'tmdb'))
  WHERE metadata ? 'tmdb';

-- Movies: Index full metadata
CREATE INDEX IF NOT EXISTS idx_movies_metadata
  ON movies USING gin(metadata);

-- Recommendations: Index reasoning for AI analysis
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recommendation_queue' AND column_name = 'reasoning'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recommendations_reasoning
             ON recommendation_queue USING gin(reasoning)';
  END IF;
END $$;

-- User memories: Index memory details
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_memories' AND column_name = 'details'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_memories_details
             ON user_memories USING gin(details)';
  END IF;
END $$;

-- =============================================================================
-- PART 6: REMOVE RATING FROM WATCHLIST (Fix Duplication)
-- =============================================================================

-- Remove rating column from watchlist since we have a dedicated ratings table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'watchlist' AND column_name = 'rating'
  ) THEN
    -- First, migrate any ratings from watchlist to ratings table
    INSERT INTO ratings (user_id, movie_id, rating, interested, interaction_type, rated_at)
    SELECT
      w.user_id,
      w.movie_id,
      w.rating,
      TRUE,
      'watchlist',
      w.added_at
    FROM watchlist w
    WHERE w.rating IS NOT NULL
    ON CONFLICT (user_id, movie_id) DO UPDATE
    SET rating = EXCLUDED.rating,
        rated_at = EXCLUDED.rated_at
    WHERE ratings.rating IS NULL;

    -- Now drop the column
    ALTER TABLE watchlist DROP COLUMN rating;
  END IF;
END $$;

-- =============================================================================
-- PART 7: ADD HELPER FUNCTIONS FOR PERFORMANCE
-- =============================================================================

-- Function to get user's viewing statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'movies_watched', (
      SELECT COUNT(*) FROM watchlist
      WHERE user_id = p_user_id AND watched = TRUE
    ),
    'watchlist_count', (
      SELECT COUNT(*) FROM watchlist
      WHERE user_id = p_user_id AND watched = FALSE
    ),
    'total_ratings', (
      SELECT COUNT(*) FROM ratings
      WHERE user_id = p_user_id
    ),
    'avg_rating', (
      SELECT COALESCE(AVG(rating), 0) FROM ratings
      WHERE user_id = p_user_id AND rating IS NOT NULL
    ),
    'favorite_genres', (
      SELECT jsonb_agg(DISTINCT genre)
      FROM (
        SELECT unnest(m.genre) as genre
        FROM ratings r
        JOIN movies m ON r.movie_id = m.id
        WHERE r.user_id = p_user_id AND r.rating >= 4
        ORDER BY genre
        LIMIT 10
      ) subq
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Remove old consumed recommendations (keep last 100 per user)
  -- Only if the table has the consumed column (older schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recommendation_queue' AND column_name = 'consumed'
  ) THEN
    DELETE FROM recommendation_queue r1
    WHERE r1.consumed = TRUE
    AND r1.id NOT IN (
      SELECT id FROM recommendation_queue r2
      WHERE r2.user_id = r1.user_id
      ORDER BY r2.created_at DESC
      LIMIT 100
    );
  END IF;

  -- Remove old daily spotlights (keep last 7 days) - only if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'daily_spotlights') THEN
    DELETE FROM daily_spotlights
    WHERE generated_date < CURRENT_DATE - INTERVAL '7 days';
  END IF;

  -- Remove old browse categories (keep last 3 days) - only if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'browse_categories') THEN
    DELETE FROM browse_categories
    WHERE generated_date < CURRENT_DATE - INTERVAL '3 days';
  END IF;

  -- Log cleanup
  RAISE NOTICE 'Old data cleanup completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 8: ANALYZE TABLES TO UPDATE STATISTICS
-- =============================================================================

-- Update PostgreSQL statistics for query planner
ANALYZE user_profiles;
ANALYZE movies;
ANALYZE watchlist;
ANALYZE ratings;

-- Only analyze if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_sessions') THEN
    EXECUTE 'ANALYZE chat_sessions';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_interactions') THEN
    EXECUTE 'ANALYZE user_interactions';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'recommendation_queue') THEN
    EXECUTE 'ANALYZE recommendation_queue';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (Run these to check everything worked)
-- =============================================================================

-- Check all indexes were created
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- Check all constraints
-- SELECT conname, conrelid::regclass, contype
-- FROM pg_constraint
-- WHERE connamespace = 'public'::regnamespace
-- ORDER BY conrelid::regclass::text;

-- Check all triggers
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- ORDER BY event_object_table, trigger_name;
