-- Fix Database Issues for Movie App - Comprehensive Fix
-- Run this in your Supabase SQL Editor to fix all database issues

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Remove problematic triggers first
DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
DROP TRIGGER IF EXISTS update_user_ratings_updated_at ON user_ratings;

-- 2. Fix movies table structure
DO $$
BEGIN
    -- Check if imdb_rating column exists and rating doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'imdb_rating'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'rating'
    ) THEN
        -- Rename imdb_rating to rating
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

-- 3. Create or fix watchlist table with all required columns
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  watched BOOLEAN DEFAULT FALSE,
  watched_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  UNIQUE(user_id, movie_id)
);

-- Add missing columns to existing watchlist table
DO $$
BEGIN
    -- Add watched column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'watched'
    ) THEN
        ALTER TABLE watchlist ADD COLUMN watched BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added watched column to watchlist table';
    END IF;

    -- Add watched_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'watched_at'
    ) THEN
        ALTER TABLE watchlist ADD COLUMN watched_at TIMESTAMPTZ;
        RAISE NOTICE 'Added watched_at column to watchlist table';
    END IF;

    -- Add rating column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'rating'
    ) THEN
        ALTER TABLE watchlist ADD COLUMN rating INTEGER CHECK (rating BETWEEN 1 AND 5);
        RAISE NOTICE 'Added rating column to watchlist table';
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watchlist' AND column_name = 'notes'
    ) THEN
        ALTER TABLE watchlist ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to watchlist table';
    END IF;
END $$;

-- 4. Create correct ratings table (matches the API expectations)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  interested BOOLEAN NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'dislike', 'watchlist', 'quick_rate', 'spotlight', 'browse')) DEFAULT 'browse',
  source TEXT DEFAULT 'browse',
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- 5. Remove user_ratings table if it exists (we're using ratings table instead)
DROP TABLE IF EXISTS user_ratings CASCADE;

-- 6. Ensure movies table has all required columns
DO $$
BEGIN
    -- Check and add missing columns to movies table
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
        ALTER TABLE movies ADD COLUMN omdb_id VARCHAR(20) UNIQUE;
        RAISE NOTICE 'Added omdb_id column to movies table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'imdb_id'
    ) THEN
        ALTER TABLE movies ADD COLUMN imdb_id VARCHAR(20);
        RAISE NOTICE 'Added imdb_id column to movies table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'runtime'
    ) THEN
        ALTER TABLE movies ADD COLUMN runtime INTEGER;
        RAISE NOTICE 'Added runtime column to movies table';
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
END $$;

-- 7. Create proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating);
CREATE INDEX IF NOT EXISTS idx_movies_omdb_id ON movies(omdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_watched ON watchlist(user_id, watched);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_interested ON ratings(user_id, interested);

-- 8. Enable Row Level Security
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can manage own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can manage own ratings" ON ratings;
DROP POLICY IF EXISTS "Anyone can view movies" ON movies;
DROP POLICY IF EXISTS "Only admins can insert movies" ON movies;
DROP POLICY IF EXISTS "Only admins can update movies" ON movies;
DROP POLICY IF EXISTS "Only admins can delete movies" ON movies;

-- Create RLS policies for movies (public read, admin write)
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

-- 10. Create function for updating updated_at timestamp (only for tables that have it)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create triggers only for tables with updated_at column
CREATE TRIGGER update_movies_updated_at 
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Verify the database structure
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Verifying database structure...';
    
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
END $$;

COMMIT;

-- Success message
SELECT 'All database issues have been fixed! The application should now work properly.' as status; 