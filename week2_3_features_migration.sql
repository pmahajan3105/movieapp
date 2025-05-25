-- Week 2-3 Features Migration
-- Add missing tables for analytics and ensure proper structure

-- Create conversation_analytics table for tracking
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY, -- Using text for anonymous users
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure chat_sessions table has proper structure
DO $$ 
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE chat_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'anonymous-user';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'messages') THEN
    ALTER TABLE chat_sessions ADD COLUMN messages JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'preferences_extracted') THEN
    ALTER TABLE chat_sessions ADD COLUMN preferences_extracted BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'updated_at') THEN
    ALTER TABLE chat_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
EXCEPTION
  WHEN others THEN
    -- If chat_sessions doesn't exist, create it
    CREATE TABLE chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL DEFAULT 'anonymous-user',
      messages JSONB DEFAULT '[]',
      preferences_extracted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_session_id ON conversation_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_event_type ON conversation_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_timestamp ON conversation_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_preferences_extracted ON chat_sessions(preferences_extracted);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- RLS Policies (allow anonymous access for now)
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for all operations (for development)
CREATE POLICY IF NOT EXISTS "Allow anonymous access to conversation_analytics" 
  ON conversation_analytics FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anonymous access to user_profiles" 
  ON user_profiles FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anonymous access to chat_sessions" 
  ON chat_sessions FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON conversation_analytics TO anon;
GRANT ALL ON user_profiles TO anon;
GRANT ALL ON chat_sessions TO anon;

-- Insert default user profile for anonymous user
INSERT INTO user_profiles (id, preferences, onboarding_completed)
VALUES ('anonymous-user', '{}', false)
ON CONFLICT (id) DO NOTHING;

-- Enable realtime subscriptions (if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions; 