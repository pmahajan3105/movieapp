-- Add indexes for memory service performance
-- Migration: 20250111000000_add_memory_indexes.sql

BEGIN;

-- Indexes for fast memory queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id 
  ON watchlist(user_id);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id 
  ON ratings(user_id);

-- Note: user_behavior_signals indexes moved to migration 20250130000000_add_user_behavior_signals.sql

CREATE INDEX IF NOT EXISTS idx_movies_release_date 
  ON movies(release_date DESC);

CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id 
  ON movies(tmdb_id) 
  WHERE tmdb_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ratings_user_rating 
  ON ratings(user_id, rating DESC);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_added 
  ON watchlist(user_id, added_at DESC);

-- Additional indexes for user interactions
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_time 
  ON user_interactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_interactions_type 
  ON user_interactions(user_id, interaction_type);

-- Indexes for preference insights
CREATE INDEX IF NOT EXISTS idx_preference_insights_user_type 
  ON user_preference_insights(user_id, insight_type);

CREATE INDEX IF NOT EXISTS idx_preference_insights_expires 
  ON user_preference_insights(expires_at);

-- Index for user profiles preferences
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences 
  ON user_profiles USING GIN (preferences);

-- Index for movies metadata (for TMDB data)
CREATE INDEX IF NOT EXISTS idx_movies_metadata 
  ON movies USING GIN (metadata);

-- Index for movies genre array
CREATE INDEX IF NOT EXISTS idx_movies_genre 
  ON movies USING GIN (genre);

-- Index for movies director array  
CREATE INDEX IF NOT EXISTS idx_movies_director 
  ON movies USING GIN (director);

COMMIT;
