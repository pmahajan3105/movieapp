-- Final Database Fix for Movie App - Addresses all current errors
-- Run this in your Supabase SQL Editor to fix database issues

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP ALL PROBLEMATIC TRIGGERS FIRST
DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
DROP TRIGGER IF EXISTS update_user_ratings_updated_at ON user_ratings;
DROP TRIGGER IF EXISTS update_movies_updated_at ON movies;
DROP TRIGGER IF EXISTS update_watchlist_updated_at ON watchlist;

-- Drop the function too to avoid conflicts
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 2. FIX MOVIES TABLE COLUMN NAMING ISSUE
DO $$
BEGIN
    -- Check if imdb_rating column exists and rename it to rating
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'imdb_rating'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'rating'
    ) THEN
        ALTER TABLE movies RENAME COLUMN imdb_rating TO rating;
        RAISE NOTICE 'Renamed imdb_rating column to rating in movies table';
    END IF;

    -- Ensure rating column exists with correct type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'rating'
    ) THEN
        ALTER TABLE movies ADD COLUMN rating DECIMAL(3,1);
        RAISE NOTICE 'Added rating column to movies table';
    END IF;
END $$;

-- 3. FIX WATCHLIST TABLE (REMOVE RATING COLUMN SINCE NOT NEEDED)
-- Based on your streamlined scope, you don't want user ratings in watchlist
DO $$
BEGIN
    -- Remove rating column from watchlist if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'rating'
    ) THEN
        ALTER TABLE watchlist DROP COLUMN rating;
        RAISE NOTICE 'Removed rating column from watchlist table (not needed in streamlined scope)';
    END IF;

    -- Ensure watchlist has correct columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'watched'
    ) THEN
        ALTER TABLE watchlist ADD COLUMN watched BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added watched column to watchlist table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'watched_at'
    ) THEN
        ALTER TABLE watchlist ADD COLUMN watched_at TIMESTAMPTZ;
        RAISE NOTICE 'Added watched_at column to watchlist table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'notes'
    ) THEN
        ALTER TABLE watchlist ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to watchlist table';
    END IF;
END $$;

-- 4. FIX RATINGS TABLE (REMOVE UPDATED_AT COLUMN THAT CAUSES TRIGGER ERROR)
DO $$
BEGIN
    -- Remove updated_at column from ratings table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE ratings DROP COLUMN updated_at;
        RAISE NOTICE 'Removed updated_at column from ratings table (was causing trigger error)';
    END IF;

    -- Remove rating column from ratings table since you only want like/dislike
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'rating'
    ) THEN
        ALTER TABLE ratings DROP COLUMN rating;
        RAISE NOTICE 'Removed rating column from ratings table (streamlined to like/dislike only)';
    END IF;

    -- Ensure ratings table has correct structure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'interested'
    ) THEN
        ALTER TABLE ratings ADD COLUMN interested BOOLEAN NOT NULL DEFAULT TRUE;
        RAISE NOTICE 'Added interested column to ratings table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'interaction_type'
    ) THEN
        ALTER TABLE ratings ADD COLUMN interaction_type TEXT DEFAULT 'browse';
        RAISE NOTICE 'Added interaction_type column to ratings table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'rated_at'
    ) THEN
        ALTER TABLE ratings ADD COLUMN rated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added rated_at column to ratings table';
    END IF;
END $$;

-- 5. ENSURE MOVIES TABLE HAS ALL REQUIRED COLUMNS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE movies ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to movies table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE movies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to movies table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'omdb_id'
    ) THEN
        ALTER TABLE movies ADD COLUMN omdb_id TEXT UNIQUE;
        RAISE NOTICE 'Added omdb_id column to movies table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'genre'
    ) THEN
        ALTER TABLE movies ADD COLUMN genre TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added genre column to movies table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'director'
    ) THEN
        ALTER TABLE movies ADD COLUMN director TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added director column to movies table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'actors'
    ) THEN
        ALTER TABLE movies ADD COLUMN actors TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added actors column to movies table';
    END IF;
END $$;

-- 6. CREATE PROPER INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating);
CREATE INDEX IF NOT EXISTS idx_movies_omdb_id ON movies(omdb_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_watched ON watchlist(user_id, watched);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_interested ON ratings(user_id, interested);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 8. DROP EXISTING POLICIES AND RECREATE THEM
DROP POLICY IF EXISTS "Users can manage own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can manage own ratings" ON ratings;
DROP POLICY IF EXISTS "Anyone can view movies" ON movies;
DROP POLICY IF EXISTS "Service role can manage movies" ON movies;

-- Create RLS policies for movies (public read, service role write)
CREATE POLICY "Anyone can view movies" ON movies
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage movies" ON movies
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for watchlist
CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ratings
CREATE POLICY "Users can manage own ratings" ON ratings
  FOR ALL USING (auth.uid() = user_id);

-- 9. CREATE UPDATED_AT TRIGGER ONLY FOR TABLES THAT NEED IT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger for movies table (which has updated_at column)
CREATE TRIGGER update_movies_updated_at 
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. VERIFY DATABASE STRUCTURE
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== DATABASE STRUCTURE VERIFICATION ===';
    
    -- Check movies table columns
    RAISE NOTICE 'Movies table columns:';
    FOR rec IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'movies' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  movies.%: %', rec.column_name, rec.data_type;
    END LOOP;
    
    -- Check watchlist table columns
    RAISE NOTICE 'Watchlist table columns:';
    FOR rec IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'watchlist' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  watchlist.%: %', rec.column_name, rec.data_type;
    END LOOP;
    
    -- Check ratings table columns
    RAISE NOTICE 'Ratings table columns:';
    FOR rec IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ratings' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  ratings.%: %', rec.column_name, rec.data_type;
    END LOOP;
    
    RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database fix completed successfully!';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '  1. Renamed imdb_rating → rating in movies table';
    RAISE NOTICE '  2. Removed problematic updated_at column from ratings table';
    RAISE NOTICE '  3. Removed rating column from watchlist (streamlined scope)';
    RAISE NOTICE '  4. Fixed trigger conflicts';
    RAISE NOTICE '  5. Ensured all required columns exist';
    RAISE NOTICE '  6. Created proper indexes and RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Your app should now work without database errors!';
END $$; 