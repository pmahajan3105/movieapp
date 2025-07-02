# 🎬 CineAI "Personal Companion" Release - Product Requirements Document

> **Note:** This PRD originally referenced ElevenLabs for voice functionality. CineAI now uses the browser-native Web Speech API for voice input and output; any ElevenLabs requirements are obsolete and can be ignored.

**Version**: 1.0  
**Date**: January 27, 2025  
**Type**: Personal Use Application  
**AI Model**: Claude Sonnet 4  
**Voice AI**: ElevenLabs  
**Status**: Requirements Phase (Smart Hybrid fetch implemented Feb 2025)  
**Database**: Local Supabase (safe – no production impact)

---

## 🎯 Executive Summary

CineAI already delivers solid, vector-based movie recommendations. This release turns the project into a fully-featured, voice-enabled personal movie companion. Built for a **single power-user**, we can leverage premium models (Claude Sonnet 4 + ElevenLabs) without worrying about scale.

### Core Features

| ID      | Feature                                  | Outcome                                                                 |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| **F-1** | Hyper-Personalised Recommendation Engine | Learns temporal & behavioural patterns to surface eerily accurate picks |
| **F-2** | Explainable Recommendations              | Always answers "Why this pick?" with friendly, data-driven explanations |
| **F-3** | Conversational Discovery + Voice         | Ask for movies in natural language or via voice; get tailored results   |

---

## 1 Vision & Goals

1. Feel like a movie-savvy friend that _knows_ my taste.
2. Remove friction: search, discovery and explanations all in one flow.
3. Keep latency < 500 ms for personalised recs.

---

## 2 Out of Scope

• Monetisation, multi-user scale, push notifications, social sharing.

---

## 3 Detailed Requirements

### F-1 Hyper-Personalised Engine

**Overview**

1. Track realistic app interactions – movie detail views, ratings, watchlist additions, search patterns.
2. Build preference profiles based on actual user behavior within the recommendation app.
3. Extend **SmartRecommenderV2** to factor interaction patterns and preferences.
4. API: `GET /api/movies?personalized=true` returns preference-ranked list + insights.

**Database Schema**

```sql
-- New Tables Required
CREATE TABLE user_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  movie_id text NOT NULL,
  interaction_type text CHECK (interaction_type IN ('view_details', 'add_to_watchlist', 'rate', 'search_result_click', 'recommendation_click')),
  interaction_context jsonb, -- search query, recommendation type, position, etc.
  time_of_day integer, -- 0-23 (when they used the app)
  day_of_week integer, -- 0-6 (when they used the app)
  metadata jsonb, -- time spent on page, rating value, etc.
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_preference_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  insight_type text NOT NULL, -- 'genre_preference', 'rating_patterns', 'search_behavior'
  time_window text NOT NULL, -- '7d', '30d', '90d'
  insights jsonb NOT NULL,
  confidence_score float,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX idx_user_interactions_user_time ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_type ON user_interactions(user_id, interaction_type);
CREATE INDEX idx_preference_insights_user_type ON user_preference_insights(user_id, insight_type);
```

**User-Stories**
| As a… | I want… | So that… |
|-------|---------|----------|
| CineAI power-user | recommendations that adapt to my rating patterns and preferences | I get suggestions that improve over time based on what I actually like |
| Data nerd (you) | inspect an "Insights" object | verify the engine used my interaction data and preferences correctly |

**API Specification**

**New Endpoint: `GET /api/movies/personalized`**

```typescript
interface PersonalizedRecommendationRequest {
  limit?: number
  diversityBoost?: boolean
  explanations?: boolean
  includePreferenceInsights?: boolean
}

interface PersonalizedRecommendationResponse {
  movies: Array<{
    id: string
    title: string
    confidenceScore: number
    personalizedFactors: {
      ratingPatternMatch: number
      genreAffinityScore: number
      interactionHistory: {
        previouslyViewed: boolean
        timeSpentOnDetails: number
        addedToWatchlist: boolean
      }
      preferenceAlignment: number
    }
    explanation?: ExplanationData
  }>
  insights: {
    primaryReasons: string[]
    diversityScore: number
    userPreferences: {
      topGenres: string[]
      averageRating: number
      explorationTendency: 'conservative' | 'moderate' | 'adventurous'
    }
    interactionPatterns: {
      mostActiveTimeOfDay: number
      preferredDiscoveryMethod: 'search' | 'browse' | 'recommendations'
      engagementLevel: number
    }
  }
  metadata: {
    algorithmsUsed: string[]
    processingTimeMs: number
    cacheHit: boolean
    dataPoints: number // How many interactions this is based on
  }
}
```

**Service Architecture**

```typescript
// New Service Classes
class InteractionTracker {
  async trackInteraction(params: InteractionParams): Promise<void>
  async getUserPreferences(userId: string, window: string): Promise<UserPreferences>
  async getRatingPatterns(userId: string): Promise<RatingPattern[]>
  async getInteractionHistory(userId: string, movieId: string): Promise<InteractionHistory>
}

class PersonalizedRecommender extends SmartRecommenderV2 {
  async generatePersonalizedScores(
    movies: Movie[],
    userContext: UserContext
  ): Promise<ScoredMovie[]>
  async blendVectorAndPreferences(
    vectorScores: number[],
    preferenceScores: number[]
  ): Promise<number[]>
}
```

