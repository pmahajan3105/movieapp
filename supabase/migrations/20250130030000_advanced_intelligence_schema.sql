-- Advanced Movie Intelligence Database Schema
-- Comprehensive schema for thematic analysis, emotional journeys, and cinematic styles

-- Thematic Profiles Table
CREATE TABLE IF NOT EXISTS movie_thematic_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    
    -- Psychological Themes (JSONB for flexibility)
    psychological_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Narrative Structure
    narrative_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Emotional Journey
    emotional_journey JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Visual Motifs
    visual_motifs JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Cinematic Style
    cinematic_style JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Cultural Context
    cultural_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Genre Themes
    genre_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Atmospheric Qualities
    atmospheric_qualities JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Analysis Metadata
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    last_analyzed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analysis_version TEXT NOT NULL DEFAULT 'v1.0',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(movie_id)
);

-- Cinematic Style Profiles Table
CREATE TABLE IF NOT EXISTS movie_cinematic_styles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    
    -- Directorial Signature
    directorial_signature TEXT,
    
    -- Visual Characteristics
    visual_characteristics JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Camera Work
    camera_work JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Editing Style
    editing_style JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Sound Design
    sound_design JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Production Design
    production_design JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Style Influences
    style_influences JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Technical Innovations
    innovations JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Analysis Metadata
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    last_analyzed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    focus_areas TEXT[] NOT NULL DEFAULT ARRAY['cinematography', 'editing', 'sound', 'production_design'],
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(movie_id)
);

-- Emotional Journey Profiles Table
CREATE TABLE IF NOT EXISTS movie_emotional_journeys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    
    -- Overall Pattern
    overall_pattern TEXT NOT NULL DEFAULT 'gradual_ascent',
    
    -- Emotional Beats
    emotional_beats JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Climactic Moment
    climactic_moment JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Resolution
    resolution JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Intensity Score
    intensity_score DECIMAL(3,2) NOT NULL DEFAULT 0.6 CHECK (intensity_score >= 0 AND intensity_score <= 1),
    
    -- Cathartic Elements
    cathartic_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- User Context (for mood-based analysis)
    user_mood_context TEXT,
    
    -- Analysis Metadata
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    last_analyzed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(movie_id, user_mood_context)
);

-- Advanced Query History Table
CREATE TABLE IF NOT EXISTS user_advanced_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Query Data
    original_query TEXT NOT NULL,
    processed_query JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Extracted Understanding
    extracted_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
    detected_intents JSONB NOT NULL DEFAULT '[]'::jsonb,
    implicit_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    contextual_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Query Classification
    complexity_level TEXT NOT NULL DEFAULT 'moderate' CHECK (complexity_level IN ('simple', 'moderate', 'complex', 'expert')),
    recommendation_strategy TEXT NOT NULL DEFAULT 'hybrid',
    requires_explanation BOOLEAN NOT NULL DEFAULT false,
    
    -- Performance Metrics
    processing_time_ms INTEGER NOT NULL DEFAULT 0,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Results
    search_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended_movies TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for user_advanced_queries
CREATE INDEX IF NOT EXISTS idx_user_advanced_queries_user_id ON user_advanced_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_advanced_queries_created_at ON user_advanced_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_user_advanced_queries_complexity ON user_advanced_queries(complexity_level);

-- User Emotional Preferences Table
CREATE TABLE IF NOT EXISTS user_emotional_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Emotional Pattern Preferences
    emotional_pattern TEXT NOT NULL,
    preference_score DECIMAL(3,2) NOT NULL CHECK (preference_score >= -1 AND preference_score <= 1),
    intensity_tolerance DECIMAL(3,2) NOT NULL DEFAULT 0.6 CHECK (intensity_tolerance >= 0 AND intensity_tolerance <= 1),
    
    -- Mood Dependencies
    mood_dependencies JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Context
    context_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Confidence and Evolution
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    preference_evolution JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, emotional_pattern)
);

-- User Thematic Preferences Table
CREATE TABLE IF NOT EXISTS user_thematic_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Theme Preferences
    theme_id TEXT NOT NULL,
    affinity_score DECIMAL(3,2) NOT NULL CHECK (affinity_score >= -1 AND affinity_score <= 1),
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Context
    context_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Evidence and Evolution
    evidence_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    preference_evolution JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, theme_id)
);

-- Style Similarity Cache Table
CREATE TABLE IF NOT EXISTS movie_style_similarities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    target_movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    
    -- Similarity Metrics
    overall_similarity DECIMAL(3,2) NOT NULL CHECK (overall_similarity >= 0 AND overall_similarity <= 1),
    camera_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (camera_similarity >= 0 AND camera_similarity <= 1),
    editing_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (editing_similarity >= 0 AND editing_similarity <= 1),
    color_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (color_similarity >= 0 AND color_similarity <= 1),
    composition_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (composition_similarity >= 0 AND composition_similarity <= 1),
    
    -- Shared and Distinct Elements
    shared_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    distinct_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Analysis Metadata
    explanation TEXT NOT NULL DEFAULT '',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(source_movie_id, target_movie_id),
    CHECK (source_movie_id != target_movie_id)
);

