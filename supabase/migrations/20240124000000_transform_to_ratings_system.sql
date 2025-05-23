-- Transform swipes table to ratings system for new recommendation approach
-- Migration: 20240124000000_transform_to_ratings_system.sql

BEGIN;

-- 1. Create ratings table (replaces swipes with more flexibility)
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  interested BOOLEAN NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'dislike', 'watchlist', 'quick_rate', 'spotlight', 'browse')) DEFAULT 'browse',
  source TEXT DEFAULT 'browse', -- Where the rating came from
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- 2. Daily spotlights table for curated content (5 per day)
CREATE TABLE daily_spotlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
  ai_reason TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id, generated_date)
);

-- 3. Browse categories table for dynamic AI-generated categories
CREATE TABLE browse_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  ai_description TEXT NOT NULL,
  movie_ids UUID[] NOT NULL,
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Migrate existing swipes to ratings (if swipes table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'swipes') THEN
        INSERT INTO ratings (user_id, movie_id, interested, interaction_type, source, rated_at)
        SELECT 
          user_id,
          movie_id,
          CASE 
            WHEN action = 'like' THEN true
            WHEN action = 'dislike' THEN false
            WHEN action = 'watchlist' THEN true
            ELSE false
          END as interested,
          action as interaction_type,
          'legacy_swipe' as source,
          swiped_at as rated_at
        FROM swipes;
    END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX idx_ratings_interested ON ratings(user_id, interested);
CREATE INDEX idx_ratings_interaction_type ON ratings(user_id, interaction_type);
CREATE INDEX idx_ratings_source ON ratings(user_id, source);
CREATE INDEX idx_daily_spotlights_user_date ON daily_spotlights(user_id, generated_date);
CREATE INDEX idx_daily_spotlights_position ON daily_spotlights(user_id, generated_date, position);
CREATE INDEX idx_browse_categories_user_date ON browse_categories(user_id, generated_date);
CREATE INDEX idx_browse_categories_position ON browse_categories(user_id, generated_date, position);

-- 6. Enable RLS on new tables
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_spotlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE browse_categories ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can manage own ratings" ON ratings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own spotlights" ON daily_spotlights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own categories" ON browse_categories
  FOR ALL USING (auth.uid() = user_id);

-- 8. Add trigger for updated_at on ratings table
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Update recommendation_queue to support new categories (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'recommendation_queue' AND column_name = 'category') THEN
        -- Column already exists, update default values
        UPDATE recommendation_queue 
        SET category = 'daily_mixed'
        WHERE category IS NULL;
    ELSE
        -- Add new columns to recommendation_queue
        ALTER TABLE recommendation_queue 
        ADD COLUMN category TEXT DEFAULT 'daily_mixed',
        ADD COLUMN display_type TEXT CHECK (display_type IN ('spotlight', 'row', 'grid')) DEFAULT 'grid',
        ADD COLUMN spotlight_priority INTEGER DEFAULT 0;
    END IF;
END $$;

-- 10. Add comments for documentation
COMMENT ON TABLE ratings IS 'User movie ratings and interactions - replaces swipes table with more flexibility';
COMMENT ON TABLE daily_spotlights IS 'Daily curated movie recommendations (5 per day) with AI reasoning';
COMMENT ON TABLE browse_categories IS 'AI-generated browseable movie categories with dynamic content';

-- 11. Create function to get user's preference summary for AI
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
        'disliked_genres', COALESCE((
            SELECT jsonb_agg(DISTINCT unnest(m.genre))
            FROM ratings r
            JOIN movies m ON r.movie_id = m.id
            WHERE r.user_id = p_user_id 
            AND r.interested = false
        ), '[]'::jsonb),
        'interaction_stats', COALESCE((
            SELECT jsonb_build_object(
                'total_ratings', COUNT(*),
                'likes', COUNT(*) FILTER (WHERE interested = true),
                'dislikes', COUNT(*) FILTER (WHERE interested = false)
            )
            FROM ratings
            WHERE user_id = p_user_id
        ), jsonb_build_object('total_ratings', 0, 'likes', 0, 'dislikes', 0))
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to cleanup old spotlights and categories
CREATE OR REPLACE FUNCTION cleanup_old_recommendations()
RETURNS void AS $$
BEGIN
    -- Remove spotlights older than 7 days
    DELETE FROM daily_spotlights 
    WHERE generated_date < CURRENT_DATE - INTERVAL '7 days';
    
    -- Remove categories older than 3 days
    DELETE FROM browse_categories 
    WHERE generated_date < CURRENT_DATE - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT; 