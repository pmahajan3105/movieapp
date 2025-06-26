# AI System Architecture

This document outlines the architecture and implementation of the AI-powered features in CineAI.

## AI Chat for Preference Gathering

The system uses a conversational AI to gather user movie preferences. The chat interface is powered by Groq with the `gemma-7b-it` model.

### Features

- **Natural Conversation Flow**: The AI is designed to be conversational and context-aware, asking follow-up questions to understand user preferences deeply.
- **Smart Preference Detection**: The AI automatically detects when enough information has been gathered and extracts structured preference data.
- **Real-time Interface**: The chat interface includes real-time messaging, typing indicators, and auto-scrolling.
- **Session Management**: Conversations are managed through sessions, maintaining context for each user.

### API Endpoint: `POST /api/ai/chat`

This endpoint handles the chat interaction.

**Request:**

```json
{
  "message": "I love sci-fi movies like Interstellar",
  "sessionId": "optional-session-id"
}
```

**Response:**
When the conversation is ongoing:

```json
{
  "success": true,
  "message": "Great choice! Interstellar is amazing. What did you love most about it?",
  "sessionId": "uuid-session-id",
  "preferencesExtracted": false
}
```

When preferences are ready to be extracted:

```json
{
  "success": true,
  "message": "Perfect! I've learned your preferences.",
  "sessionId": "uuid-session-id",
  "preferencesExtracted": true,
  "preferences": {
    "favorite_movies": ["Interstellar"],
    "preferred_genres": ["sci-fi"],
    "themes": ["space", "time travel"],
    "preferred_eras": ["2010s"]
  }
}
```

### Database Schema

A `chat_sessions` table stores the conversation history and state.

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  preferences_extracted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Advanced AI Features

The following features are part of the long-term vision for CineAI's intelligent capabilities.

### 1. Smart Conversational AI

This involves creating an assistant that maintains context across conversations and learns from user interactions over time.

- **Memory System**: Store and retrieve conversation history to provide context-aware responses.
- **Enhanced Understanding**: Use intent recognition and emotion detection to better understand user needs.
- **Learning Capabilities**: Refine the user's taste profile based on interactions and feedback.

### 2. Natural Language Search

This feature allows users to search for movies using conversational language instead of filters.

- **Query Understanding**: The system will parse natural language to identify intent, entities (movies, actors, genres), and context.
- **Supported Queries**: It will handle descriptive, mood-based, comparative, and contextual questions.
- **Semantic Matching**: Results will be based on the semantic meaning of the query, not just keywords.

### 3. Personalized Recommendations

This involves building a recommendation engine that adapts to user preferences over time.

- **Taste Modeling**: Create a multi-dimensional model of a user's taste.
- **Diverse Learning Sources**: The system will learn from explicit user feedback (ratings, watchlist adds) and implicit behavior (viewing time, search patterns).

### 4. Movie Intelligence

This feature will provide AI-generated insights about movies.

- **Thematic Analysis**: Identify themes, moods, and other deep attributes of a film.
- **AI-Generated Summaries**: Create summaries tailored to a user's specific interests.

---

## AI Model Management

The application uses a centralized system for managing and selecting AI models, allowing for flexibility and cost-effectiveness.

- **Centralized Configuration**: All available models (from providers like Anthropic, Groq) are defined in `src/lib/ai/models.ts`.
- **Task-Based Assignment**: Different AI models can be assigned to specific tasks (e.g., chat, recommendation, preference extraction) via environment variables.
- **Unified Service**: A single `AIService` (`src/lib/ai/service.ts`) provides a consistent interface for interacting with different AI providers.
- **CLI Tool**: A command-line script (`scripts/model-manager.js`) helps manage models, list configurations, and estimate costs.

## Prompt Engineering

The AI's behavior is guided by a system of carefully crafted prompts.

### Conversational Prompts

- **System Prompt**: A master prompt defines the AI's personality as a friendly and knowledgeable movie assistant. It includes an adaptive conversation flow to handle different user engagement levels.
- **Goal-Oriented**: The primary goal is to gather user preferences in a natural, conversational way. Key information includes favorite movies, genres, themes, and viewing context.

### Data Extraction Prompts

- **Structured Output**: A specific prompt is used to instruct the AI to extract preferences from a conversation into a structured JSON object.
- **Fields**: The JSON includes fields for favorite movies, preferred/avoided genres, themes, eras, actors, directors, viewing context, and mood preferences.

## Recommendation System

The system generates personalized recommendations through a multi-faceted approach.

### Semantic Recommendations with Vector Embeddings

- **Vector Database**: The system uses the `pgvector` extension in Supabase to store vector embeddings for movies.
- **Embedding Service**: An `EmbeddingService` (`src/lib/ai/embedding-service.ts`) is responsible for generating embeddings from movie plots and metadata.
- **Semantic Search**: The `search_movies_semantic()` SQL function finds movies with embeddings that are semantically similar to a user's taste profile.
- **Smart Recommender**: The `SmartRecommenderV2` service builds a user context vector from their preferences and behavior to find the best matches.

### Real-time Data Enhancement

- **OMDB API Integration**: The system can fetch up-to-date movie details from the OMDB API to supplement the local database.
- **Hybrid Approach**: Recommendations can be a mix of movies from the local database and real-time sources.
- **User Control**: A `realtime=true` query parameter on the `/api/movies` endpoint, controlled by a UI toggle, allows users to opt-in to real-time results.

### "Why You'll Like This" Explanations

- **Detailed Reasoning**: Each recommendation is accompanied by a detailed explanation of why it was suggested.
- **Confidence Score**: A confidence score indicates how well the recommendation matches the user's profile.
- **Transparency**: This feature builds trust by making the recommendation process transparent.
