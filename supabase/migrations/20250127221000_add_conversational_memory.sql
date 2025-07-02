BEGIN;

-- Add conversational memory and 11Labs conversation tracking

-- Track conversation sessions with context
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT, -- Optional: for movie-specific conversations
  context_type TEXT NOT NULL CHECK (context_type IN ('movie_page', 'dashboard', 'search')),
  session_type TEXT NOT NULL CHECK (session_type IN ('movie_discussion', 'general_discovery', 'preference_exploration')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_exchanges INTEGER DEFAULT 0,
  context_data JSONB DEFAULT '{}', -- Additional context like movie title, genre, etc.
  session_insights JSONB DEFAULT '{}', -- Summary insights from this session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track individual conversation exchanges (user input + AI response)
CREATE TABLE conversation_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_number INTEGER NOT NULL, -- Order within session
  
  -- User input
  user_transcript TEXT NOT NULL,
  user_audio_url TEXT, -- 11Labs recorded user audio (optional)
  user_audio_duration INTEGER, -- Duration in seconds
  
  -- AI response
  ai_response TEXT NOT NULL,
  ai_audio_url TEXT, -- 11Labs generated AI audio
  ai_audio_duration INTEGER,
  
  -- Processing metadata
  transcript_confidence DECIMAL(3,2), -- 0.00-1.00 confidence from 11Labs
  processing_time_ms INTEGER,
  exchange_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extracted conversational memory from exchanges
CREATE TABLE conversational_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,
  exchange_id UUID REFERENCES conversation_exchanges(id) ON DELETE SET NULL,
  
  -- Memory content
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'genre_preference', 
    'genre_dislike',
    'actor_preference', 
    'actor_dislike',
    'director_preference',
    'mood_preference',
    'content_preference', -- themes, story types
    'viewing_context', -- when/how they like to watch
    'rating_pattern',
    'discovery_method',
    'personal_connection' -- movies tied to memories/experiences
  )),
  memory_category TEXT NOT NULL CHECK (memory_category IN (
    'strong_preference', 
    'mild_preference', 
    'neutral', 
    'mild_dislike', 
    'strong_dislike'
  )),
  
  preference_text TEXT NOT NULL, -- Natural language description
  structured_data JSONB NOT NULL, -- Structured preference data
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  
  -- Memory reinforcement
  mention_count INTEGER DEFAULT 1, -- How many times this preference was mentioned
  last_mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  memory_strength DECIMAL(3,2) DEFAULT 0.5, -- Calculated strength based on mentions and recency
  
  -- Context
  extraction_context JSONB DEFAULT '{}', -- Context when this was extracted
  supporting_evidence TEXT[], -- Supporting quotes from conversations
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Synthesized preference insights from conversational memory
CREATE TABLE preference_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Insight metadata
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'genre_profile',
    'mood_patterns', 
    'actor_affinity',
    'director_taste',
    'content_themes',
    'viewing_style',
    'discovery_preferences'
  )),
  insight_category TEXT NOT NULL CHECK (insight_category IN (
    'stable_preference', -- Consistent over time
    'emerging_pattern', -- Recently developing
    'declining_interest', -- Losing interest
    'contextual_preference' -- Depends on mood/time
  )),
  
  -- Insight content
  insight_summary TEXT NOT NULL, -- Natural language summary
  structured_insights JSONB NOT NULL, -- Structured insight data
  confidence_level DECIMAL(3,2) NOT NULL,
  supporting_memories UUID[] DEFAULT '{}', -- References to conversational_memory records
  
  -- Temporal metadata
  time_window TEXT NOT NULL, -- '30d', '90d', 'all_time'
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- When this insight should be recalculated
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX idx_conversation_sessions_movie_id ON conversation_sessions(movie_id);
CREATE INDEX idx_conversation_sessions_started_at ON conversation_sessions(started_at);

CREATE INDEX idx_conversation_exchanges_session_id ON conversation_exchanges(session_id);
CREATE INDEX idx_conversation_exchanges_user_id ON conversation_exchanges(user_id);
CREATE INDEX idx_conversation_exchanges_timestamp ON conversation_exchanges(exchange_timestamp);

CREATE INDEX idx_conversational_memory_user_id ON conversational_memory(user_id);
CREATE INDEX idx_conversational_memory_type ON conversational_memory(memory_type);
CREATE INDEX idx_conversational_memory_category ON conversational_memory(memory_category);
CREATE INDEX idx_conversational_memory_strength ON conversational_memory(memory_strength);
CREATE INDEX idx_conversational_memory_last_mentioned ON conversational_memory(last_mentioned_at);

CREATE INDEX idx_preference_insights_user_id ON preference_insights(user_id);
CREATE INDEX idx_preference_insights_type ON preference_insights(insight_type);
CREATE INDEX idx_preference_insights_expires_at ON preference_insights(expires_at);

-- Function to update memory strength based on mentions and recency
CREATE OR REPLACE FUNCTION update_memory_strength()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate memory strength based on mention count and recency
  -- More mentions = stronger memory, recent mentions = stronger memory
  NEW.memory_strength := LEAST(1.0, 
    (NEW.mention_count::decimal / 10.0) * 0.7 + 
    (1.0 - EXTRACT(EPOCH FROM (NOW() - NEW.last_mentioned_at)) / (86400 * 30)) * 0.3
  );
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update memory strength
CREATE TRIGGER trigger_update_memory_strength
  BEFORE UPDATE ON conversational_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_strength();

-- Function to auto-update session exchange counts
CREATE OR REPLACE FUNCTION update_session_exchange_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_sessions 
  SET 
    total_exchanges = (
      SELECT COUNT(*) 
      FROM conversation_exchanges 
      WHERE session_id = NEW.session_id
    ),
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update exchange counts
CREATE TRIGGER trigger_update_session_exchange_count
  AFTER INSERT ON conversation_exchanges
  FOR EACH ROW
  EXECUTE FUNCTION update_session_exchange_count();

-- RLS Policies (ensure users can only access their own data)
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversational_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference_insights ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversation data
CREATE POLICY "Users can access their own conversation sessions" ON conversation_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own conversation exchanges" ON conversation_exchanges
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own conversational memory" ON conversational_memory
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own preference insights" ON preference_insights
  FOR ALL USING (auth.uid() = user_id);

COMMIT; 