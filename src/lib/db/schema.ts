/**
 * SQLite Schema for CineAI Personal Mode
 *
 * All tables for local-first personal movie recommendation
 */

export const SCHEMA_VERSION = 1

export const CREATE_TABLES_SQL = `
-- User profile (single user, no auth)
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  preferences TEXT DEFAULT '{}'
);

-- Movies (cached from TMDB)
CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER UNIQUE,
  imdb_id TEXT,
  title TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  director TEXT,
  cast TEXT,
  plot TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  rating REAL,
  runtime INTEGER,
  popularity REAL,
  source TEXT DEFAULT 'tmdb',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- User ratings
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL REFERENCES movies(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  interested INTEGER DEFAULT 1,
  rated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(movie_id)
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL REFERENCES movies(id),
  added_at TEXT DEFAULT (datetime('now')),
  watched INTEGER DEFAULT 0,
  watched_at TEXT,
  notes TEXT,
  UNIQUE(movie_id)
);

-- User interactions (for learning preferences)
CREATE TABLE IF NOT EXISTS user_interactions (
  id TEXT PRIMARY KEY,
  movie_id TEXT REFERENCES movies(id),
  interaction_type TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Chat sessions (for AI conversations)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  messages TEXT DEFAULT '[]',
  preferences_extracted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);
`

export const CREATE_INDEXES_SQL = `
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_at ON ratings(rated_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON user_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(interaction_type);
`

export const INSERT_DEFAULT_USER_SQL = `
INSERT OR IGNORE INTO user_profile (id, name, preferences)
VALUES (1, 'User', '{}');
`

export const INSERT_SCHEMA_VERSION_SQL = `
INSERT OR IGNORE INTO schema_version (version) VALUES (?);
`
