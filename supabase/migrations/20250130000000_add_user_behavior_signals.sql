-- Migration: Add user behavior signals for real-time learning
-- This table tracks user interactions for the F-1 Hyper-Personalized Engine

CREATE TABLE IF NOT EXISTS user_behavior_signals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('view', 'click', 'save', 'rate', 'skip', 'remove', 'watch_time')),
  value DECIMAL(3,1), -- For ratings (1.0-5.0) or watch time in minutes
  context JSONB NOT NULL DEFAULT '{}', -- Stores page_type, recommendation_type, position_in_list, session_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_behavior_signals_user_id ON user_behavior_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_signals_movie_id ON user_behavior_signals(movie_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_signals_action ON user_behavior_signals(action);
CREATE INDEX IF NOT EXISTS idx_user_behavior_signals_created_at ON user_behavior_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_user_behavior_signals_user_action ON user_behavior_signals(user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_behavior_signals_user_recent ON user_behavior_signals(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE user_behavior_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own behavior signals
CREATE POLICY "Users can read their own behavior signals" 
  ON user_behavior_signals FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavior signals" 
  ON user_behavior_signals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavior signals" 
  ON user_behavior_signals FOR UPDATE 
  USING (auth.uid() = user_id);

-- Admins can read all signals for analytics (using user_profiles table)
CREATE POLICY "Admins can read all behavior signals" 
  ON user_behavior_signals FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND (user_profiles.preferences->>'role') = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON TABLE user_behavior_signals IS 'Tracks user interactions for real-time learning and personalization';
COMMENT ON COLUMN user_behavior_signals.action IS 'Type of user interaction: view, click, save, rate, skip, remove, watch_time';
COMMENT ON COLUMN user_behavior_signals.value IS 'Numeric value for actions like rating (1.0-5.0) or watch time in minutes';
COMMENT ON COLUMN user_behavior_signals.context IS 'JSON context including page_type, recommendation_type, position_in_list, session_id';

-- Create function to clean up old signals (keep only last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_behavior_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM user_behavior_signals 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for cleanup function (without WHERE clause with NOW())
CREATE INDEX IF NOT EXISTS idx_user_behavior_signals_cleanup 
  ON user_behavior_signals(created_at); 