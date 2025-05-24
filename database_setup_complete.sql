-- Complete Database Setup for Movie App
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create movies table
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  year INTEGER,
  genre TEXT[] DEFAULT '{}',
  director TEXT[] DEFAULT '{}',
  plot TEXT,
  poster_url TEXT,
  rating DECIMAL(3,1),
  runtime INTEGER,
  omdb_id VARCHAR(20) UNIQUE,
  imdb_id VARCHAR(20),
  tmdb_id INTEGER,
  trailer_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'want_to_watch' CHECK (status IN ('want_to_watch', 'watching', 'watched')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- Create user ratings table
CREATE TABLE IF NOT EXISTS user_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- Create categories table for movie genres
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create movie_categories junction table
CREATE TABLE IF NOT EXISTS movie_categories (
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, category_id)
);

-- Create the chat_sessions table for CineAI
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  preferences_extracted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating);
CREATE INDEX IF NOT EXISTS idx_movies_omdb_id ON movies(omdb_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_movie_id ON user_ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Enable Row Level Security
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for movies (public read, admin write)
CREATE POLICY "Anyone can view movies" ON movies
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert movies" ON movies
  FOR INSERT WITH CHECK (false); -- We'll use service role for seeding

CREATE POLICY "Only admins can update movies" ON movies
  FOR UPDATE USING (false);

CREATE POLICY "Only admins can delete movies" ON movies
  FOR DELETE USING (false);

-- Create RLS policies for watchlist
CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user ratings
CREATE POLICY "Users can manage own ratings" ON user_ratings
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for categories (public read)
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- Create RLS policies for movie_categories (public read)
CREATE POLICY "Anyone can view movie categories" ON movie_categories
  FOR SELECT USING (true);

-- Create RLS policy for chat sessions
CREATE POLICY "Users can manage own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating updated_at timestamp
CREATE TRIGGER update_movies_updated_at 
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ratings_updated_at 
  BEFORE UPDATE ON user_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Action', 'High-energy films with physical feats, fights, and chases'),
  ('Adventure', 'Exciting journeys and quests'),
  ('Animation', 'Animated films for all ages'),
  ('Biography', 'Life stories of real people'),
  ('Comedy', 'Films designed to make you laugh'),
  ('Crime', 'Stories involving criminal activity'),
  ('Documentary', 'Non-fiction films about real events'),
  ('Drama', 'Serious, plot-driven films'),
  ('Family', 'Films suitable for the whole family'),
  ('Fantasy', 'Magical and supernatural stories'),
  ('History', 'Films set in the past'),
  ('Horror', 'Scary and suspenseful films'),
  ('Music', 'Films centered around music'),
  ('Mystery', 'Puzzling stories with unknown elements'),
  ('Romance', 'Love stories and romantic relationships'),
  ('Sci-Fi', 'Science fiction and futuristic stories'),
  ('Sport', 'Films about sports and athletes'),
  ('Thriller', 'Suspenseful and exciting films'),
  ('War', 'Films about warfare and conflict'),
  ('Western', 'Films set in the American Old West')
ON CONFLICT (name) DO NOTHING; 