-- Thematic Similarity Cache Table
CREATE TABLE IF NOT EXISTS movie_thematic_similarities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    target_movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    
    -- Similarity Metrics
    overall_similarity DECIMAL(3,2) NOT NULL CHECK (overall_similarity >= 0 AND overall_similarity <= 1),
    theme_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (theme_similarity >= 0 AND theme_similarity <= 1),
    narrative_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (narrative_similarity >= 0 AND narrative_similarity <= 1),
    emotional_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (emotional_similarity >= 0 AND emotional_similarity <= 1),
    cultural_similarity DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (cultural_similarity >= 0 AND cultural_similarity <= 1),
    
    -- Shared Themes
    shared_themes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    
    -- Analysis Metadata
    explanation TEXT NOT NULL DEFAULT '',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(source_movie_id, target_movie_id),
    CHECK (source_movie_id != target_movie_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_thematic_profiles_movie_id ON movie_thematic_profiles(movie_id);
CREATE INDEX IF NOT EXISTS idx_thematic_profiles_confidence ON movie_thematic_profiles(confidence);
CREATE INDEX IF NOT EXISTS idx_thematic_profiles_last_analyzed ON movie_thematic_profiles(last_analyzed);

CREATE INDEX IF NOT EXISTS idx_cinematic_styles_movie_id ON movie_cinematic_styles(movie_id);
CREATE INDEX IF NOT EXISTS idx_cinematic_styles_directorial_signature ON movie_cinematic_styles(directorial_signature);
CREATE INDEX IF NOT EXISTS idx_cinematic_styles_confidence ON movie_cinematic_styles(confidence);

CREATE INDEX IF NOT EXISTS idx_emotional_journeys_movie_id ON movie_emotional_journeys(movie_id);
CREATE INDEX IF NOT EXISTS idx_emotional_journeys_pattern ON movie_emotional_journeys(overall_pattern);
CREATE INDEX IF NOT EXISTS idx_emotional_journeys_intensity ON movie_emotional_journeys(intensity_score);

CREATE INDEX IF NOT EXISTS idx_user_emotional_prefs_user_id ON user_emotional_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emotional_prefs_pattern ON user_emotional_preferences(emotional_pattern);

CREATE INDEX IF NOT EXISTS idx_user_thematic_prefs_user_id ON user_thematic_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_thematic_prefs_theme ON user_thematic_preferences(theme_id);
CREATE INDEX IF NOT EXISTS idx_user_thematic_prefs_affinity ON user_thematic_preferences(affinity_score);

CREATE INDEX IF NOT EXISTS idx_style_similarities_source ON movie_style_similarities(source_movie_id);
CREATE INDEX IF NOT EXISTS idx_style_similarities_target ON movie_style_similarities(target_movie_id);
CREATE INDEX IF NOT EXISTS idx_style_similarities_overall ON movie_style_similarities(overall_similarity);

CREATE INDEX IF NOT EXISTS idx_thematic_similarities_source ON movie_thematic_similarities(source_movie_id);
CREATE INDEX IF NOT EXISTS idx_thematic_similarities_target ON movie_thematic_similarities(target_movie_id);
CREATE INDEX IF NOT EXISTS idx_thematic_similarities_overall ON movie_thematic_similarities(overall_similarity);

-- Enable Row Level Security (RLS)
ALTER TABLE movie_thematic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_cinematic_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_emotional_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_advanced_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_emotional_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_thematic_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_style_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_thematic_similarities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for thematic profiles (readable by all authenticated users)
CREATE POLICY "Thematic profiles are viewable by authenticated users"
ON movie_thematic_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Thematic profiles are insertable by authenticated users"
ON movie_thematic_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Thematic profiles are updatable by authenticated users"
ON movie_thematic_profiles FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies for cinematic styles (readable by all authenticated users)
CREATE POLICY "Cinematic styles are viewable by authenticated users"
ON movie_cinematic_styles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cinematic styles are insertable by authenticated users"
ON movie_cinematic_styles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Cinematic styles are updatable by authenticated users"
ON movie_cinematic_styles FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies for emotional journeys (readable by all authenticated users)
CREATE POLICY "Emotional journeys are viewable by authenticated users"
ON movie_emotional_journeys FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Emotional journeys are insertable by authenticated users"
ON movie_emotional_journeys FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Emotional journeys are updatable by authenticated users"
ON movie_emotional_journeys FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies for user queries (users can only see their own)
CREATE POLICY "Users can view their own advanced queries"
ON user_advanced_queries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own advanced queries"
ON user_advanced_queries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user preferences (users can only see their own)
CREATE POLICY "Users can view their own emotional preferences"
ON user_emotional_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emotional preferences"
ON user_emotional_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emotional preferences"
ON user_emotional_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own thematic preferences"
ON user_thematic_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own thematic preferences"
ON user_thematic_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thematic preferences"
ON user_thematic_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for similarity caches (readable by all authenticated users)
CREATE POLICY "Style similarities are viewable by authenticated users"
ON movie_style_similarities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Style similarities are insertable by authenticated users"
ON movie_style_similarities FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Thematic similarities are viewable by authenticated users"
ON movie_thematic_similarities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Thematic similarities are insertable by authenticated users"
ON movie_thematic_similarities FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_thematic_profiles_updated_at
    BEFORE UPDATE ON movie_thematic_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cinematic_styles_updated_at
    BEFORE UPDATE ON movie_cinematic_styles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotional_journeys_updated_at
    BEFORE UPDATE ON movie_emotional_journeys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotional_preferences_updated_at
    BEFORE UPDATE ON user_emotional_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thematic_preferences_updated_at
    BEFORE UPDATE ON user_thematic_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();