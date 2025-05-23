-- Simplify to basic movie recommendations
-- Migration: 20250523000000_simplify_to_basic_recommendations.sql

BEGIN;

-- 1. Drop daily_spotlights table and related functionality
DROP TABLE IF EXISTS daily_spotlights CASCADE;

-- 2. Drop browse_categories table (too complex for MVP)
DROP TABLE IF EXISTS browse_categories CASCADE;

-- 3. Drop recommendation_queue table (using simpler approach)
DROP TABLE IF EXISTS recommendation_queue CASCADE;

-- 4. Drop complex functions
DROP FUNCTION IF EXISTS get_user_preferences_summary(UUID);
DROP FUNCTION IF EXISTS cleanup_old_recommendations();

-- 5. Create simple recommendations table
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  score DECIMAL(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- 6. Create indexes for performance
CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_score ON recommendations(user_id, score DESC);

-- 7. Enable RLS on recommendations table
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policy for recommendations
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR ALL USING (auth.uid() = user_id);

-- 9. Create simple function to generate basic recommendations
CREATE OR REPLACE FUNCTION generate_simple_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  title TEXT,
  year INTEGER,
  genre TEXT[],
  director TEXT[],
  plot TEXT,
  poster_url TEXT,
  rating NUMERIC,
  runtime INTEGER,
  recommendation_score DECIMAL
) AS $$
BEGIN
  -- Simple recommendation: return highest rated movies that user hasn't rated yet
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.year,
    m.genre,
    m.director,
    m.plot,
    m.poster_url,
    m.rating,
    m.runtime,
    COALESCE(r.score, m.rating / 10.0) as recommendation_score
  FROM movies m
  LEFT JOIN recommendations r ON r.movie_id = m.id AND r.user_id = p_user_id
  WHERE m.id NOT IN (
    SELECT movie_id 
    FROM ratings 
    WHERE user_id = p_user_id
  )
  ORDER BY recommendation_score DESC, m.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add comments
COMMENT ON TABLE recommendations IS 'Simple movie recommendations for users';
COMMENT ON FUNCTION generate_simple_recommendations IS 'Generate basic movie recommendations based on ratings';

COMMIT; 