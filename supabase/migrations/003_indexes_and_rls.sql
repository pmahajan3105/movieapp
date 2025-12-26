-- CineAI Indexes and Row Level Security
-- Migration: 003_indexes_and_rls.sql
-- Description: Performance indexes and security policies

BEGIN;

-- ============================================================
-- INDEXES: user_profiles
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================================
-- INDEXES: movies
-- ============================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING GIN(title gin_trgm_ops);  -- Fuzzy search
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id) WHERE imdb_id IS NOT NULL;

-- Filtering and sorting
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year DESC) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating DESC) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date DESC) WHERE release_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC) WHERE popularity IS NOT NULL;

-- Genre search (GIN for array contains)
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies USING GIN(genre);

-- Recent movies (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_movies_recent ON movies(release_date DESC)
  WHERE release_date >= '2020-01-01';

-- ============================================================
-- INDEXES: ratings
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_movie ON ratings(user_id, movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_rating ON ratings(user_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_rated_at ON ratings(user_id, rated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_interested ON ratings(user_id, interested) WHERE interested = true;
CREATE INDEX IF NOT EXISTS idx_ratings_high_rated ON ratings(movie_id, rating DESC) WHERE rating >= 4;

-- ============================================================
-- INDEXES: watchlist
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_movie ON watchlist(movie_id, user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_added ON watchlist(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_watched ON watchlist(user_id, watched);
CREATE INDEX IF NOT EXISTS idx_watchlist_unwatched ON watchlist(user_id, added_at DESC) WHERE watched = false;

-- ============================================================
-- INDEXES: chat_sessions
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_recent ON chat_sessions(user_id, created_at DESC);

-- ============================================================
-- INDEXES: user_behavior_signals
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_behavior_signals_user_id ON user_behavior_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_movie_id ON user_behavior_signals(movie_id);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_action ON user_behavior_signals(action);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_user_action ON user_behavior_signals(user_id, action);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_user_recent ON user_behavior_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_created_at ON user_behavior_signals(created_at);

-- ============================================================
-- INDEXES: user_interactions
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_time ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON user_interactions(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_movie_user ON user_interactions(movie_id, user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_temporal ON user_interactions(time_of_day, day_of_week);

-- ============================================================
-- ROW LEVEL SECURITY: Enable on all tables
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: user_profiles
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
CREATE POLICY "Users can manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- ============================================================
-- RLS POLICIES: movies
-- ============================================================

DROP POLICY IF EXISTS "Movies are publicly viewable" ON movies;
CREATE POLICY "Movies are publicly viewable" ON movies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert movies" ON movies;
CREATE POLICY "Authenticated users can insert movies" ON movies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update movies" ON movies;
CREATE POLICY "Authenticated users can update movies" ON movies
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- RLS POLICIES: ratings
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own ratings" ON ratings;
CREATE POLICY "Users can manage own ratings" ON ratings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: watchlist
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own watchlist" ON watchlist;
CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: chat_sessions
-- ============================================================

DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat sessions" ON chat_sessions;
CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;
CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: user_behavior_signals
-- ============================================================

DROP POLICY IF EXISTS "Users can read own behavior signals" ON user_behavior_signals;
CREATE POLICY "Users can read own behavior signals" ON user_behavior_signals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own behavior signals" ON user_behavior_signals;
CREATE POLICY "Users can insert own behavior signals" ON user_behavior_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own behavior signals" ON user_behavior_signals;
CREATE POLICY "Users can update own behavior signals" ON user_behavior_signals
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: user_interactions
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own interactions" ON user_interactions;
CREATE POLICY "Users can manage own interactions" ON user_interactions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get user's preference summary for AI context
CREATE OR REPLACE FUNCTION get_user_preferences_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'liked_movies', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'title', m.title,
                'genre', m.genre,
                'year', m.year,
                'director', m.director
            ))
            FROM ratings r
            JOIN movies m ON r.movie_id = m.id
            WHERE r.user_id = p_user_id
            AND r.interested = true
            ORDER BY r.rated_at DESC
            LIMIT 20
        ), '[]'::jsonb),
        'favorite_genres', COALESCE((
            SELECT jsonb_agg(DISTINCT genre_element)
            FROM ratings r
            JOIN movies m ON r.movie_id = m.id,
            LATERAL unnest(m.genre) AS genre_element
            WHERE r.user_id = p_user_id
            AND r.interested = true
            AND r.rating >= 4
        ), '[]'::jsonb),
        'stats', (
            SELECT jsonb_build_object(
                'total_ratings', COUNT(*),
                'likes', COUNT(*) FILTER (WHERE interested = true),
                'avg_rating', ROUND(AVG(rating)::numeric, 1)
            )
            FROM ratings
            WHERE user_id = p_user_id
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update statistics for query optimization
ANALYZE user_profiles;
ANALYZE movies;
ANALYZE ratings;
ANALYZE watchlist;
ANALYZE chat_sessions;
ANALYZE user_behavior_signals;
ANALYZE user_interactions;

COMMIT;
