-- Add recommendation_queue table for managing AI-generated recommendations
CREATE TABLE recommendation_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    request_type text NOT NULL DEFAULT 'standard' CHECK (request_type IN ('standard', 'mood', 'similar', 'semantic')),
    query_params jsonb NOT NULL DEFAULT '{}',
    results jsonb,
    error_message text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create indexes for performance
CREATE INDEX idx_recommendation_queue_user_id ON recommendation_queue(user_id);
CREATE INDEX idx_recommendation_queue_status ON recommendation_queue(status);
CREATE INDEX idx_recommendation_queue_created_at ON recommendation_queue(created_at);
CREATE INDEX idx_recommendation_queue_expires_at ON recommendation_queue(expires_at);

-- Enable RLS
ALTER TABLE recommendation_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own recommendation queue" ON recommendation_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own recommendation queue" ON recommendation_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendation queue" ON recommendation_queue
    FOR UPDATE USING (auth.uid() = user_id);

-- Add function to cleanup expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void
LANGUAGE sql
AS $$
    DELETE FROM recommendation_queue 
    WHERE expires_at < now() AND status = 'completed';
$$;

-- Create a scheduled cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-recommendations', '0 2 * * *', 'SELECT cleanup_expired_recommendations();');

COMMENT ON TABLE recommendation_queue IS 'Queue for managing AI recommendation generation requests';
COMMENT ON COLUMN recommendation_queue.request_type IS 'Type of recommendation request: standard, mood, similar, semantic';
COMMENT ON COLUMN recommendation_queue.query_params IS 'Parameters for the recommendation request (genres, mood, movie_id, etc.)';
COMMENT ON COLUMN recommendation_queue.results IS 'Generated recommendations data';
COMMENT ON COLUMN recommendation_queue.metadata IS 'Additional metadata like processing time, model used, etc.'; 