**Component Architecture**

```typescript
// New React Components & Hooks
const useInteractionTracking = () => {
  const trackMovieView = (movieId: string) => void;
  const trackRating = (movieId: string, rating: number) => void;
  const trackWatchlistAdd = (movieId: string) => void;
  const trackSearchClick = (movieId: string, query: string, position: number) => void;
}

const PersonalizedInsightsPanel = ({ userId }: { userId: string }) => {
  // Shows personal preference insights dashboard
}
```

**Data Contract – `/api/movies/personalized`**

```jsonc
{
  "movies": [
    {
      "id": "550",
      "title": "Fight Club",
      "confidenceScore": 0.93,
      "personalizedFactors": {
        "ratingPatternMatch": 0.88,
        "genreAffinityScore": 0.92,
        "interactionHistory": {
          "previouslyViewed": false,
          "timeSpentOnDetails": 0,
          "addedToWatchlist": false,
        },
        "preferenceAlignment": 0.87,
      },
    },
  ],
  "insights": {
    "primaryReasons": [
      "Strong match with your thriller preferences",
      "Similar to your highly-rated movies",
    ],
    "diversityScore": 0.74,
    "userPreferences": {
      "topGenres": ["Thriller", "Drama", "Mystery"],
      "averageRating": 4.2,
      "explorationTendency": "moderate",
    },
    "interactionPatterns": {
      "mostActiveTimeOfDay": 21,
      "preferredDiscoveryMethod": "recommendations",
      "engagementLevel": 0.78,
    },
  },
  "metadata": {
    "algorithmsUsed": ["vector_similarity", "preference_scoring", "rating_pattern_analysis"],
    "processingTimeMs": 180,
    "cacheHit": false,
    "dataPoints": 47,
  },
}
```

**Acceptance Criteria**

- Interaction table captures ≥ 95% of app interactions: `view_details`, `rate`, `add_to_watchlist` events (verified via Supabase row count).
- Latency overhead ≤ 200 ms vs basic recommendations.
- Personalized mode yields a different sorted list ≥ 80% of the time when user has sufficient interaction data (≥10 interactions).
- API returns valid TypeScript-compliant JSON 100% of the time.
- Graceful degradation to vector-only recommendations when insufficient interaction data exists.

---

### F-2 Explainable Recommendations

**Overview**

1. Claude generates JSON explanation (reason, confidence, discovery level, supporting movies).
2. Store in `recommendation_explanations` (expires in 7 days).
3. UI badge for quick view; full card on demand.
4. API flag: `?explanations=true`.

**Database Schema**

```sql
CREATE TABLE recommendation_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  movie_id text NOT NULL,
  recommendation_context jsonb, -- Original query/context that led to rec
  explanation_data jsonb NOT NULL,
  model_version text DEFAULT 'claude-sonnet-4',
  confidence_score float,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_explanations_user_movie ON recommendation_explanations(user_id, movie_id);
CREATE INDEX idx_explanations_expires ON recommendation_explanations(expires_at);
```

**Claude Prompt System**

```typescript
const EXPLANATION_PROMPT = `
You are a movie recommendation explainer. Given a user's viewing history and a recommended movie, explain WHY this movie was selected.

User Context:
- Recent watches: {{recentWatches}}
- Favorite genres: {{favoriteGenres}}
- Time context: {{timeContext}}

Recommended Movie: {{movieTitle}} ({{movieYear}})

Generate a JSON explanation with:
1. primary_reason (1-2 sentences, conversational tone)
2. explanation_type ("pattern" | "similarity" | "discovery" | "temporal")
3. confidence_score (1-100)
4. discovery_factor ("safe" | "stretch" | "adventurous")
5. supporting_factors (array of specific evidence)
6. optimal_viewing_time (suggestion)
7. taste_match_percentage (1-100)

Be friendly, specific, and data-driven.
`
```

**Service Architecture**

```typescript
class ExplanationService {
  async generateExplanation(params: {
    userId: string
    movieId: string
    userContext: UserContext
    recommendationScore: number
  }): Promise<ExplanationData>

  async cacheExplanation(explanation: ExplanationData): Promise<void>
  async getCachedExplanation(userId: string, movieId: string): Promise<ExplanationData | null>
}

interface ExplanationData {
  primary_reason: string
  explanation_type: 'pattern' | 'similarity' | 'discovery' | 'temporal'
  confidence_score: number
  discovery_factor: 'safe' | 'stretch' | 'adventurous'
  supporting_factors: string[]
  optimal_viewing_time: string
  taste_match_percentage: number
}
```

**UI Components**

