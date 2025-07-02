BEGIN;

CREATE TABLE IF NOT EXISTS recommendation_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  explanation_type TEXT CHECK (
    explanation_type IN ('similarity', 'pattern', 'mood', 'discovery', 'temporal')
  ),
  primary_reason TEXT NOT NULL,
  supporting_data JSONB DEFAULT '{}',
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  supporting_movies TEXT[],              -- array of movie IDs that influenced explanation
  discovery_level TEXT CHECK (
    discovery_level IN ('safe', 'stretch', 'adventure')
  ),
  optimal_viewing_time TEXT,             -- optional e.g. "Sunday evening"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for fast look-ups
CREATE INDEX IF NOT EXISTS recommendation_explanations_user_id_idx ON recommendation_explanations (user_id);
CREATE INDEX IF NOT EXISTS recommendation_explanations_movie_id_idx ON recommendation_explanations (movie_id);
CREATE INDEX IF NOT EXISTS recommendation_explanations_expires_at_idx ON recommendation_explanations (expires_at);

-- RLS: only owner can access
ALTER TABLE recommendation_explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendation_explanations_select" ON recommendation_explanations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recommendation_explanations_insert" ON recommendation_explanations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cleanup function to purge expired explanations (can be scheduled via cron on Supabase)
CREATE OR REPLACE FUNCTION cleanup_expired_explanations()
RETURNS void AS $$
BEGIN
  DELETE FROM recommendation_explanations WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT; 