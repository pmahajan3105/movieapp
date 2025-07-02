BEGIN;

-- Ensure unique row per user/insight/time_window for upsert (safe on repeat runs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preference_insights_unique'
  ) THEN
    ALTER TABLE user_preference_insights
      ADD CONSTRAINT user_preference_insights_unique
      UNIQUE (user_id, insight_type, time_window);
  END IF;
END $$;

-- Replace placeholder function with real aggregation logic
DROP FUNCTION IF EXISTS refresh_user_preference_insights();

-- Make sure pg_cron is available (creates schema "cron")
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

CREATE OR REPLACE FUNCTION refresh_user_preference_insights()
RETURNS void AS $$
DECLARE
  u RECORD;
  wnd TEXT;
  wnd_interval INTERVAL;
  top_genres JSONB;
  total_cnt INTEGER;
BEGIN
  -- Iterate through all users
  FOR u IN SELECT id FROM auth.users LOOP
    -- Iterate over desired windows
    FOR wnd IN SELECT * FROM (VALUES ('7d'), ('30d'), ('90d')) AS w(t) LOOP
      wnd_interval := (wnd || ' ago')::INTERVAL;

      -- Build JSON array of top genres in the window
      WITH genre_counts AS (
        SELECT g AS genre_id, COUNT(*) AS cnt
        FROM user_interactions ui
        JOIN movies m ON m.id = ui.movie_id
        , LATERAL UNNEST(m.genre_ids) AS g
        WHERE ui.user_id = u.id
          AND ui.created_at >= NOW() - wnd_interval
        GROUP BY g
      ), ranked AS (
        SELECT jsonb_agg(jsonb_build_object('genre_id', genre_id, 'count', cnt)
                         ORDER BY cnt DESC) AS top_json,
               SUM(cnt) AS total_interactions
        FROM genre_counts
      )
      SELECT top_json, total_interactions
      INTO top_genres, total_cnt
      FROM ranked;

      -- Skip if no interactions in window
      IF top_genres IS NULL OR total_cnt IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO user_preference_insights (
        user_id,
        insight_type,
        time_window,
        insights,
        confidence_score,
        data_points,
        expires_at
      ) VALUES (
        u.id,
        'genre_preference',
        wnd,
        jsonb_build_object(
          'top_genres', top_genres,
          'total_interactions', total_cnt
        ),
        LEAST(1, total_cnt / 20.0), -- crude confidence: 20+ interactions → 1.0
        total_cnt,
        NOW() + INTERVAL '30 days'
      )
      ON CONFLICT ON CONSTRAINT user_preference_insights_unique DO UPDATE
        SET insights         = EXCLUDED.insights,
            confidence_score = EXCLUDED.confidence_score,
            data_points      = EXCLUDED.data_points,
            updated_at       = NOW(),
            expires_at       = EXCLUDED.expires_at;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reschedule (replace existing) cron task
SELECT cron.unschedule('refresh_preference_insights') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh_preference_insights'
);
SELECT cron.schedule('refresh_preference_insights', '15 3 * * *', $$SELECT refresh_user_preference_insights();$$);

COMMIT; 