```typescript
// New Components
const ExplanationBadge = ({ movieId, compact = true }: { movieId: string; compact?: boolean }) => {
  // Shows confidence score + discovery factor as colored badge
}

const ExplanationCard = ({ explanation }: { explanation: ExplanationData }) => {
  // Full explanation with all details
}

const ExplanationToggle = ({ onToggle }: { onToggle: (enabled: boolean) => void }) => {
  // Global toggle for explanations mode
}
```

**User-Stories**
| As a… | I want… | So that… |
|-------|---------|----------|
| Skeptical viewer | read why a film is suggested | build trust in the AI |
| Time-crunched user | skim a quick badge | decide in under 5 sec |
| Curious user | understand my taste patterns | learn more about my preferences |

**API Integration**

```typescript
// Enhanced movie endpoint
interface MovieWithExplanation extends Movie {
  explanation?: ExplanationData
  explanationBadge?: {
    confidence: number
    discoveryFactor: string
    primaryReason: string
  }
}

// Query parameters
interface MovieQueryParams {
  explanations?: boolean
  explanationLevel?: 'badge' | 'full'
}
```

**Explanation JSON (Claude output)**

```json
{
  "primary_reason": "Because you rated cerebral sci-fi films 4★ and above, and this one explores similar philosophical themes.",
  "explanation_type": "pattern",
  "confidence_score": 87,
  "discovery_factor": "stretch",
  "supporting_factors": [
    "You liked Arrival (confidence 0.92)",
    "Consistent interest in multiverse narratives",
    "Strong preference for Denis Villeneuve films"
  ],
  "optimal_viewing_time": "Sunday evening",
  "taste_match_percentage": 84
}
```

**Error Handling**

```typescript
interface ExplanationErrorStates {
  CLAUDE_TIMEOUT: 'Using fallback explanation'
  INVALID_JSON: 'Regenerating explanation'
  CACHE_MISS: 'Generating new explanation'
  RATE_LIMIT: 'Explanation temporarily unavailable'
}
```

**Acceptance Criteria**

- 100 % of recs in behavioural mode include `explanation` when `?explanations=true`.
- Badge shows `confidence_score` and `discovery_factor` colour-coded.
- Full card renders < 150 ms JS main-thread.
- Claude API failures gracefully fallback to cached or simplified explanations.
- Explanation cache hit rate > 70% for repeated movie views.

---

### F-3 Conversational Discovery with Voice & Memory

**Overview**

1. **Movie-Specific Voice Chat**: 11Labs-powered voice conversations on every movie page.
2. **Conversational Memory System**: Store, analyze, and extract preferences from all conversations.
3. **Deep Preference Analysis**: Claude analyzes conversations to understand nuanced tastes and context.
4. **Persistent Memory Integration**: Use conversational insights to enhance all future recommendations.
5. **Smart Search Engine**: Chooses _semantic / filter / hybrid_ strategy based on conversation history.

**Database Schema**

```sql
-- Enhanced conversation system with memory
CREATE TABLE conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  session_type text CHECK (session_type IN ('movie_discussion', 'general_discovery', 'preference_exploration')),
  movie_id text, -- NULL for general discovery sessions
  context_type text CHECK (context_type IN ('movie_page', 'dashboard', 'search')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_exchanges integer DEFAULT 0,
  voice_duration_seconds integer DEFAULT 0,
  preference_insights_extracted boolean DEFAULT false,
  session_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE conversation_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conversation_sessions(id),
  user_id uuid REFERENCES auth.users(id),
  exchange_order integer NOT NULL,

  -- User input
  user_voice_audio_url text, -- 11Labs audio file
  user_transcript text NOT NULL,
  user_intent jsonb, -- parsed intent from Claude

  -- AI response
  ai_response_text text NOT NULL,
  ai_voice_audio_url text, -- 11Labs generated response
  ai_confidence_score float,

  -- Metadata
  voice_duration_seconds float,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Core memory system - extracted preferences from conversations
CREATE TABLE conversational_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  memory_type text CHECK (memory_type IN (
    'genre_preference', 'mood_preference', 'actor_preference', 'director_preference',
    'thematic_preference', 'contextual_preference', 'avoidance', 'discovery_pattern'
  )),
  memory_key text NOT NULL, -- e.g., 'action_movies', 'rainy_day_viewing', 'date_night'
  preference_strength float CHECK (preference_strength >= -1.0 AND preference_strength <= 1.0), -- -1 (hate) to 1 (love)
  context_tags jsonb DEFAULT '[]', -- situational context where this applies

  -- Source tracking
  source_conversation_id uuid REFERENCES conversation_sessions(id),
  source_exchange_id uuid REFERENCES conversation_exchanges(id),
  extracted_at timestamptz DEFAULT now(),
  confidence_score float CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),

  -- Memory evolution
  times_reinforced integer DEFAULT 1,
  last_reinforced_at timestamptz DEFAULT now(),
  contradicted_at timestamptz, -- if user says opposite later

  -- Memory content
  memory_text text NOT NULL, -- human-readable preference
  supporting_evidence jsonb DEFAULT '{}', -- specific quotes, examples
  related_movies text[] DEFAULT '{}', -- movie IDs mentioned in context

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Preference insights computed from conversational memory
CREATE TABLE preference_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  insight_category text CHECK (insight_category IN (
    'taste_profile', 'viewing_context', 'discovery_style', 'mood_patterns',
    'social_preferences', 'temporal_patterns', 'genre_evolution'
  )),
  insight_data jsonb NOT NULL,
  confidence_level text CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
  data_points_count integer DEFAULT 0, -- how many memories contributed
  last_updated timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_conversation_sessions_user_movie ON conversation_sessions(user_id, movie_id, started_at DESC);
CREATE INDEX idx_conversation_exchanges_session ON conversation_exchanges(session_id, exchange_order);
CREATE INDEX idx_conversational_memory_user_type ON conversational_memory(user_id, memory_type);
CREATE INDEX idx_conversational_memory_key ON conversational_memory(memory_key, preference_strength DESC);
CREATE INDEX idx_conversational_memory_updated ON conversational_memory(user_id, last_reinforced_at DESC);
CREATE INDEX idx_preference_insights_category ON preference_insights(user_id, insight_category);
```

