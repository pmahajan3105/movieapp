-- Schedule the personal movie scout background job
-- This will run every 4 hours to refresh recommendations

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the background job to run every 4 hours
-- The job will call the Edge Function via HTTP request
SELECT cron.schedule(
    'personal-movie-scout',
    '0 */4 * * *', -- Every 4 hours
    $$
    SELECT 
        net.http_post(
            url := 'https://hrpaeadxwjtstrgclhoa.supabase.co/functions/v1/personal-movie-scout',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
            body := '{"trigger": "scheduled", "force_refresh": true}'::jsonb
        ) as request_id;
    $$
);

-- Create a function to manually trigger the background job
CREATE OR REPLACE FUNCTION trigger_personal_movie_scout()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result record;
BEGIN
    -- Call the Edge Function
    SELECT INTO result
        net.http_post(
            url := 'https://hrpaeadxwjtstrgclhoa.supabase.co/functions/v1/personal-movie-scout',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
            body := '{"trigger": "manual", "force_refresh": true}'::jsonb
        );
    
    RETURN 'Background job triggered successfully. Request ID: ' || result.request_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Failed to trigger background job: ' || SQLERRM;
END;
$$;

-- Create a view to monitor scheduled jobs
CREATE OR REPLACE VIEW background_job_status AS
SELECT 
    jobname,
    schedule,
    active,
    last_run,
    next_run,
    command
FROM cron.job
WHERE jobname = 'personal-movie-scout';

-- Grant permissions for the background job monitoring
GRANT SELECT ON background_job_status TO authenticated;

-- Insert initial job status record
INSERT INTO public.background_job_queue (
    job_name,
    status,
    created_at,
    metadata
) VALUES (
    'personal-movie-scout',
    'scheduled',
    NOW(),
    '{"schedule": "0 */4 * * *", "description": "Background AI recommendation engine"}'::jsonb
) ON CONFLICT (job_name) DO UPDATE SET
    status = 'scheduled',
    updated_at = NOW(),
    metadata = '{"schedule": "0 */4 * * *", "description": "Background AI recommendation engine"}'::jsonb;

-- Create a table to track job execution logs
CREATE TABLE IF NOT EXISTS public.background_job_logs (
    id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    execution_time TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
    duration_ms INTEGER,
    processed_users INTEGER DEFAULT 0,
    generated_recommendations INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for job logs
CREATE INDEX IF NOT EXISTS idx_background_job_logs_job_name ON public.background_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_background_job_logs_execution_time ON public.background_job_logs(execution_time);
CREATE INDEX IF NOT EXISTS idx_background_job_logs_status ON public.background_job_logs(status);

-- Enable RLS for job logs
ALTER TABLE public.background_job_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for job logs (service role can read/write all, users can only read their own)
CREATE POLICY "Service role can manage job logs" ON public.background_job_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view job logs" ON public.background_job_logs
    FOR SELECT USING (true); -- Allow all authenticated users to view job status

-- Grant permissions
GRANT SELECT ON public.background_job_logs TO authenticated;
GRANT ALL ON public.background_job_logs TO service_role;
GRANT USAGE ON SEQUENCE public.background_job_logs_id_seq TO service_role;

-- Create a function to get job execution summary
CREATE OR REPLACE FUNCTION get_background_job_summary()
RETURNS TABLE (
    job_name TEXT,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    last_execution TIMESTAMPTZ,
    last_status TEXT,
    avg_duration_ms NUMERIC,
    total_recommendations_generated BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        l.job_name,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE l.status = 'success') as successful_executions,
        COUNT(*) FILTER (WHERE l.status = 'failed') as failed_executions,
        MAX(l.execution_time) as last_execution,
        (SELECT status FROM public.background_job_logs WHERE job_name = l.job_name ORDER BY execution_time DESC LIMIT 1) as last_status,
        AVG(l.duration_ms) as avg_duration_ms,
        COALESCE(SUM(l.generated_recommendations), 0) as total_recommendations_generated
    FROM public.background_job_logs l
    GROUP BY l.job_name;
$$;

-- Grant permissions on the summary function
GRANT EXECUTE ON FUNCTION get_background_job_summary() TO authenticated;

-- Comment
COMMENT ON TABLE public.background_job_logs IS 'Tracks execution logs for background jobs including the personal movie scout';
COMMENT ON FUNCTION trigger_personal_movie_scout() IS 'Manually trigger the personal movie scout background job';
COMMENT ON FUNCTION get_background_job_summary() IS 'Get execution summary for background jobs';