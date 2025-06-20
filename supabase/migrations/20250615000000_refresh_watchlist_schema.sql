-- Refresh watchlist table schema to fix schema cache issues
-- Migration: 20250615000000_refresh_watchlist_schema.sql

BEGIN;

-- Refresh the watchlist table schema by adding a comment
-- This forces Supabase to refresh its schema cache
COMMENT ON TABLE watchlist IS 'User personal watchlist and viewing history - refreshed 2025-06-15';

-- Ensure the rating column exists with proper constraints
DO $$
BEGIN
    -- Check if rating column exists and has proper constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'rating'
    ) THEN
        -- Add rating column if it doesn't exist
        ALTER TABLE watchlist ADD COLUMN rating INTEGER CHECK (rating BETWEEN 1 AND 5);
    END IF;
END $$;

-- Refresh column comments to force schema cache update
COMMENT ON COLUMN watchlist.id IS 'Unique identifier for watchlist entry';
COMMENT ON COLUMN watchlist.user_id IS 'Reference to user who owns this watchlist entry';
COMMENT ON COLUMN watchlist.movie_id IS 'Reference to the movie in this watchlist entry';
COMMENT ON COLUMN watchlist.added_at IS 'When the movie was added to watchlist';
COMMENT ON COLUMN watchlist.watched IS 'Whether the user has watched this movie';
COMMENT ON COLUMN watchlist.watched_at IS 'When the user marked this movie as watched';
COMMENT ON COLUMN watchlist.rating IS 'User rating for the movie (1-5 stars)';
COMMENT ON COLUMN watchlist.notes IS 'User notes about the movie';

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_watchlist_rating ON watchlist(user_id, rating) WHERE rating IS NOT NULL;

COMMIT; 