-- Fix conversational_memory schema - add missing memory_key column
-- This column is required by the ConversationMemoryService and SmartRecommenderV2

BEGIN;

-- Add memory_key column to conversational_memory table
ALTER TABLE conversational_memory 
ADD COLUMN memory_key TEXT;

-- Add some missing columns that are referenced in the code
ALTER TABLE conversational_memory 
ADD COLUMN preference_strength DECIMAL(3,2) DEFAULT 0.5,
ADD COLUMN memory_text TEXT,
ADD COLUMN times_reinforced INTEGER DEFAULT 1,
ADD COLUMN last_reinforced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN source_exchange_id UUID,
ADD COLUMN source_conversation_id UUID;

-- Update the existing index to include memory_key for faster lookups
CREATE INDEX idx_conversational_memory_user_type_key ON conversational_memory(user_id, memory_type, memory_key);

-- Add index for preference strength queries
CREATE INDEX idx_conversational_memory_preference_strength ON conversational_memory(preference_strength);

-- Add comment explaining the memory_key column
COMMENT ON COLUMN conversational_memory.memory_key IS 'Unique identifier for the preference (e.g., actor name, director name, genre name)';
COMMENT ON COLUMN conversational_memory.preference_strength IS 'Strength of this preference from 0.0 to 1.0';
COMMENT ON COLUMN conversational_memory.memory_text IS 'Natural language description of the preference';
COMMENT ON COLUMN conversational_memory.times_reinforced IS 'Number of times this preference has been mentioned';

COMMIT;