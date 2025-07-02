BEGIN;

-- Function: get_user_sentiment_bias(uuid)
-- Returns average critics review_sentiment (0-1) of movies user liked (rating>=4 or like interaction)

CREATE OR REPLACE FUNCTION public.get_user_sentiment_bias(p_user_id uuid)
RETURNS decimal AS $$
DECLARE
  v_bias decimal := 0.5;
BEGIN
  WITH liked AS (
    SELECT movie_id
    FROM ratings
    WHERE user_id = p_user_id AND rating >= 4
    UNION
    SELECT movie_id
    FROM user_interactions
    WHERE user_id = p_user_id AND interaction_type = 'like'
  ), agg AS (
    SELECT avg((review_sentiment->>'critics')::decimal) AS avg_critics
    FROM movies m
    JOIN liked l ON l.movie_id = m.id
    WHERE review_sentiment ? 'critics'
  )
  SELECT coalesce(avg_critics, 0.5) INTO v_bias FROM agg;

  RETURN ROUND(v_bias, 4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT; 