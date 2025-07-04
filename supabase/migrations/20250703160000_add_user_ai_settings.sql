-- Migration: Add user AI settings table
-- Created: 2025-07-03 16:00:00
-- Description: Adds table for user AI behavior and preference controls

BEGIN;

-- Create table for user AI settings
CREATE TABLE IF NOT EXISTS user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON user_ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_updated_at ON user_ai_settings(updated_at);

-- Enable RLS
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own AI settings" ON user_ai_settings 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings" ON user_ai_settings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings" ON user_ai_settings 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI settings" ON user_ai_settings 
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_ai_settings_updated_at 
  BEFORE UPDATE ON user_ai_settings 
  FOR EACH ROW EXECUTE FUNCTION update_user_ai_settings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_ai_settings IS 'Stores user AI behavior and preference control settings';
COMMENT ON COLUMN user_ai_settings.settings IS 'JSON object containing all AI control preferences and settings';
COMMENT ON COLUMN user_ai_settings.user_id IS 'Reference to the user who owns these settings';

COMMIT;