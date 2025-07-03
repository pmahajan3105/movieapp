-- Migration: Add tables for AI services
-- Created: 2025-07-03
-- Description: Creates tables for storing cinematic style analysis, thematic profiles, and emotional journeys

-- Create table for cinematic style analysis
CREATE TABLE IF NOT EXISTS movie_cinematic_styles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    visual_characteristics JSONB DEFAULT '[]',
    camera_work JSONB DEFAULT '{}',
    editing_style JSONB DEFAULT '{}',
    sound_design JSONB DEFAULT '{}',
    production_design JSONB DEFAULT '{}',
    directoral_signature JSONB,
    style_influences JSONB DEFAULT '[]',
    innovations JSONB DEFAULT '[]',
    confidence REAL DEFAULT 0.7,
    focus_areas TEXT[] DEFAULT ARRAY['cinematography', 'editing'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for thematic profiles
CREATE TABLE IF NOT EXISTS movie_thematic_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    psychological_themes JSONB DEFAULT '[]',
    narrative_structure JSONB DEFAULT '{}',
    emotional_journey JSONB DEFAULT '{}',
    visual_motifs JSONB DEFAULT '[]',
    cinematic_style JSONB DEFAULT '{}',
    cultural_context JSONB DEFAULT '{}',
    genre_themes JSONB DEFAULT '[]',
    atmospheric_qualities JSONB DEFAULT '[]',
    confidence REAL DEFAULT 0.7,
    last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for emotional analysis
CREATE TABLE IF NOT EXISTS movie_emotional_journeys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    overall_pattern TEXT DEFAULT 'gradual_ascent',
    emotional_beats JSONB DEFAULT '[]',
    climactic_moment JSONB DEFAULT '{}',
    resolution JSONB DEFAULT '{}',
    intensity_score REAL DEFAULT 0.6,
    cathartic_elements TEXT[] DEFAULT ARRAY[]::TEXT[],
    atmospheric_qualities JSONB DEFAULT '[]',
    confidence REAL DEFAULT 0.7,
    user_mood_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for conversational query cache
CREATE TABLE IF NOT EXISTS conversational_query_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_query TEXT NOT NULL,
    parsed_query JSONB NOT NULL,
    intent TEXT NOT NULL,
    confidence REAL DEFAULT 0.7,
    complexity_score REAL DEFAULT 0.5,
    multi_intent BOOLEAN DEFAULT false,
    requires_explanation BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for AI service health monitoring
CREATE TABLE IF NOT EXISTS ai_service_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'failed')),
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraints
ALTER TABLE movie_cinematic_styles ADD CONSTRAINT unique_movie_cinematic_style UNIQUE (movie_id);
ALTER TABLE movie_thematic_profiles ADD CONSTRAINT unique_movie_thematic_profile UNIQUE (movie_id);
ALTER TABLE movie_emotional_journeys ADD CONSTRAINT unique_movie_emotional_journey UNIQUE (movie_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cinematic_styles_movie_id ON movie_cinematic_styles(movie_id);
CREATE INDEX IF NOT EXISTS idx_cinematic_styles_confidence ON movie_cinematic_styles(confidence);
CREATE INDEX IF NOT EXISTS idx_cinematic_styles_created_at ON movie_cinematic_styles(created_at);

CREATE INDEX IF NOT EXISTS idx_thematic_profiles_movie_id ON movie_thematic_profiles(movie_id);
CREATE INDEX IF NOT EXISTS idx_thematic_profiles_confidence ON movie_thematic_profiles(confidence);
CREATE INDEX IF NOT EXISTS idx_thematic_profiles_last_analyzed ON movie_thematic_profiles(last_analyzed);

CREATE INDEX IF NOT EXISTS idx_emotional_journeys_movie_id ON movie_emotional_journeys(movie_id);
CREATE INDEX IF NOT EXISTS idx_emotional_journeys_pattern ON movie_emotional_journeys(overall_pattern);
CREATE INDEX IF NOT EXISTS idx_emotional_journeys_intensity ON movie_emotional_journeys(intensity_score);

CREATE INDEX IF NOT EXISTS idx_query_cache_user_id ON conversational_query_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_query_cache_intent ON conversational_query_cache(intent);
CREATE INDEX IF NOT EXISTS idx_query_cache_created_at ON conversational_query_cache(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_health_service ON ai_service_health(service_name);
CREATE INDEX IF NOT EXISTS idx_ai_health_status ON ai_service_health(status);
CREATE INDEX IF NOT EXISTS idx_ai_health_last_check ON ai_service_health(last_check);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cinematic_styles_updated_at BEFORE UPDATE ON movie_cinematic_styles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_thematic_profiles_updated_at BEFORE UPDATE ON movie_thematic_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emotional_journeys_updated_at BEFORE UPDATE ON movie_emotional_journeys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS)
ALTER TABLE movie_cinematic_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_thematic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_emotional_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversational_query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_service_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cinematic styles (public read, authenticated write)
CREATE POLICY "Public can read cinematic styles" ON movie_cinematic_styles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cinematic styles" ON movie_cinematic_styles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update cinematic styles" ON movie_cinematic_styles FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for thematic profiles (public read, authenticated write)
CREATE POLICY "Public can read thematic profiles" ON movie_thematic_profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert thematic profiles" ON movie_thematic_profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update thematic profiles" ON movie_thematic_profiles FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for emotional journeys (public read, authenticated write)
CREATE POLICY "Public can read emotional journeys" ON movie_emotional_journeys FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert emotional journeys" ON movie_emotional_journeys FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update emotional journeys" ON movie_emotional_journeys FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for query cache (users can only access their own data)
CREATE POLICY "Users can read their own query cache" ON conversational_query_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own query cache" ON conversational_query_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own query cache" ON conversational_query_cache FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for AI service health (public read for status, authenticated write)
CREATE POLICY "Public can read AI service health" ON ai_service_health FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert AI service health" ON ai_service_health FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update AI service health" ON ai_service_health FOR UPDATE USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE movie_cinematic_styles IS 'Stores cinematic style analysis for movies including camera work, editing, and production design';
COMMENT ON TABLE movie_thematic_profiles IS 'Stores comprehensive thematic analysis including psychological themes and narrative structure';
COMMENT ON TABLE movie_emotional_journeys IS 'Stores emotional journey analysis including beats, patterns, and intensity scores';
COMMENT ON TABLE conversational_query_cache IS 'Caches parsed conversational queries for performance optimization';
COMMENT ON TABLE ai_service_health IS 'Monitors the health and performance of AI services';