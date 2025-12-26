-- CineAI AI Features Schema
-- Migration: 002_ai_features.sql
-- Description: Tables for AI chat, behavior tracking, and personalization

BEGIN;

-- ============================================================
-- TABLE: chat_sessions
-- Description: AI chat conversation history
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  preferences_extracted BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE chat_sessions IS 'AI chat conversation history and extracted preferences';
COMMENT ON COLUMN chat_sessions.messages IS 'Array of {id, role, content, timestamp} objects';

-- ============================================================
-- TABLE: user_behavior_signals
-- Description: Real-time learning signals for F-1 Engine
-- ============================================================

CREATE TABLE IF NOT EXISTS user_behavior_signals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('view', 'click', 'save', 'rate', 'skip', 'remove', 'watch_time')),
  value DECIMAL(3,1),  -- Rating (1.0-5.0) or watch time in minutes
  context JSONB NOT NULL DEFAULT '{}'::jsonb,  -- page_type, recommendation_type, position_in_list, session_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_behavior_signals IS 'Tracks user interactions for real-time learning and personalization';
COMMENT ON COLUMN user_behavior_signals.action IS 'Type: view, click, save, rate, skip, remove, watch_time';
COMMENT ON COLUMN user_behavior_signals.context IS 'JSON: page_type, recommendation_type, position_in_list, session_id';

-- ============================================================
-- TABLE: user_interactions
-- Description: Detailed interaction tracking with temporal data
-- ============================================================

CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,  -- Can be TMDB ID or internal ID
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'view_details',
    'add_to_watchlist',
    'rate',
    'search_result_click',
    'recommendation_click'
  )),
  interaction_context JSONB DEFAULT '{}'::jsonb,
  time_of_day INTEGER CHECK (time_of_day >= 0 AND time_of_day <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_interactions IS 'Detailed user interactions with temporal patterns';

-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CLEANUP FUNCTIONS
-- ============================================================

-- Clean up behavior signals older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_behavior_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM user_behavior_signals
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old interactions older than 180 days
CREATE OR REPLACE FUNCTION cleanup_old_interactions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_interactions
  WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