**Claude Conversation System**

```typescript
// Main conversation prompt for ongoing discussions
const CONVERSATION_COMPANION_PROMPT = `
You are CineAI, a sophisticated movie companion having a natural conversation with a user about movies. 

Current Context:
- Movie being discussed: {{movieTitle}} ({{movieYear}})
- Movie context: {{movieGenres}}, {{movieOverview}}
- User's conversation history: {{recentMemories}}
- Current conversation: {{conversationHistory}}

User just said: "{{userInput}}"

Your goals:
1. Have a natural, engaging conversation about movies and preferences
2. Ask thoughtful follow-up questions to understand their taste deeply
3. Share relevant insights about the current movie
4. Guide the conversation to extract preferences naturally

Respond in a friendly, knowledgeable way. Ask questions that help understand:
- What they like/dislike about specific elements (genres, actors, themes, moods)
- When and how they prefer to watch different types of movies
- What draws them to certain stories or styles
- Their emotional responses to different movie elements

Keep responses conversational and under 3 sentences. Always end with a thoughtful question or observation.
`

// Memory extraction prompt for analyzing conversations
const MEMORY_EXTRACTION_PROMPT = `
Analyze this conversation exchange and extract any movie preferences, tastes, or insights about the user.

Conversation Exchange:
User: "{{userInput}}"
AI: "{{aiResponse}}"

Context:
- Movie discussed: {{movieContext}}
- Previous memories: {{existingMemories}}

Extract any new preferences as JSON:
{
  "extracted_memories": [
    {
      "memory_type": "genre_preference|mood_preference|actor_preference|director_preference|thematic_preference|contextual_preference|avoidance|discovery_pattern",
      "memory_key": "specific_preference_name",
      "preference_strength": -1.0 to 1.0, // negative for dislikes, positive for likes
      "context_tags": ["when_applicable", "situational_context"],
      "memory_text": "Human readable preference description",
      "supporting_evidence": {
        "user_quote": "exact user words",
        "inference_basis": "why we think this"
      },
      "confidence_score": 0.0 to 1.0
    }
  ],
  "conversation_insights": {
    "user_engagement_level": "low|medium|high",
    "discovered_new_preferences": boolean,
    "conversation_quality": "poor|good|excellent"
  },
  "follow_up_suggestions": ["questions to ask next time"]
}

Only extract clear, confident preferences. Don't over-interpret.
`

// Preference synthesis prompt for building insights
const PREFERENCE_SYNTHESIS_PROMPT = `
Analyze this user's conversational memory to generate actionable preference insights.

User Memories (last 30 days):
{{conversationalMemories}}

Behavioral Data:
{{behavioralPatterns}}

Generate comprehensive preference insights as JSON:
{
  "taste_profile": {
    "primary_genres": ["genre", "strength_score"],
    "preferred_moods": ["mood", "strength_score"],
    "favorite_elements": ["thematic elements"],
    "discovery_comfort_zone": "conservative|moderate|adventurous"
  },
  "viewing_context": {
    "solo_preferences": ["preferences when alone"],
    "social_preferences": ["preferences when with others"],
    "time_based_preferences": {
      "weekday_evening": ["preferences"],
      "weekend": ["preferences"],
      "late_night": ["preferences"]
    }
  },
  "avoidances": {
    "strong_dislikes": ["things to avoid"],
    "situational_dislikes": ["context-dependent avoidances"]
  },
  "recommendation_strategy": {
    "preferred_discovery_method": "similar_to_favorites|explore_new|mood_based",
    "explanation_style": "detailed|brief|confident",
    "risk_tolerance": "safe|balanced|adventurous"
  }
}
`

interface ConversationExchange {
  userTranscript: string
  userIntent: {
    type: 'preference_sharing' | 'question' | 'reaction' | 'request'
    subject: string // what they're talking about
    sentiment: 'positive' | 'negative' | 'neutral'
    confidence: number
  }
  aiResponse: string
  extractedMemories?: ConversationalMemory[]
}

interface ConversationalMemory {
  memory_type:
    | 'genre_preference'
    | 'mood_preference'
    | 'actor_preference'
    | 'director_preference'
    | 'thematic_preference'
    | 'contextual_preference'
    | 'avoidance'
    | 'discovery_pattern'
  memory_key: string
  preference_strength: number // -1 to 1
  context_tags: string[]
  memory_text: string
  supporting_evidence: {
    user_quote: string
    inference_basis: string
  }
  confidence_score: number
}
```

