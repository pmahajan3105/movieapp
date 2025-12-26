-- CineAI Core Schema
-- Migration: 001_core_schema.sql
-- Description: Core tables for movies, users, ratings, and watchlist

BEGIN;

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Handle new user registration (creates profile automatically)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLE: user_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'User profile information, preferences, and settings';
COMMENT ON COLUMN user_profiles.preferences IS 'JSON containing AI settings, quality threshold, exploration weight, etc.';

-- ============================================================
-- TABLE: movies
-- ============================================================

CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  year INTEGER,
  genre TEXT[] DEFAULT '{}',
  director TEXT[] DEFAULT '{}',
  actors TEXT[] DEFAULT '{}',  -- Legacy field
  cast TEXT[] DEFAULT '{}',    -- Preferred field
  plot TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  description TEXT,            -- TMDB overview
  release_date DATE,
  rating DECIMAL(3,1),         -- Average rating (0-10)
  runtime INTEGER,             -- Minutes
  omdb_id TEXT,
  imdb_id TEXT,
  tmdb_id INTEGER UNIQUE,      -- TMDB is primary source
  popularity DECIMAL(10,3),
  source TEXT DEFAULT 'tmdb',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE movies IS 'Movie database with metadata from TMDB/OMDB';
COMMENT ON COLUMN movies.rating IS 'Average rating 0-10 from TMDB';
COMMENT ON COLUMN movies.genre IS 'Array of genre names';

-- ============================================================
-- TABLE: ratings
-- ============================================================

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),  -- User's 1-5 star rating
  interested BOOLEAN NOT NULL DEFAULT true,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'dislike', 'watchlist', 'quick_rate', 'browse')) DEFAULT 'browse',
  source TEXT DEFAULT 'app',
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

COMMENT ON TABLE ratings IS 'User movie ratings (1-5 stars) and interest signals';
COMMENT ON COLUMN ratings.interested IS 'Whether user showed positive interest in this movie';

-- ============================================================
-- TABLE: watchlist
-- ============================================================

CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  watched BOOLEAN DEFAULT FALSE,
  watched_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),  -- Optional rating after watching
  notes TEXT,
  UNIQUE(user_id, movie_id)
);

COMMENT ON TABLE watchlist IS 'User personal watchlist and viewing history';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_movies_updated_at ON movies;
CREATE TRIGGER update_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMIT;
