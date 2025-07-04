-- Enhance simple recommendations to consider user preferences
-- Migration: 20250704000000_enhance_simple_recommendations.sql

BEGIN;

-- Update the simple recommendations function to be smarter about user preferences
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
DECLARE
  user_rating_count INTEGER;
  preferred_genres TEXT[];
BEGIN
  -- Check how many movies the user has rated
  SELECT COUNT(*) INTO user_rating_count
  FROM ratings 
  WHERE user_id = p_user_id;
  
  -- If user has rated movies, analyze their preferences
  IF user_rating_count >= 5 THEN
    -- Get user's preferred genres from their highly rated movies
    SELECT ARRAY_AGG(DISTINCT unnest_genre) INTO preferred_genres
    FROM (
      SELECT unnest(m.genre) as unnest_genre, COUNT(*) as genre_count
      FROM ratings r
      JOIN movies m ON r.movie_id = m.id
      WHERE r.user_id = p_user_id 
        AND r.rating >= 3 
        AND r.interested = true
      GROUP BY unnest_genre
      ORDER BY genre_count DESC
      LIMIT 5
    ) user_genres;
    
    -- Return personalized recommendations based on preferred genres
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
      -- Score based on genre preference match + movie rating
      CASE 
        WHEN m.genre && preferred_genres THEN 
          (m.rating / 10.0) + 0.2 + (array_length(m.genre & preferred_genres, 1)::DECIMAL * 0.1)
        ELSE 
          m.rating / 10.0
      END as recommendation_score
    FROM movies m
    WHERE m.id NOT IN (
      SELECT movie_id 
      FROM ratings 
      WHERE user_id = p_user_id
    )
    AND m.rating >= 6.5  -- Only recommend well-rated movies
    ORDER BY recommendation_score DESC, m.rating DESC
    LIMIT p_limit;
    
  ELSE
    -- For new users, return trending/popular movies
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
      -- Boost newer movies for discovery
      CASE 
        WHEN m.year >= EXTRACT(YEAR FROM CURRENT_DATE) - 3 THEN 
          (m.rating / 10.0) + 0.1
        ELSE 
          m.rating / 10.0
      END as recommendation_score
    FROM movies m
    WHERE m.id NOT IN (
      SELECT movie_id 
      FROM ratings 
      WHERE user_id = p_user_id
    )
    AND m.rating >= 7.0  -- Higher threshold for new users
    ORDER BY recommendation_score DESC, m.rating DESC
    LIMIT p_limit;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION generate_simple_recommendations IS 'Generate smart recommendations: personalized for experienced users, trending for new users';

COMMIT;