**Service Architecture**

```typescript
// Core conversation memory service
class ConversationMemoryService {
  async startConversation(context: {
    userId: string
    movieId?: string
    contextType: 'movie_page' | 'dashboard' | 'search'
  }): Promise<string> // returns session ID

  async processExchange(
    sessionId: string,
    userTranscript: string
  ): Promise<{
    aiResponse: string
    aiAudioUrl: string
    extractedMemories: ConversationalMemory[]
  }>

  async extractMemoriesFromConversation(
    exchange: ConversationExchange
  ): Promise<ConversationalMemory[]>
  async synthesizePreferenceInsights(userId: string): Promise<PreferenceInsights>
  async getRelevantMemories(userId: string, context?: string): Promise<ConversationalMemory[]>
}

// Enhanced 11Labs integration for high-quality voice
class ElevenLabsService {
  async speechToText(audioBlob: Blob): Promise<{
    transcript: string
    confidence: number
    duration: number
  }>

  async textToSpeech(
    text: string,
    voiceSettings?: {
      stability?: number
      similarityBoost?: number
      style?: number
    }
  ): Promise<{
    audioUrl: string
    audioBlob: Blob
    duration: number
  }>

  async getVoiceSettings(): Promise<VoiceSettings>
}

// Memory-enhanced recommendation service
class MemoryEnhancedRecommender extends SmartRecommenderV2 {
  async getConversationEnhancedRecommendations(options: {
    userId: string
    conversationalContext?: ConversationContext
    includeMemoryFactors?: boolean
  }): Promise<
    SmartRecommendationResult & {
      memoryFactors: MemoryInfluence[]
      conversationInsights: ConversationInsights
    }
  >

  private async applyConversationalMemory(
    movies: Movie[],
    memories: ConversationalMemory[]
  ): Promise<Movie[]>
}

// Conversation context for recommendations
interface ConversationContext {
  recentConversations: ConversationSummary[]
  activePreferences: ConversationalMemory[]
  moodContext?: string
  viewingContext?: string
}

interface MemoryInfluence {
  movieId: string
  influencingMemories: ConversationalMemory[]
  totalBoost: number
  reasoning: string
}
```

**Movie Page Voice Chat Component**

```typescript
const MovieVoiceChat = ({ movieId, movieData }: {
  movieId: string;
  movieData: Movie;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<ConversationExchange[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const conversationService = new ConversationMemoryService();
  const elevenLabs = new ElevenLabsService();

  const handleVoiceInput = async (audioBlob: Blob) => {
    const { transcript } = await elevenLabs.speechToText(audioBlob);
    const response = await conversationService.processExchange(sessionId, transcript);

    // Update conversation and play AI response
    setConversation(prev => [...prev, {
      userTranscript: transcript,
      aiResponse: response.aiResponse,
      extractedMemories: response.extractedMemories
    }]);

    // Play AI voice response
    await playAudioResponse(response.aiAudioUrl);
  };

  return (
    <div className="movie-voice-chat">
      <button
        className="voice-chat-trigger"
        onClick={() => setIsOpen(true)}
      >
        🎤 Chat about this movie
      </button>

      {isOpen && (
        <VoiceChatModal
          movieData={movieData}
          conversation={conversation}
          isListening={isListening}
          isProcessing={isProcessing}
          onVoiceInput={handleVoiceInput}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

const VoiceChatModal = ({ movieData, conversation, onVoiceInput }: VoiceChatModalProps) => {
  return (
    <div className="voice-chat-modal">
      <div className="chat-header">
        <h3>Chat about {movieData.title}</h3>
        <span className="movie-context">{movieData.genres.join(', ')} • {movieData.release_date}</span>
      </div>

      <div className="conversation-history">
        {conversation.map((exchange, i) => (
          <ConversationBubble key={i} exchange={exchange} />
        ))}
      </div>

      <VoiceInputRecorder
        onAudioCapture={onVoiceInput}
        placeholder="Ask me about this movie, or tell me what you think..."
      />

      <div className="memory-insights">
        <small>💡 I'm learning your preferences from our conversation</small>
      </div>
    </div>
  );
};
```

**Smart Search Engine**

```typescript
class SmartSearchEngine {
  async search(criteria: ConversationalCriteria, userContext: UserContext): Promise<SearchResult> {
    const strategy = this.determineStrategy(criteria)

    switch (strategy) {
      case 'semantic':
        return await this.semanticSearch(criteria, userContext)
      case 'filter':
        return await this.filterSearch(criteria, userContext)
      case 'hybrid':
        return await this.hybridSearch(criteria, userContext)
    }
  }

  private determineStrategy(criteria: ConversationalCriteria): SearchStrategy {
    // Logic to choose optimal search strategy
  }
}

interface SearchResult {
  movies: MovieWithScore[]
  searchStrategy: string
  processingSteps: string[]
  suggestedRefinements: string[]
  confidence: number
}
```

