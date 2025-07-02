BEGIN;

-- Track realistic user interactions within the recommendation app
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'view_details', 
    'add_to_watchlist', 
    'rate', 
    'search_result_click', 
    'recommendation_click'
  )),
  interaction_context JSONB DEFAULT '{}', -- search query, recommendation type, position, etc.
  time_of_day INTEGER CHECK (time_of_day >= 0 AND time_of_day <= 23), -- When they used the app
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- When they used the app
  metadata JSONB DEFAULT '{}', -- time spent on page, rating value, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store computed preference insights based on user interactions
CREATE TABLE user_preference_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'genre_preference',
    'rating_patterns', 
    'search_behavior',
    'discovery_preference',
    'engagement_metrics'
  )),
  time_window TEXT NOT NULL CHECK (time_window IN ('7d', '30d', '90d', 'all_time')),
  insights JSONB NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_points INTEGER DEFAULT 0, -- How many interactions this insight is based on
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_interactions_user_time ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_type ON user_interactions(user_id, interaction_type);
CREATE INDEX idx_user_interactions_movie ON user_interactions(movie_id, interaction_type);
CREATE INDEX idx_user_interactions_temporal ON user_interactions(time_of_day, day_of_week);

CREATE INDEX idx_preference_insights_user_type ON user_preference_insights(user_id, insight_type);
CREATE INDEX idx_preference_insights_expires ON user_preference_insights(expires_at);

-- RLS Policies
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_interactions_policy" ON user_interactions
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_preference_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preference_insights_policy" ON user_preference_insights
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preference_insights_updated_at 
  BEFORE UPDATE ON user_preference_insights 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS void AS $$
BEGIN
  DELETE FROM user_preference_insights WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT; 