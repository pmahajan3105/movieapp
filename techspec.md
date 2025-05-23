Version: 2.0
Stack: Next.js 14, Supabase, Groq AI, TypeScript
Architecture: Serverless, API-First
3.1 System Architecture
High-Level Architecture
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App Router │ React 18 │ TanStack Query │ Tailwind CSS  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┴────────────────────────────────────┐
│                          API Layer                              │
├─────────────────────────────────────────────────────────────────┤
│              Next.js API Routes (Serverless Functions)          │
│  • Authentication  │  • AI Chat  │  • Movies  │  • User Actions │
└────────────┬───────────────┬─────────────┬─────────────────────┘
             │               │             │
┌────────────┴───────┐ ┌─────┴─────┐ ┌────┴──────┐
│   Supabase Cloud   │ │ Groq API  │ │ OMDb API  │
├────────────────────┤ ├───────────┤ ├───────────┤
│ • PostgreSQL DB    │ │ • Gemma   │ │ • Movie   │
│ • Authentication   │ │ • Mixtral │ │   Data    │
│ • Row Level Sec.   │ │ • Llama3  │ │ • Posters │
│ • Realtime Sub.    │ └───────────┘ └───────────┘
└────────────────────┘
Data Flow Patterns
Authentication Flow
User Email → API Route → Supabase Auth → Send OTP
User OTP → API Route → Supabase Verify → Create Session → Set Cookie
AI Recommendation Flow
User Context → Build Prompt → Groq API → Parse Response
→ Validate Movies → Fetch from OMDb → Store in Queue → Return to Client
3.2 Database Schema
Core Tables
sql-- Users (handled by Supabase Auth)
auth.users (
  id: uuid PRIMARY KEY,
  email: string,
  created_at: timestamp
)

-- User Profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movies
CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  omdb_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  poster_url TEXT,
  plot TEXT,
  genre TEXT,
  director TEXT,
  actors TEXT,
  runtime TEXT,
  imdb_rating DECIMAL(3,1),
  imdb_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Swipes
CREATE TABLE swipes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER REFERENCES movies(id),
  action TEXT CHECK (action IN ('like', 'dislike', 'watchlist')),
  swiped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- Watchlist
CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER REFERENCES movies(id),
  watched BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watched_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, movie_id)
);

-- Recommendation Queue
CREATE TABLE recommendation_queue (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER REFERENCES movies(id),
  reason TEXT,
  confidence DECIMAL(3,2),
  batch_id UUID,
  position INTEGER,
  shown BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB[],
  preferences_extracted JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Generation Logs
CREATE TABLE ai_generation_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id UUID,
  prompt TEXT,
  response JSONB,
  model TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_swipes_user_movie ON swipes(user_id, movie_id);
CREATE INDEX idx_queue_user_shown ON recommendation_queue(user_id, shown);
CREATE INDEX idx_watchlist_user ON watchlist(user_id, watched);
CREATE INDEX idx_movies_genre ON movies(genre);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_movies_rating ON movies(imdb_rating);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Movies are viewable by everyone" ON movies
  FOR SELECT USING (true);

CREATE POLICY "Users can view own swipes" ON swipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own swipes" ON swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations" ON recommendation_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chats" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger for new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
3.3 API Specification
Authentication Endpoints
POST /api/auth/request-otp
typescriptRequest: {
  email: string
}

Response: {
  success: boolean
  message: string
}

Logic:
- Validate email format
- Call Supabase auth.signInWithOtp()
- Return success status
POST /api/auth/verify-otp
typescriptRequest: {
  email: string
  token: string
}

Response: {
  success: boolean
  user: User | null
  isNewUser: boolean
}

Logic:
- Verify OTP with Supabase
- Create/update user profile
- Set session cookie
AI Endpoints
POST /api/ai/chat
typescriptRequest: {
  message: string
  sessionId?: string
}

Response: {
  reply: string
  sessionId: string
  extractedPreferences?: PreferenceData
}

Logic:
- Get or create chat session
- Build context from history
- Call Groq API
- Parse for preferences
- Store conversation
POST /api/ai/generate-recommendations
typescriptRequest: {
  count?: number // default 20
  regenerate?: boolean
}

Response: {
  recommendations: Array<{
    movie: Movie
    reason: string
    confidence: number
  }>
  batchId: string
}

Logic:
- Fetch user profile & recent swipes
- Build comprehensive prompt
- Call Groq for suggestions
- Validate & fetch from OMDb
- Store in recommendation queue
Movie Endpoints
GET /api/movies/[id]
typescriptResponse: {
  movie: Movie
  inWatchlist: boolean
  userRating?: number
  similarMovies: Movie[]
}
GET /api/movies/queue
typescriptResponse: {
  queue: Array<{
    movie: Movie
    reason: string
    position: number
  }>
  remaining: number
}
POST /api/movies/swipe
typescriptRequest: {
  movieId: number
  action: 'like' | 'dislike' | 'watchlist'
}

Response: {
  success: boolean
  queueRemaining: number
  shouldRegenerate: boolean
}
Watchlist Endpoints
GET /api/watchlist
typescriptQuery: {
  sort?: 'added' | 'title' | 'year' | 'rating'
  filter?: 'unwatched' | 'watched' | 'all'
  genre?: string
}

Response: {
  movies: Array<WatchlistMovie>
  stats: {
    total: number
    watched: number
    byGenre: Record<string, number>
  }
}
PUT /api/watchlist/[movieId]
typescriptRequest: {
  watched?: boolean
  rating?: number
  notes?: string
}

Response: {
  success: boolean
  movie: WatchlistMovie
}
3.4 AI Integration Details
Groq Configuration
typescriptconst GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY,
  model: 'gemma-7b-it', // or 'mixtral-8x7b-32768'
  temperature: 0.7,
  maxTokens: 1000,
  rateLimit: {
    requestsPerMinute: 30,
    tokensPerMinute: 10000
  }
}
Prompt Templates
Preference Extraction
typescriptconst PREFERENCE_EXTRACTION_PROMPT = `
You are CineAI, a movie preference expert. Based on the conversation below, 
extract structured movie preferences.

Conversation:
{conversation}

Extract preferences in this JSON format:
{
  "favorite_movies": [],
  "preferred_genres": [],
  "themes": [],
  "directors": [],
  "actors": [],
  "avoid": [],
  "mood_preferences": {},
  "era_preferences": []
}
`
Recommendation Generation
typescriptconst RECOMMENDATION_PROMPT = `
You are a movie recommendation expert. Generate movie suggestions based on:

USER PROFILE:
- Likes: {liked_movies}
- Dislikes: {disliked_movies}
- Preferences: {preferences}

Generate exactly 20 movie recommendations. For each movie:
{
  "title": "Movie Title",
  "year": 2020,
  "confidence": 0.95,
  "reason": "Matches your love for..."
}

Focus on diverse, high-quality recommendations that match the user's taste.
