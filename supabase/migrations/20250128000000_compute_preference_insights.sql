-- Compute and store user preference insights nightly
-- Reversible migration (drop in down)

BEGIN;

-- Function: refresh_user_preference_insights
CREATE OR REPLACE FUNCTION refresh_user_preference_insights()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM auth.users LOOP
    -- For simplicity we only insert a placeholder; real computation done in app layer.
    INSERT INTO user_preference_insights (id, user_id, insight_type, time_window, insights, confidence_score, expires_at)
    VALUES (
      gen_random_uuid(),
      rec.id,
      'genre_preference',
      '30d',
      jsonb_build_object('note', 'Placeholder – to be updated by Edge Function'),
      0.1,
      NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (user_id, insight_type) DO UPDATE
      SET updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (runs daily at 03:15 UTC)
SELECT cron.schedule('refresh_preference_insights', '15 3 * * *', $$CALL refresh_user_preference_insights();$$);

COMMIT; 