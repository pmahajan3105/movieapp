-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for movie embeddings
CREATE TABLE IF NOT EXISTS movie_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  plot_embedding VECTOR(1536), -- OpenAI/Anthropic embedding dimension
  metadata_embedding VECTOR(1536), -- For genre, director, cast info
  combined_embedding VECTOR(1536), -- Combined semantic representation
  content_text TEXT, -- Original text used for embedding
  metadata_text TEXT, -- Metadata used for embedding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast vector similarity search
CREATE INDEX IF NOT EXISTS movie_embeddings_plot_idx ON movie_embeddings 
USING ivfflat (plot_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS movie_embeddings_metadata_idx ON movie_embeddings 
USING ivfflat (metadata_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS movie_embeddings_combined_idx ON movie_embeddings 
USING ivfflat (combined_embedding vector_cosine_ops) WITH (lists = 100);

-- Create index on movie_id for quick lookups
CREATE INDEX IF NOT EXISTS movie_embeddings_movie_id_idx ON movie_embeddings (movie_id);

-- Create table for user memory vectors (long-term preferences and interactions)
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'interaction', 'behavior', 'rating', 'search')),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to auth.users
  CONSTRAINT fk_user_memories_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for user memories
CREATE INDEX IF NOT EXISTS user_memories_user_id_idx ON user_memories (user_id);
CREATE INDEX IF NOT EXISTS user_memories_type_idx ON user_memories (memory_type);
CREATE INDEX IF NOT EXISTS user_memories_embedding_idx ON user_memories 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for efficient user-specific memory search
CREATE INDEX IF NOT EXISTS user_memories_user_type_idx ON user_memories (user_id, memory_type);

-- Add RLS (Row Level Security) policies
ALTER TABLE movie_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Policy for movie_embeddings (readable by all authenticated users)
CREATE POLICY "movie_embeddings_read" ON movie_embeddings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for user_memories (users can only see their own memories)
CREATE POLICY "user_memories_read" ON user_memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_memories_insert" ON user_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_memories_update" ON user_memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_memories_delete" ON user_memories
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_movie_embeddings_updated_at 
  BEFORE UPDATE ON movie_embeddings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memories_updated_at 
  BEFORE UPDATE ON user_memories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for semantic movie search
CREATE OR REPLACE FUNCTION search_movies_semantic(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  movie_id TEXT,
  title TEXT,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
  SELECT 
    movie_embeddings.movie_id,
    movie_embeddings.title,
    1 - (movie_embeddings.combined_embedding <=> query_embedding) AS similarity
  FROM movie_embeddings
  WHERE 1 - (movie_embeddings.combined_embedding <=> query_embedding) > match_threshold
  ORDER BY movie_embeddings.combined_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create function for user memory search
CREATE OR REPLACE FUNCTION search_user_memories(
  user_id_param UUID,
  query_embedding VECTOR(1536),
  memory_types TEXT[] DEFAULT ARRAY['preference', 'interaction', 'behavior'],
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  content TEXT,
  metadata JSONB,
  confidence FLOAT,
  similarity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
AS $$
  SELECT 
    user_memories.id,
    user_memories.memory_type,
    user_memories.content,
    user_memories.metadata,
    user_memories.confidence,
    1 - (user_memories.embedding <=> query_embedding) AS similarity,
    user_memories.created_at
  FROM user_memories
  WHERE 
    user_memories.user_id = user_id_param
    AND user_memories.memory_type = ANY(memory_types)
    AND 1 - (user_memories.embedding <=> query_embedding) > match_threshold
  ORDER BY user_memories.embedding <=> query_embedding
  LIMIT match_count;
$$; 