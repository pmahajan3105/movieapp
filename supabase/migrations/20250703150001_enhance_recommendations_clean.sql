-- Migration: Enhance recommendations table for background AI processing (Clean Version)
-- Created: 2025-07-03 15:00:01
-- Description: Adds AI insights, source tracking, and background job support to recommendations (No cost monitoring)

BEGIN;

-- Add new columns to existing recommendations table
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS discovery_source TEXT DEFAULT 'ai_analysis' CHECK (discovery_source IN ('trending', 'ai_analysis', 'mood_match', 'fallback', 'user_request')),
ADD COLUMN IF NOT EXISTS analysis_source TEXT DEFAULT 'local_ai' CHECK (analysis_source IN ('full_ai', 'enhanced', 'local_ai', 'fallback')),
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS enhanced_at TIMESTAMPTZ;

-- Add indexes for performance with background processing
CREATE INDEX IF NOT EXISTS idx_recommendations_user_confidence ON recommendations(user_id, confidence DESC, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_analysis_source ON recommendations(analysis_source, discovery_source);
CREATE INDEX IF NOT EXISTS idx_recommendations_generated_at ON recommendations(generated_at);

-- Create table for recommendation queue (background job coordination)
CREATE TABLE IF NOT EXISTS recommendation_refresh_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_rating', 'chat_learning', 'manual_refresh', 'scheduled', 'onboarding')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest priority
  movie_id TEXT, -- TMDB ID if triggered by specific movie interaction
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_refresh_queue_status ON recommendation_refresh_queue(status, priority, queued_at);
CREATE INDEX IF NOT EXISTS idx_refresh_queue_user ON recommendation_refresh_queue(user_id, status);

-- Enable RLS on new tables
ALTER TABLE recommendation_refresh_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for recommendation queue (users can see their own queue items)
CREATE POLICY "Users can view their own refresh queue" ON recommendation_refresh_queue 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own refresh requests" ON recommendation_refresh_queue 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update queue status" ON recommendation_refresh_queue 
  FOR UPDATE USING (true); -- Background jobs need to update status

-- Function to queue recommendation refresh
CREATE OR REPLACE FUNCTION queue_recommendation_refresh(
  p_user_id UUID,
  p_trigger_type TEXT,
  p_movie_id TEXT DEFAULT NULL,
  p_priority INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  -- Insert new refresh request (or update existing pending one)
  INSERT INTO recommendation_refresh_queue (user_id, trigger_type, movie_id, priority, metadata)
  VALUES (p_user_id, p_trigger_type, p_movie_id, p_priority, jsonb_build_object('queued_by', 'system'))
  ON CONFLICT (user_id, trigger_type) WHERE status = 'pending'
  DO UPDATE SET 
    priority = LEAST(recommendation_refresh_queue.priority, EXCLUDED.priority),
    queued_at = NOW(),
    movie_id = COALESCE(EXCLUDED.movie_id, recommendation_refresh_queue.movie_id)
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing recommendations to have default values for new columns
UPDATE recommendations 
SET 
  discovery_source = 'ai_analysis',
  analysis_source = 'local_ai',
  confidence = LEAST(score, 1.0),
  generated_at = created_at
WHERE discovery_source IS NULL;

-- Add updated_at trigger for recommendations table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger if updated_at column exists (might be added in future)
-- CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN recommendations.discovery_source IS 'How this recommendation was discovered (trending, ai_analysis, etc.)';
COMMENT ON COLUMN recommendations.analysis_source IS 'Depth of AI analysis used (full_ai, enhanced, local_ai, fallback)';
COMMENT ON COLUMN recommendations.confidence IS 'AI confidence score for this recommendation (0-1)';
COMMENT ON COLUMN recommendations.ai_insights IS 'Detailed AI analysis insights from emotional, thematic, and cinematic engines';
COMMENT ON COLUMN recommendations.generated_at IS 'When this recommendation was generated by background job';
COMMENT ON COLUMN recommendations.enhanced_at IS 'When external context was last added to this recommendation';

COMMENT ON TABLE recommendation_refresh_queue IS 'Queue for background recommendation generation jobs';

COMMIT;