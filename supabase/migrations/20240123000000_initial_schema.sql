-- Initial database schema for Movie Recommendation App
-- Migration: 20240123000000_initial_schema.sql

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Movies table
CREATE TABLE movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  year INTEGER,
  genre TEXT[] DEFAULT '{}',
  director TEXT[] DEFAULT '{}',
  actors TEXT[] DEFAULT '{}',
  plot TEXT,
  poster_url TEXT,
  rating DECIMAL(3,1),
  runtime INTEGER,
  omdb_id TEXT UNIQUE,
  imdb_id TEXT,
  tmdb_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Watchlist table
CREATE TABLE watchlist (
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

-- 4. Recommendation queue table
CREATE TABLE recommendation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL DEFAULT 'content_based',
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reason JSONB DEFAULT '{}',
  consumed BOOLEAN DEFAULT FALSE,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_movies_genre ON movies USING GIN(genre);
CREATE INDEX idx_movies_omdb_id ON movies(omdb_id);
CREATE INDEX idx_movies_imdb_id ON movies(imdb_id);
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX idx_watchlist_watched ON watchlist(user_id, watched);
CREATE INDEX idx_recommendation_queue_user_id ON recommendation_queue(user_id);
CREATE INDEX idx_recommendation_queue_consumed ON recommendation_queue(user_id, consumed);

-- 6. Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_queue ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Movies are publicly viewable" ON movies
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert movies" ON movies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations" ON recommendation_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only system can manage recommendation queue" ON recommendation_queue
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 8. Add triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON movies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 11. Add comments for documentation
COMMENT ON TABLE user_profiles IS 'User profile information and preferences';
COMMENT ON TABLE movies IS 'Movie database with metadata from various sources';
COMMENT ON TABLE watchlist IS 'User personal watchlist and viewing history';
COMMENT ON TABLE recommendation_queue IS 'AI-generated movie recommendations for users';

COMMIT; 