**Chat UI Components**

```typescript
const ConversationInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  return (
    <div className="conversation-container">
      <ChatHistory messages={messages} />
      <VoiceInput enabled={isVoiceMode} onQuery={handleQuery} />
      <TextInput onQuery={handleQuery} />
      <ResultsStream results={searchResults} />
    </div>
  );
};

interface ChatMessage {
  id: string;
  type: 'user_query' | 'system_response' | 'movie_results';
  content: string | ConversationQueryResult;
  timestamp: Date;
  metadata?: {
    voiceInput?: boolean;
    processingTime?: number;
    strategy?: string;
  };
}
```

**API Endpoints**

```typescript
// Start a conversation session
POST /api/conversations/start
{
  movieId?: string;
  contextType: 'movie_page' | 'dashboard' | 'search';
}
// Response: { sessionId: string, initialContext: ConversationContext }

// Process a conversation exchange
POST /api/conversations/exchange
{
  sessionId: string;
  audioBlob?: Blob; // 11Labs audio input
  transcript?: string; // fallback text input
  voiceMetadata?: {
    duration: number;
    confidence: number;
  };
}
// Response: {
//   aiResponse: string;
//   aiAudioUrl: string;
//   extractedMemories: ConversationalMemory[];
//   conversationInsights: ConversationInsights;
// }

// Get user's conversational memory
GET /api/conversations/memory?userId={userId}&category={category}&limit={limit}
// Response: { memories: ConversationalMemory[], insights: PreferenceInsights }

// Enhanced recommendations with conversation memory
GET /api/movies/conversation-enhanced?includeMemory=true&memoryContext={context}
// Response: {
//   movies: MovieWithMemoryFactors[];
//   memoryInfluences: MemoryInfluence[];
//   conversationInsights: ConversationInsights;
// }

// Memory-based search (alternative to conversational search)
POST /api/search/memory-aware
{
  query: string;
  includeConversationalContext: boolean;
  memoryCategories?: string[]; // filter by specific memory types
}
// Response: {
//   movies: Movie[];
//   memoryMatches: MemoryMatch[];
//   searchStrategy: string;
// }
```

**Happy-Path Flow**

1. User clicks mic → speaks: _"Find me a heart-warming 90s sports movie"_.
2. `useVoiceInput` transcribes to text (<2 s).
3. `POST /api/search/conversational` returns parsed JSON & 10 movies.
4. Chat stream renders cards + mini explanations.
5. User can reply "something shorter" → engine applies duration filter.

**Parser Output Example**

```json
{
  "intent": "search",
  "extracted_criteria": {
    "genres": ["Drama", "Sport"],
    "year_range": [1990, 1999],
    "moods": ["heart-warming"],
    "complexity_level": "light"
  },
  "confidence": 0.83,
  "search_strategy": "hybrid",
  "follow_up_suggestions": [
    "Would you prefer a specific sport?",
    "Any favorite actors from that era?",
    "How about movie length preference?"
  ]
}
```

**Error Handling & Fallbacks**

```typescript
interface VoiceErrorStates {
  MIC_PERMISSION_DENIED: 'Please allow microphone access'
  SPEECH_RECOGNITION_FAILED: 'Could not understand speech, please try again'
  NETWORK_ERROR: 'Processing offline, please check connection'
  CLAUDE_PARSER_ERROR: 'Using fallback text search'
  NO_RESULTS_FOUND: 'No movies match criteria, try different terms'
}

// Progressive Enhancement
const fallbackToTextSearch = (failedCriteria: ConversationalCriteria) => {
  // Extract keywords and use existing search
}
```

**Acceptance Criteria**

- Voice flow works on latest Chrome desktop & mobile Safari.
- Parser confidence ≥ 0.7 for top 10 manual test queries.
- End-to-end latency (speech-to-first card) ≤ 4 s.
- Text fallback works when voice fails.
- Conversation context maintains across 3+ follow-up queries.
- ElevenLabs integration optional but functional when enabled.

---

## 3.1 Content & Social Signal Enhancements (Approved)

> **Status:** _Added Jan 28 2025 – agreed to use TMDB for reviews & Pushshift for Reddit buzz._  
> **Goal:** Strengthen the recommendation engine by factoring in storyline similarity, review sentiment and social chatter.

### Data & Schema Upgrades

```sql
-- New enrichment columns on existing `movies` table
ALTER TABLE movies
  ADD COLUMN storyline_embedding vector(1536),            -- semantic plot/keyword vector
  ADD COLUMN review_sentiment JSONB,                      -- { critics: 0-1, audience: 0-1 }
  ADD COLUMN social_buzz_score DECIMAL(3,2);              -- 0-1 (Reddit Pushshift metric)
```

_No breaking changes – existing rows remain valid._

### Ingestion & Enrichment Pipeline

**Edge Function:** `movie-enricher` (runs nightly or on movie-insert)

