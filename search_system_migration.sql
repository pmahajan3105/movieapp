-- Search System Database Migration
-- Adds advanced search capabilities to the movie app
-- Run this AFTER the database_fix_final.sql

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 1. ADVANCED SEARCH INDEXES FOR MOVIES TABLE
-- ============================================================================

-- Full-text search indexes for natural language queries
CREATE INDEX IF NOT EXISTS idx_movies_title_search 
  ON movies USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_movies_director_search 
  ON movies USING gin(to_tsvector('english', 
    CASE 
      WHEN director IS NOT NULL AND array_length(director, 1) > 0 
      THEN array_to_string(director, ' ') 
      ELSE '' 
    END
  ));

CREATE INDEX IF NOT EXISTS idx_movies_actors_search 
  ON movies USING gin(to_tsvector('english', 
    CASE 
      WHEN actors IS NOT NULL AND array_length(actors, 1) > 0 
      THEN array_to_string(actors, ' ') 
      ELSE '' 
    END
  ));

-- Combined search index for relevance ranking
CREATE INDEX IF NOT EXISTS idx_movies_combined_search
  ON movies USING gin((
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', 
      CASE 
        WHEN director IS NOT NULL AND array_length(director, 1) > 0 
        THEN array_to_string(director, ' ') 
        ELSE '' 
      END
    ), 'B') ||
    setweight(to_tsvector('english', 
      CASE 
        WHEN actors IS NOT NULL AND array_length(actors, 1) > 0 
        THEN array_to_string(actors, ' ') 
        ELSE '' 
      END
    ), 'C')
  ));

-- Trigram indexes for autocomplete functionality
CREATE INDEX IF NOT EXISTS idx_movies_title_trigram 
  ON movies USING gin(title gin_trgm_ops);

-- Genre filtering with GIN index
CREATE INDEX IF NOT EXISTS idx_movies_genre_gin 
  ON movies USING gin(genre);

-- Multi-column indexes for complex filtering
CREATE INDEX IF NOT EXISTS idx_movies_year_rating 
  ON movies(year DESC, rating DESC NULLS LAST);

-- ============================================================================
-- 2. SEARCH HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search history
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at DESC);

-- RLS for search history
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own search history" ON search_history
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 3. FILTER PRESETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filter presets
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_id ON filter_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_is_public ON filter_presets(is_public, usage_count DESC) WHERE is_public = true;

-- RLS for filter presets
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own filter presets" ON filter_presets
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public filter presets" ON filter_presets
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🔍 Search system database setup completed successfully!';
    RAISE NOTICE 'Next: Run the API endpoints and frontend components!';
END $$; 