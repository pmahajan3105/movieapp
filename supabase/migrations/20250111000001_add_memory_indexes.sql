-- Add indexes for memory service performance optimization
-- These indexes ensure fast queries for UserMemoryService

-- Indexes for watchlist queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_added ON watchlist(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie_user ON watchlist(movie_id, user_id);

-- Indexes for ratings queries
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_rating ON ratings(user_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_rated_at ON ratings(user_id, rated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_user ON ratings(movie_id, user_id);

-- Note: user_behavior_signals indexes moved to migration 20250130000000_add_user_behavior_signals.sql

-- Indexes for movies table
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id) WHERE imdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating DESC) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC) WHERE popularity IS NOT NULL;

-- Indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Indexes for user interactions (if table exists)
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_time ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type ON user_interactions(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_movie_user ON user_interactions(movie_id, user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_watchlist_user_watched ON watchlist(user_id, watched) WHERE watched = true;
CREATE INDEX IF NOT EXISTS idx_ratings_user_interested ON ratings(user_id, interested) WHERE interested = true;
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies USING GIN(genre) WHERE genre IS NOT NULL;

-- Note: Indexes for other tables will be created when those tables are created in their respective migrations

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_recent ON movies(release_date DESC) WHERE release_date >= '2020-01-01';
CREATE INDEX IF NOT EXISTS idx_ratings_high_rated ON ratings(movie_id, rating DESC) WHERE rating >= 4.0;
CREATE INDEX IF NOT EXISTS idx_watchlist_recent ON watchlist(user_id, added_at DESC) WHERE added_at >= NOW() - INTERVAL '30 days';

-- Analyze tables to update statistics (only existing tables)
ANALYZE watchlist;
ANALYZE ratings;
ANALYZE movies;
ANALYZE user_profiles;