1. **Fetch plot & keywords** – TMDB `/movie/{id}` & `/movie/{id}/keywords`.
2. **Collect review snippets & ratings** – TMDB `/movie/{id}/reviews` (first 3 critic & audience blurbs).
3. **Reddit buzz** – Pushshift search: `subreddit=r/movies&q="{movie title}"` (last 30 days). Compute `social_buzz_score = min(1, (postCount / 50))`.
4. **Generate storyline embedding** – OpenAI/Anthropic embedding of **plot + keywords + top reviews**.
5. **Persist** to new columns; store raw combined text in `movie_content_texts` (audit).

### Recommender Updates (SmartRecommender V3)

```
Cfinal = 0.30 * semanticSimilarity
       +0.20 * storylineSimilarity       -- new
       +0.15 * talentBoost               -- actor/director match
       +0.15 * genreMatchScore
       +0.10 * temporalBoost
       +0.05 * sentimentAlignment       -- critics/audience vs user bias
       +0.05 * socialBuzzScore
```

_All weights are ENV-tunable._

### Review Sentiment Alignment

We infer the user's review-sentiment bias (e.g. prefers highly-rated, "underdog" cult films, or doesn't care) from `user_interactions` & conversation memory. Alignment score ∈ [-1, 1] mapped to [0, 1] boost.

### Explanation Layer Additions

`RecommendationExplanation` now optionally includes:

```ts
memory_hit?: string        // "You mentioned you love time-travel plots"
storyline_match?: string   // "Matches your preference for complex narratives"
review_match?: string      // "Critics praise the emotional arc – just like you said"
```

### Environment Variables (additions)

```bash
TMDB_API_KEY=tmdb_xxxxx           # TMDB v3 API
PUSHSHIFT_BASE_URL=https://api.pushshift.io
```

_These are additive – no change to existing keys._

### Acceptance Criteria

- 90 % of top-50 movies have `storyline_embedding` populated after enrichment cycle.
- `review_sentiment` JSON present for ≥ 70 % of enriched movies.
- Personalised recs include `storyline_match` in ≥ 50 % of explanation badges when user has 10+ likes.
- End-to-end recommendation latency impact ≤ 80 ms.

---

## 3.2 Roadmap Adjustment – Observability Phase Removed

> After review on Feb 1 2025 we decided runtime observability (Prometheus metrics + Slack webhook) is unnecessary for this single-user build. Phase 4 tasks have therefore been **removed** from scope and documentation. All other phases remain unchanged.

## 4 Tech Stack Changes

### Required Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.30.0",
  "@11labs/client": "^1.0.0",
  "webrtc-adapter": "^9.0.0",
  "@types/dom-speech-recognition": "^0.0.4"
}
```

### Environment Variables

```bash
# Required for all features
ANTHROPIC_API_KEY=ant_xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Required for conversational voice features (11Labs)
ELEVENLABS_API_KEY=el_xxxxx
ELEVENLABS_VOICE_ID=voice_xxxxx
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_STABILITY=0.5
ELEVENLABS_SIMILARITY_BOOST=0.75
ELEVENLABS_STYLE=0.0

# Audio storage (for conversation memory)
AUDIO_STORAGE_BUCKET=cineai-conversations
AUDIO_STORAGE_URL=https://your-bucket.supabase.co/storage/v1/object/public/audio/

# Feature flags
ENABLE_BEHAVIORAL_RECS=true
ENABLE_EXPLANATIONS=true
ENABLE_VOICE_CONVERSATIONS=true
ENABLE_CONVERSATION_MEMORY=true
ENABLE_ELEVENLABS=true
```

### New Supabase Tables

- `user_interactions` (app interaction tracking)
- `user_preference_insights` (computed preference patterns)
- `recommendation_explanations` (Claude explanations)
- `conversation_sessions` (voice conversation sessions)
- `conversation_exchanges` (individual conversation exchanges with 11Labs audio)
- `conversational_memory` (extracted preferences from conversations)
- `preference_insights` (synthesized insights from conversational memory)

---

## 5 Component Architecture

### New React Components

```typescript
// F-1: Behavioral Recommendations
BehavioralInsightsPanel.tsx
BehavioralToggle.tsx
TemporalPatternChart.tsx

// F-2: Explanations
ExplanationBadge.tsx
ExplanationCard.tsx
ExplanationModal.tsx

