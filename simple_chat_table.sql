-- Simple chat_sessions table creation
-- Run this in Supabase SQL Editor if the main script doesn't work

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  messages JSONB DEFAULT '[]',
  preferences_extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable basic access (modify as needed for security)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON chat_sessions
  FOR ALL USING (auth.role() = 'authenticated'); 