// F-3: Conversational Discovery
ConversationInterface.tsx
VoiceInput.tsx
ChatHistory.tsx
ResultsStream.tsx
FollowUpSuggestions.tsx
```

### New Hooks

```typescript
useBehavioralTracking.ts // Track user behavior
useBehavioralRecs.ts // Fetch behavioral recommendations
useExplanations.ts // Generate & cache explanations
useVoiceInput.ts // Voice input handling
useConversationalSearch.ts // Manage conversation state
```

### New Services

```typescript
BehaviorTracker.ts // Behavioral data collection
BehavioralRecommender.ts // Enhanced recommendations
ExplanationService.ts // Claude explanation generation
ConversationalParser.ts // Natural language parsing
SmartSearchEngine.ts // Multi-strategy search
ElevenLabsService.ts // Premium voice features
```

---

## 6 Milestones & Timeline (8 Weeks)

| Week | Deliverable                  | Features                                                 |
| ---- | ---------------------------- | -------------------------------------------------------- |
| 1-2  | **Behavioral Foundation**    | Database schema, tracking API, basic behavioral insights |
| 2-3  | **Enhanced Recommendations** | Temporal patterns, behavioral scoring, API integration   |
| 3-4  | **Explanation System**       | Claude service, explanation generation, caching          |
| 4-5  | **Explanation UI**           | Badges, cards, toggles, user preferences                 |
| 5-6  | **Conversational Parser**    | Natural language processing, criteria extraction         |
| 6-7  | **Voice Integration**        | Web Speech API, voice input UI, ElevenLabs optional      |
| 7-8  | **Polish & Testing**         | Error handling, performance optimization, user testing   |

---

## 7 Success Metrics (Subjective – Personal Use)

• I instinctively open CineAI when unsure what to watch.  
• > 80 % of behavioral suggestions feel "on point".  
• Voice search works hands-free from couch.
• Explanations build trust and help discover new genres.
• Conversation flow feels natural and progressively refined.

---

## 8 Risks & Mitigations

| Risk                     | Impact | Mitigation                                                   |
| ------------------------ | ------ | ------------------------------------------------------------ |
| Claude API cost spike    | High   | Personal use acceptable; implement request caching & limits  |
| Voice privacy concerns   | Medium | On-device speech recognition default; ElevenLabs opt-in only |
| Latency issues           | High   | Pre-warm embeddings, cache explanations, progressive loading |
| Behavioral data sparsity | Medium | Graceful fallback to existing vector recommendations         |
| Browser compatibility    | Medium | Progressive enhancement, feature detection                   |

---

## 9 Development Environment Setup

### Prerequisites

1. Local Supabase running (`supabase start`)
2. Anthropic API key with Claude access
3. ElevenLabs API key (optional)
4. Chrome/Safari for voice testing

### Migration Order

1. Run behavioral schema migrations
2. Deploy behavior tracking endpoints
3. Add explanation schema & services
4. Implement conversation schema
5. Test voice permissions & API integration

---

**✅ Development Ready?**  
This PRD now contains:

- Complete database schemas with indexes
- Full TypeScript interfaces and API contracts
- Detailed component architecture
- Error handling specifications
- Progressive enhancement strategy
- Concrete acceptance criteria

**Green-light for development!** 🚀

## ✅ **Sprint 5: Test Coverage Bump (Completed)**

### **Status**: ✅ COMPLETED

**Target**: Achieve 90%+ test coverage and comprehensive E2E testing
**Achieved**: Significant test coverage improvement across critical components

### **Key Accomplishments**:

#### **Enhanced Unit Test Coverage**

- **LoadingOverlay**: 100% coverage with React Query integration tests
- **ConfidenceBadge**: 90%+ coverage including discovery factors, edge cases, accessibility
- **Smart Hybrid Cache**: Comprehensive tests for TMDB trending cache and 24h persistence
- **Weight Configuration**: Runtime tuning, config loading, validation coverage
- **API Routes**: Complete coverage for admin tune-weights endpoint (GET/POST)
- **Utility Functions**: Enhanced utils testing for `cn()` and core helpers

#### **Playwright E2E Test Suite**

- **Full Playwright Setup**: Multi-browser configuration with CI optimization
- **Core User Journey**: Login → Onboarding → Discovery → Recommendations flow
- **Voice Widget E2E**: Voice conversation functionality end-to-end testing
- **Mobile Responsive**: Touch interactions and mobile-specific user flows
- **Error Handling**: Network failures, auth edge cases, graceful degradation

#### **Test Infrastructure**

- **Enhanced Scripts**: `test:coverage`, `test:e2e`, `test:all` in package.json
- **Coverage Reporting**: HTML reports with detailed file-by-file analysis
- **Mock Quality**: Improved mocking for Supabase, React Query, Framer Motion
- **CI Ready**: Playwright configuration optimized for continuous integration

### **Coverage Metrics**:

- **Critical Components**: 90%+ coverage on core recommendation components
- **API Endpoints**: Complete coverage of admin and core functionality
- **Integration Points**: Smart recommender, cache systems, weight configuration
- **E2E Coverage**: Complete user journey testing from auth to recommendations

### **Quality Improvements**:

- **Error Boundary Testing**: Comprehensive error handling scenarios
- **Accessibility Testing**: Screen reader compatibility, keyboard navigation
- **Performance Testing**: Loading states, caching efficiency validation
- **Documentation**: Inline test documentation for complex test scenarios

### **Files Added/Modified**:

- `playwright.config.ts` - E2E test configuration
- `e2e/movie-recommendation-flow.spec.ts` - Core user journey tests
- Multiple enhanced unit test files with comprehensive coverage
- Updated package.json with modern test scripts

**Quality Gate**: ✅ All tests passing, significant coverage improvement achieved
