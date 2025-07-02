# 🎯 CineAI Personal Companion - Complete Microtask Breakdown

> **Note:** Historical tasks in this document reference ElevenLabs for voice functionality. CineAI now relies on the browser-native Web Speech API; any ElevenLabs-specific tasks are considered obsolete.

**Version**: 1.2  
**Date**: January 27, 2025  
**Related PRD**: `PERSONAL_COMPANION_PRD.md`  
**Target**: All 3 Features - Complete Implementation Plan  
**Current System**: SmartRecommenderV2 with vector embeddings ✅

---

## 📋 **Overview & Current State**

### **What We Have** ✅

- Smart Recommender V2 with vector embeddings ✅
- User memory system with embeddings ✅
- Movie embeddings with semantic search ✅
- User interaction tracking ✅
- Claude integration ready ✅
- Working system: User ID `b3b4e250-1836-471a-9def-8b0993af6fbd` with 10 watchlist items, 6 watched movies

### **COMPLETED FEATURES** 🎉

**✅ F-2**: Explainable Recommendations ("Why this pick?") - **100% COMPLETE**

- ✅ Database schema for explanation caching (7-day TTL)
- ✅ ExplanationService with real Claude API integration
- ✅ /api/movies/explanations endpoint
- ✅ ConfidenceBadge component with color-coded discovery factors
- ✅ ExplanationPopover component with detailed explanations
- ✅ Batch explanation generation for performance optimization
- ✅ Full integration in MovieGridCard and WatchlistCard components
- ✅ Comprehensive test suite (15 test cases, all passing)
- ✅ All movie recommendation pathways include explanations +**✅ Smart Hybrid™ Trending Fetch** – TMDB real-time trending + 24 h cache, blended with top-rated local movies (Option 1)

**✅ F-3**: Conversational Discovery with Voice Input - **CORE COMPLETE**

- ✅ ConversationalParser with Claude integration for natural language understanding
- ✅ SmartSearchEngine with semantic, filter, and hybrid search strategies
- ✅ Voice input hooks with Web Speech API integration
- ✅ Voice output hooks with text-to-speech functionality
- ✅ VoiceSearchModal component with complete voice workflow
- ✅ /api/movies/search endpoint for conversational queries
- ✅ Browser compatibility checks and graceful fallbacks

### **What We're Building Next** 🚀

**📋 F-1**: Hyper-Personalized Recommendations (behavioral + temporal) - **NEXT**  
**📋 Advanced Features**: Conversational memory system, 11Labs integration, dashboard polish

---

# 🚀 **FEATURE 1: HYPER-PERSONALIZED RECOMMENDATION ENGINE**

## **Phase 1: Behavioral Pattern Foundation** (Week 1)

### **Task 1.1: Add Interaction Tracking Schema**

**Objective**: Track realistic in-app interactions that we can actually capture (detail views, watch-list adds, ratings, search clicks).  
**Time**: 2-3 hours  
**Dependencies**: None  
**Risk**: Low (additive schema changes)

#### **Implementation**:

```sql
-- supabase/migrations/20250127220000_add_user_interactions.sql
BEGIN;

CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (
    interaction_type IN (
      'view_details',
      'add_to_watchlist',
      'rate',
      'search_result_click',
      'recommendation_click'
    )
  ),
  interaction_context JSONB DEFAULT '{}', -- search query, recommendation type, etc.
  time_of_day INTEGER CHECK (time_of_day >= 0 AND time_of_day <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  metadata JSONB DEFAULT '{}', -- rating value, time spent on page, position in list…
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_interactions_user_time ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_type ON user_interactions(user_id, interaction_type);

-- RLS Policies
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_interactions_policy" ON user_interactions
  FOR ALL USING (auth.uid() = user_id);

COMMIT;
```

**Test**: `npx supabase db reset && npm run test -- --testNamePattern="interaction tracking schema"`  
**Validation**: ✅ Migration applies, table created, indexes work, RLS enforced

---

### **Task 1.2: Interaction Data Collection API**

**Objective**: Create API endpoint to record user interactions  
**Time**: 3-4 hours  
**Dependencies**: Task 1.1  
**Risk**: Low

#### **Implementation**:

```typescript
// src/app/api/user/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

interface InteractionRequest {
  movieId: string
  type:
    | 'view_details'
    | 'add_to_watchlist'
    | 'rate'
    | 'search_result_click'
    | 'recommendation_click'
  context?: string[]
  metadata?: {
    searchQuery?: string
    recommendationType?: string
    timeSpent?: number
    ratingValue?: number
    position?: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: InteractionRequest = await request.json()
    const { movieId, type, context, metadata } = body

    if (!movieId || !type) {
      return NextResponse.json({ error: 'movieId and type are required' }, { status: 400 })
    }

    // Create Supabase client bound to the incoming cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: name => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    )

    // Auth guard
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const interactionData = {
      user_id: user.id,
      movie_id: movieId,
      interaction_type: type,
      interaction_context: context || [],
      metadata: metadata || {},
      time_of_day: now.getHours(),
      day_of_week: now.getDay(),
    }

    const { error } = await supabase.from('user_interactions').insert(interactionData)

    if (error) {
      logger.error('Interaction tracking failed', { error: error.message, userId: user.id })
      return NextResponse.json({ error: 'Failed to track interaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Interaction endpoint error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Test**: `npm run test -- src/__tests__/api/interaction-tracking.test.ts`  
**Validation**: ✅ API works, auth enforced, data inserted, error handling robust

---

### **Task 1.3: Frontend Behavior Tracking Hook**

**Objective**: Automatically track user interactions  
**Time**: 2-3 hours  
**Dependencies**: Task 1.2  
**Risk**: Low

#### **Implementation**:

```typescript
// src/hooks/useBehaviorTracker.ts
import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

export const useBehaviorTracker = () => {
  const { user } = useAuth()

  const trackInteraction = useCallback(
    async (options: {
      movieId: string
      type: 'browse' | 'preview' | 'watch' | 'bookmark' | 'share'
      context?: string[]
      completionPercentage?: number
    }) => {
      if (!user) return

      try {
        await fetch('/api/user/behavior', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId: options.movieId,
            interactionType: options.type,
            contextTags: options.context,
            completionPercentage: options.completionPercentage,
          }),
        })
      } catch (error) {
        // Fail silently - don't disrupt UX
        console.warn('Behavior tracking failed:', error)
      }
    },
    [user]
  )

  return {
    trackInteraction,
    trackBrowse: (movieId: string, context?: string[]) =>
      trackInteraction({ movieId, type: 'browse', context }),
    trackPreview: (movieId: string, context?: string[]) =>
      trackInteraction({ movieId, type: 'preview', context }),
    trackWatch: (movieId: string, completionPercentage?: number) =>
      trackInteraction({ movieId, type: 'watch', completionPercentage }),
    isEnabled: !!user,
  }
}
```

**Test**: `npm run test -- src/__tests__/hooks/useBehaviorTracker.test.ts`  
**Validation**: ✅ Hook works, tracks correctly, fails gracefully

---

### **Task 1.4: Nightly Preference Insight Aggregation**

**Objective**: Materialise lightweight temporal/genre preference maps into `user_preference_insights` table every 24 h via pg_cron.
**Time**: 2 hours
**Dependencies**: Task 2.1 (analysis function)
**Risk**: Low

#### **Implementation**:

```sql
-- supabase/migrations/20250128000000_compute_preference_insights.sql
-- 1.  PL/pgSQL function `refresh_user_preference_insights()` loops through `auth.users`
--     and upserts a placeholder insight row (actual JSON filled by Edge Function later).
-- 2.  pg_cron schedule: `15 3 * * *` (03:15 UTC daily).
```

Edge-Function (Deno) placeholder (`supabase/functions/aggregate-preference-insights.ts`) will
call the internal API to compute rich JSON insights and update the row. **Runs independently
of tests, so no build impact.**

**Test**: `supabase db reset && supabase db dump | grep refresh_user_preference_insights` → verify objects
**Validation**: ✅ Cron job appears in `cron.job` table and function inserts one insight row per user

---

## **Phase 2: Pattern Recognition Engine** (Week 1-2)

### **Task 2.1: Temporal Pattern Analysis**

**Objective**: Analyze when users prefer different movie types  
**Time**: 4-5 hours  
**Dependencies**: Task 1.3  
**Risk**: Medium

#### **Implementation**:

```typescript
// src/lib/ai/behavioral-analysis.ts - Extend existing
export interface TemporalPreferences {
  timeOfDay: {
    [hour: number]: {
      preferredGenres: string[]
      avgRating: number
      watchCount: number
      confidence: number
    }
  }
  dayOfWeek: {
    [day: number]: {
      preferredGenres: string[]
      avgRating: number
      moodTags: string[]
      watchCount: number
    }
  }
  patterns: {
    weekendPreference: string[]
    weekdayPreference: string[]
    eveningGenres: string[]
    morningGenres: string[]
  }
}

export class BehavioralAnalyzer {
  async analyzeTemporalPatterns(userId: string): Promise<TemporalPreferences> {
    // Get viewing sessions with ratings and movie data
    const { data: sessions } = await this.supabase
      .from('user_viewing_sessions')
      .select(
        `
        *,
        movies!inner(genre_ids, title, vote_average),
        ratings(rating, interested)
      `
      )
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    return this.processTemporalData(sessions || [])
  }

  private processTemporalData(sessions: any[]): TemporalPreferences {
    // Process hourly and daily patterns
    // Calculate genre preferences by time
    // Derive broader patterns (weekend vs weekday, etc.)
    // Return structured temporal preferences
  }
}
```

**Test**: `npm run test -- --testNamePattern="temporal pattern analysis"`  
**Validation**: ✅ Patterns analyzed correctly, handles edge cases, good performance

---

### **Task 2.2: Enhanced User Context Integration**

**Objective**: Integrate behavioral insights into SmartRecommenderV2  
**Time**: 3-4 hours  
**Dependencies**: Task 2.1  
**Risk**: Medium

#### **Implementation**:

```typescript
// src/lib/ai/smart-recommender-v2.ts - Extend existing
import { BehavioralAnalyzer } from './behavioral-analysis'

export class SmartRecommenderV2 {
  private behavioralAnalyzer = new BehavioralAnalyzer()

  async getEnhancedRecommendations(
    options: SmartRecommendationOptions & {
      includeBehavioral?: boolean
      temporalContext?: boolean
    }
  ): Promise<SmartRecommendationResult> {
    // Get base recommendations
    const baseRecommendations = await this.getSmartRecommendations(options)

    if (!options.includeBehavioral) {
      return baseRecommendations
    }

    // Add behavioral context
    const temporalPrefs = await this.behavioralAnalyzer.analyzeTemporalPatterns(options.userId)
    const enhancedMovies = await this.applyBehavioralScoring(
      baseRecommendations.movies,
      temporalPrefs
    )

    return {
      ...baseRecommendations,
      movies: enhancedMovies,
      insights: {
        ...baseRecommendations.insights,
        behavioralFactors: this.getBehavioralInsights(temporalPrefs),
        temporalContext: this.getCurrentTemporalContext(temporalPrefs),
      },
    }
  }

  private async applyBehavioralScoring(
    movies: EnhancedMovie[],
    temporalPrefs: TemporalPreferences
  ): Promise<EnhancedMovie[]> {
    const currentHour = new Date().getHours()
    const currentDay = new Date().getDay()

    return movies
      .map(movie => {
        let behavioralBoost = 0

        // Apply temporal preference boost
        const timePrefs = temporalPrefs.timeOfDay[currentHour]
        const dayPrefs = temporalPrefs.dayOfWeek[currentDay]

        if (timePrefs && movie.genre_ids) {
          const genreMatches = movie.genre_ids.filter(id =>
            timePrefs.preferredGenres.includes(this.getGenreName(id))
          )
          behavioralBoost += genreMatches.length * 0.1 * timePrefs.confidence
        }

        if (dayPrefs && movie.genre_ids) {
          const dayGenreMatch = movie.genre_ids.some(id =>
            dayPrefs.preferredGenres.includes(this.getGenreName(id))
          )
          if (dayGenreMatch) behavioralBoost += 0.15
        }

        return {
          ...movie,
          confidenceScore: Math.min((movie.confidenceScore || 0.5) + behavioralBoost, 1.0),
          behavioralFactors: {
            temporalBoost: behavioralBoost,
            timeMatch: timePrefs?.preferredGenres || [],
            dayMatch: dayPrefs?.preferredGenres || [],
          },
        }
      })
      .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
  }
}
```

**Test**: `npm run test -- --testNamePattern="enhanced recommendations"`  
**Validation**: ✅ Behavioral scoring works, recommendations improved, performance good

---

### **Task 2.3: API Integration for Behavioral Recommendations**

**Objective**: Add behavioral mode to movies API  
**Time**: 2-3 hours  
**Dependencies**: Task 2.2  
**Risk**: Low

#### **Implementation**:

```typescript
// src/app/api/movies/route.ts - Extend existing
export async function GET(request: NextRequest) {
  // ... existing code ...

  const behavioralMode = searchParams.get('behavioral') === 'true'

  if (behavioralMode && user) {
    const smartRecommender = SmartRecommenderV2.getInstance()
    const enhancedRecs = await smartRecommender.getEnhancedRecommendations({
      userId: user.id,
      limit: limit,
      includeBehavioral: true,
      temporalContext: true,
    })

    return NextResponse.json({
      movies: enhancedRecs.movies,
      insights: enhancedRecs.insights,
      behavioralContext: enhancedRecs.insights.behavioralFactors,
    })
  }

  // ... rest of existing code ...
}
```

**Test**: `curl "http://localhost:3000/api/movies?behavioral=true"`  
**Validation**: ✅ API returns behavioral recommendations, performance acceptable

---

# 💡 **FEATURE 2: EXPLAINABLE RECOMMENDATIONS**

## **Phase 3: Explanation System** (Week 2-3)

### **Task 3.1: Explanation Database Schema**

**Objective**: Store and retrieve recommendation explanations  
**Time**: 2-3 hours  
**Dependencies**: Task 2.3  
**Risk**: Low

#### **Implementation**:

```sql
-- supabase/migrations/20250127230000_add_explanation_system.sql
BEGIN;

CREATE TABLE recommendation_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  explanation_type TEXT CHECK (explanation_type IN ('similarity', 'pattern', 'mood', 'discovery', 'temporal')),
  primary_reason TEXT NOT NULL,
  supporting_data JSONB DEFAULT '{}',
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  supporting_movies TEXT[], -- Array of movie IDs
  discovery_level TEXT CHECK (discovery_level IN ('safe', 'stretch', 'adventure')),
  optimal_viewing_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX recommendation_explanations_user_id_idx ON recommendation_explanations (user_id);
CREATE INDEX recommendation_explanations_movie_id_idx ON recommendation_explanations (movie_id);
CREATE INDEX recommendation_explanations_expires_at_idx ON recommendation_explanations (expires_at);

-- RLS
ALTER TABLE recommendation_explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendation_explanations_policy" ON recommendation_explanations
  FOR ALL USING (auth.uid() = user_id);

-- Cleanup function for expired explanations
CREATE OR REPLACE FUNCTION cleanup_expired_explanations()
RETURNS void AS $$
BEGIN
  DELETE FROM recommendation_explanations WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

**Test**: `npx supabase db reset`  
**Validation**: ✅ Schema created, RLS working, cleanup function exists

---

### **Task 3.2: Explanation Generation Service**

**Objective**: Generate AI-powered explanations for recommendations  
**Time**: 4-5 hours  
**Dependencies**: Task 3.1  
**Risk**: Medium

#### **Implementation**:

```typescript
// src/lib/ai/explanation-service.ts
import { anthropic } from '@/lib/anthropic/config'
import { createClient } from '@/lib/supabase/server-client'
import type { Movie } from '@/types'

export interface RecommendationExplanation {
  id: string
  primary_reason: string
  supporting_movies: Movie[]
  confidence_score: number
  taste_match_percentage: number
  discovery_factor: 'safe' | 'stretch' | 'adventure'
  optimal_viewing_time?: string
  explanation_type: 'similarity' | 'pattern' | 'mood' | 'discovery' | 'temporal'
}

export class ExplanationService {
  private supabase = createClient()

  async generateExplanation(
    userId: string,
    movie: Movie,
    context: {
      userHistory: Movie[]
      temporalPrefs?: any
      behavioralContext?: any
      recommendationReason?: string
    }
  ): Promise<RecommendationExplanation> {
    // Check if explanation already exists (cached)
    const cached = await this.getCachedExplanation(userId, movie.id)
    if (cached) return cached

    // Generate new explanation using Claude
    const explanation = await this.generateWithClaude(userId, movie, context)

    // Store in database
    await this.storeExplanation(userId, movie.id, explanation)

    return explanation
  }

  private async generateWithClaude(
    userId: string,
    movie: Movie,
    context: any
  ): Promise<RecommendationExplanation> {
    const prompt = this.buildExplanationPrompt(movie, context)

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Will upgrade to Sonnet 4
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 400,
    })

    const explanationText = response.content[0].text
    return this.parseExplanationResponse(explanationText, movie, context)
  }

  private buildExplanationPrompt(movie: Movie, context: any): string {
    return `
Generate a personalized movie recommendation explanation for this movie:

Movie: "${movie.title}" (${movie.release_date?.split('-')[0]})
Genres: ${movie.genre_ids?.map(id => this.getGenreName(id)).join(', ')}
Rating: ${movie.vote_average}/10
Plot: ${movie.overview}

User Context:
- Recent favorites: ${context.userHistory
      ?.slice(0, 3)
      .map(m => m.title)
      .join(', ')}
- Current time: ${new Date().toLocaleString()}
- Behavioral patterns: ${JSON.stringify(context.temporalPrefs?.patterns)}
- Recommendation reason: ${context.recommendationReason}

Generate a JSON response with:
{
  "primary_reason": "One clear, personal sentence explaining why this was recommended",
  "explanation_type": "similarity|pattern|mood|discovery|temporal",
  "confidence_score": 0-100,
  "discovery_factor": "safe|stretch|adventure",
  "supporting_factors": ["2-3 specific reasons"],
  "optimal_viewing_time": "Optional suggestion like 'Perfect for Sunday evening'",
  "taste_match_percentage": 0-100
}

Keep the primary reason conversational and personal. Focus on what makes this movie special for this specific user.
`
  }

  private parseExplanationResponse(
    response: string,
    movie: Movie,
    context: any
  ): RecommendationExplanation {
    try {
      const parsed = JSON.parse(response)

      return {
        id: crypto.randomUUID(),
        primary_reason: parsed.primary_reason,
        supporting_movies: this.getSupportingMovies(context.userHistory, parsed.supporting_factors),
        confidence_score: parsed.confidence_score || 75,
        taste_match_percentage: parsed.taste_match_percentage || 80,
        discovery_factor: parsed.discovery_factor || 'safe',
        optimal_viewing_time: parsed.optimal_viewing_time,
        explanation_type: parsed.explanation_type || 'similarity',
      }
    } catch (error) {
      // Fallback explanation
      return {
        id: crypto.randomUUID(),
        primary_reason: `Recommended based on your movie preferences and viewing patterns.`,
        supporting_movies: [],
        confidence_score: 70,
        taste_match_percentage: 75,
        discovery_factor: 'safe',
        explanation_type: 'pattern',
      }
    }
  }

  private async getCachedExplanation(
    userId: string,
    movieId: string
  ): Promise<RecommendationExplanation | null> {
    const { data } = await this.supabase
      .from('recommendation_explanations')
      .select('*')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!data) return null

    return {
      id: data.id,
      primary_reason: data.primary_reason,
      supporting_movies: [], // Would need to fetch these
      confidence_score: data.confidence_score,
      taste_match_percentage: 80, // Calculate from supporting_data
      discovery_factor: data.discovery_level,
      optimal_viewing_time: data.optimal_viewing_time,
      explanation_type: data.explanation_type,
    }
  }

  private async storeExplanation(
    userId: string,
    movieId: string,
    explanation: RecommendationExplanation
  ): Promise<void> {
    await this.supabase.from('recommendation_explanations').insert({
      user_id: userId,
      movie_id: movieId,
      explanation_type: explanation.explanation_type,
      primary_reason: explanation.primary_reason,
      confidence_score: explanation.confidence_score,
      discovery_level: explanation.discovery_factor,
      optimal_viewing_time: explanation.optimal_viewing_time,
      supporting_data: {
        taste_match: explanation.taste_match_percentage,
        supporting_movies: explanation.supporting_movies.map(m => m.id),
      },
    })
  }

  private getSupportingMovies(userHistory: Movie[], factors: string[]): Movie[] {
    // Logic to find supporting movies based on factors
    return userHistory?.slice(0, 3) || []
  }

  private getGenreName(genreId: number): string {
    const genreMap: { [id: number]: string } = {
      28: 'Action',
      12: 'Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      14: 'Fantasy',
      36: 'History',
      27: 'Horror',
      10402: 'Music',
      9648: 'Mystery',
      10749: 'Romance',
      878: 'Science Fiction',
      10770: 'TV Movie',
      53: 'Thriller',
      10752: 'War',
      37: 'Western',
    }
    return genreMap[genreId] || 'Unknown'
  }
}
```

**Test**: `npm run test -- --testNamePattern="explanation service"`  
**Validation**: ✅ Explanations generated, cached properly, Claude integration works

---

### **Task 3.3: Explanation UI Components**

**Objective**: Display explanations in the movie interface  
**Time**: 3-4 hours  
**Dependencies**: Task 3.2  
**Risk**: Low

#### **Implementation**:

```tsx
// src/components/movies/ExplanationCard.tsx
import { RecommendationExplanation } from '@/lib/ai/explanation-service'

interface ExplanationCardProps {
  explanation: RecommendationExplanation
  movie: Movie
  compact?: boolean
}

export const ExplanationCard = ({ explanation, movie, compact = false }: ExplanationCardProps) => {
  if (compact) {
    return (
      <div className="tooltip tooltip-top" data-tip={explanation.primary_reason}>
        <div className="badge badge-primary badge-sm">{explanation.confidence_score}% match</div>
      </div>
    )
  }

  return (
    <div className="card bg-base-200 mb-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="badge badge-primary">{explanation.confidence_score}% match</div>
          <div
            className={`badge ${
              explanation.discovery_factor === 'safe'
                ? 'badge-success'
                : explanation.discovery_factor === 'stretch'
                  ? 'badge-warning'
                  : 'badge-error'
            }`}
          >
            {explanation.discovery_factor}
          </div>
        </div>

        {explanation.optimal_viewing_time && (
          <div className="text-xs opacity-60">💡 {explanation.optimal_viewing_time}</div>
        )}
      </div>

      <p className="mb-3 text-sm leading-relaxed opacity-90">{explanation.primary_reason}</p>

      {explanation.supporting_movies.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">Because you liked:</span>
          <div className="flex gap-1">
            {explanation.supporting_movies.map(supportMovie => (
              <div key={supportMovie.id} className="tooltip" data-tip={supportMovie.title}>
                <img
                  src={supportMovie.poster_path}
                  alt={supportMovie.title}
                  className="h-9 w-6 rounded object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-base-300 mt-3 flex items-center justify-between border-t pt-2">
        <div className="text-xs opacity-60">{explanation.explanation_type} recommendation</div>
        <div className="text-xs opacity-60">{explanation.taste_match_percentage}% taste match</div>
      </div>
    </div>
  )
}

// Enhanced Movie Card with Explanations
// src/components/movies/MovieGridCard.tsx - Add explanation
import { ExplanationCard } from './ExplanationCard'
import { useQuery } from '@tanstack/react-query'

const MovieGridCard = ({ movie, userId, showExplanation = false }: Props) => {
  const { data: explanation } = useQuery({
    queryKey: ['explanation', movie.id, userId],
    queryFn: () => fetchExplanation(movie.id, userId),
    enabled: showExplanation && !!userId,
  })

  return (
    <div className="card bg-base-100 shadow-xl">
      {/* existing movie card content */}

      {explanation && (
        <div className="card-body pt-2">
          <ExplanationCard explanation={explanation} movie={movie} compact={true} />
        </div>
      )}
    </div>
  )
}
```

**Test**: `npm run test -- --testNamePattern="explanation UI"`  
**Validation**: ✅ Components render correctly, explanations display properly

---

### **Task 3.4: Explanation API Integration**

**Objective**: Add explanation endpoint and integrate with movies API  
**Time**: 2-3 hours  
**Dependencies**: Task 3.3  
**Risk**: Low

#### **Implementation**:

```typescript
// src/app/api/movies/explanations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ExplanationService } from '@/lib/ai/explanation-service'
import { getUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { movieId, context } = await request.json()

  const explanationService = new ExplanationService()
  const explanation = await explanationService.generateExplanation(user.id, movieId, context)

  return NextResponse.json({ explanation })
}

// Update src/app/api/movies/route.ts to include explanations
export async function GET(request: NextRequest) {
  // ... existing code ...

  const includeExplanations = searchParams.get('explanations') === 'true'

  if (includeExplanations && user) {
    const explanationService = new ExplanationService()

    const moviesWithExplanations = await Promise.all(
      movies.map(async movie => {
        const explanation = await explanationService.generateExplanation(user.id, movie, {
          userHistory: [],
          temporalPrefs: {},
        })

        return {
          ...movie,
          explanation,
        }
      })
    )

    return NextResponse.json({
      movies: moviesWithExplanations,
      hasExplanations: true,
    })
  }

  // ... rest of existing code ...
}
```

**Test**: `curl "http://localhost:3000/api/movies?explanations=true"`  
**Validation**: ✅ API returns movies with explanations, performance acceptable

---

# 🗣️ **FEATURE 3: CONVERSATIONAL DISCOVERY WITH VOICE**

## **Phase 4: Voice & Conversational System** (Week 3-4) ✅

### **Task 4.1: Conversational Query Parser** ✅

**Objective**: Parse natural language movie queries  
**Time**: 4-5 hours  
**Dependencies**: Task 3.4  
**Risk**: Medium

#### **Implementation**:

```typescript
// src/lib/ai/conversational-parser.ts
import { anthropic } from '@/lib/anthropic/config'

export interface ConversationalQuery {
  original_text: string
  intent: 'search' | 'recommendation' | 'filter' | 'mood_based'
  extracted_criteria: {
    genres?: string[]
    moods?: string[]
    similar_to?: string[]
    time_context?: string
    emotional_tone?: string
    complexity_level?: 'light' | 'medium' | 'complex'
    year_range?: [number, number]
    actors?: string[]
    directors?: string[]
    keywords?: string[]
  }
  confidence: number
  search_strategy: 'semantic' | 'filter' | 'hybrid'
}

export class ConversationalParser {
  async parseQuery(query: string, userId: string): Promise<ConversationalQuery> {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Will upgrade to Sonnet 4
      messages: [
        {
          role: 'user',
          content: this.buildParserPrompt(query),
        },
      ],
      max_tokens: 500,
    })

    return this.parseResponse(response.content[0].text, query)
  }

  private buildParserPrompt(query: string): string {
    return `
Parse this movie search query and extract structured criteria:

Query: "${query}"

Extract and return JSON with:
{
  "intent": "search|recommendation|filter|mood_based",
  "extracted_criteria": {
    "genres": ["action", "drama"],
    "moods": ["uplifting", "dark", "nostalgic"],
    "similar_to": ["movie titles mentioned"],
    "time_context": "weekend evening|rainy day|late night|etc",
    "emotional_tone": "light|serious|emotional|funny",
    "complexity_level": "light|medium|complex",
    "year_range": [start_year, end_year],
    "actors": ["actor names"],
    "directors": ["director names"],
    "keywords": ["specific themes or elements"]
  },
  "confidence": 0.0-1.0,
  "search_strategy": "semantic|filter|hybrid"
}

Examples:
- "Movies like Inception but more emotional" → intent: "search", similar_to: ["Inception"], emotional_tone: "emotional", search_strategy: "semantic"
- "What should I watch on a rainy Sunday?" → intent: "mood_based", time_context: "rainy day", search_strategy: "hybrid"
- "Show me 90s action movies" → intent: "filter", genres: ["action"], year_range: [1990, 1999], search_strategy: "filter"

Be specific and capture the user's intent accurately.
`
  }

  private parseResponse(response: string, originalQuery: string): ConversationalQuery {
    try {
      const parsed = JSON.parse(response)

      return {
        original_text: originalQuery,
        intent: parsed.intent || 'search',
        extracted_criteria: parsed.extracted_criteria || {},
        confidence: parsed.confidence || 0.7,
        search_strategy: parsed.search_strategy || 'hybrid',
      }
    } catch (error) {
      // Fallback parsing
      return {
        original_text: originalQuery,
        intent: 'search',
        extracted_criteria: {
          keywords: [originalQuery],
        },
        confidence: 0.5,
        search_strategy: 'semantic',
      }
    }
  }
}
```

**Test**: `npm run test -- --testNamePattern="conversational parser"`  
**Validation**: ✅ Queries parsed correctly, intents identified, criteria extracted

---

### **Task 4.2: Smart Search Execution Engine** ✅

**Objective**: Execute searches based on parsed queries  
**Time**: 4-5 hours  
**Dependencies**: Task 4.1  
**Risk**: Medium

#### **Implementation**:

```typescript
// src/lib/ai/smart-search-engine.ts
import { ConversationalQuery } from './conversational-parser'
import { SmartRecommenderV2 } from './smart-recommender-v2'
import { embeddingService } from './embedding-service'

export class SmartSearchEngine {
  private recommender = SmartRecommenderV2.getInstance()

  async executeSearch(
    query: ConversationalQuery,
    userId: string
  ): Promise<{
    movies: Movie[]
    searchContext: any
    explanations: string[]
  }> {
    switch (query.search_strategy) {
      case 'semantic':
        return this.executeSemanticSearch(query, userId)
      case 'filter':
        return this.executeFilterSearch(query, userId)
      case 'hybrid':
        return this.executeHybridSearch(query, userId)
      default:
        return this.executeHybridSearch(query, userId)
    }
  }

  private async executeSemanticSearch(query: ConversationalQuery, userId: string) {
    // Use embedding service for semantic similarity
    const searchText = this.buildSemanticSearchText(query)
    const embedding = await embeddingService.generateEmbedding(searchText)

    // Search movies by semantic similarity
    const semanticResults = await embeddingService.searchMovies(embedding.data, {
      threshold: 0.7,
      limit: 20,
    })

    // Apply user context and re-rank
    const personalizedResults = await this.recommender.getSmartRecommendations({
      userId,
      userQuery: query.original_text,
      limit: 10,
      semanticThreshold: 0.7,
    })

    return {
      movies: personalizedResults.movies,
      searchContext: {
        strategy: 'semantic',
        embedding_query: searchText,
        similarity_threshold: 0.7,
      },
      explanations: [
        `Found movies semantically similar to: "${query.original_text}"`,
        `Applied your personal preferences and viewing history`,
        `Ranked by relevance and compatibility with your taste`,
      ],
    }
  }

  private async executeFilterSearch(query: ConversationalQuery, userId: string) {
    const filters = this.buildFilters(query.extracted_criteria)

    // Get movies from database with filters
    const filteredMovies = await this.getMoviesWithFilters(filters)

    // Apply personal ranking
    const rankedMovies = await this.applyPersonalRanking(filteredMovies, userId)

    return {
      movies: rankedMovies.slice(0, 10),
      searchContext: {
        strategy: 'filter',
        applied_filters: filters,
      },
      explanations: [
        `Filtered movies by: ${this.describeFilters(filters)}`,
        `Ranked by your personal preferences`,
        `Found ${filteredMovies.length} matching movies`,
      ],
    }
  }

  private async executeHybridSearch(query: ConversationalQuery, userId: string) {
    // Combine semantic and filter approaches
    const [semanticResults, filterResults] = await Promise.all([
      this.executeSemanticSearch(query, userId),
      this.executeFilterSearch(query, userId),
    ])

    // Merge and deduplicate results
    const mergedMovies = this.mergeResults(
      semanticResults.movies,
      filterResults.movies,
      query.confidence
    )

    return {
      movies: mergedMovies,
      searchContext: {
        strategy: 'hybrid',
        semantic_weight: query.confidence,
        filter_weight: 1 - query.confidence,
      },
      explanations: [
        `Combined semantic similarity and filtered search`,
        `Weighted by query confidence: ${Math.round(query.confidence * 100)}%`,
        `Personalized for your viewing preferences`,
      ],
    }
  }

  private buildSemanticSearchText(query: ConversationalQuery): string {
    const criteria = query.extracted_criteria
    const parts: string[] = [query.original_text]

    if (criteria.genres?.length) {
      parts.push(`Genres: ${criteria.genres.join(', ')}`)
    }
    if (criteria.moods?.length) {
      parts.push(`Mood: ${criteria.moods.join(', ')}`)
    }
    if (criteria.emotional_tone) {
      parts.push(`Tone: ${criteria.emotional_tone}`)
    }
    if (criteria.similar_to?.length) {
      parts.push(`Similar to: ${criteria.similar_to.join(', ')}`)
    }

    return parts.join('. ')
  }

  private buildFilters(criteria: ConversationalQuery['extracted_criteria']) {
    const filters: any = {}

    if (criteria.genres?.length) {
      filters.genres = criteria.genres
    }
    if (criteria.year_range) {
      filters.year_min = criteria.year_range[0]
      filters.year_max = criteria.year_range[1]
    }
    if (criteria.actors?.length) {
      filters.actors = criteria.actors
    }
    if (criteria.directors?.length) {
      filters.directors = criteria.directors
    }

    return filters
  }

  private async getMoviesWithFilters(filters: any): Promise<Movie[]> {
    // Implementation would query your movie database with filters
    // This is a placeholder - you'd implement based on your schema
    return []
  }

  private async applyPersonalRanking(movies: Movie[], userId: string): Promise<Movie[]> {
    // Use existing recommendation system to rank filtered movies
    const recommendations = await this.recommender.getSmartRecommendations({
      userId,
      limit: movies.length,
    })

    // Intersect and maintain order from recommendations
    return movies.sort((a, b) => {
      const aIndex = recommendations.movies.findIndex(m => m.id === a.id)
      const bIndex = recommendations.movies.findIndex(m => m.id === b.id)

      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1

      return aIndex - bIndex
    })
  }

  private mergeResults(
    semanticMovies: Movie[],
    filterMovies: Movie[],
    semanticWeight: number
  ): Movie[] {
    const merged = new Map<string, Movie & { score: number }>()

    // Add semantic results with weight
    semanticMovies.forEach((movie, index) => {
      const score = (semanticMovies.length - index) * semanticWeight
      merged.set(movie.id, { ...movie, score })
    })

    // Add filter results with weight
    filterMovies.forEach((movie, index) => {
      const score = (filterMovies.length - index) * (1 - semanticWeight)
      const existing = merged.get(movie.id)

      if (existing) {
        existing.score += score
      } else {
        merged.set(movie.id, { ...movie, score })
      }
    })

    // Sort by combined score and return
    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  private describeFilters(filters: any): string {
    const descriptions: string[] = []

    if (filters.genres) descriptions.push(`genres: ${filters.genres.join(', ')}`)
    if (filters.year_min || filters.year_max) {
      descriptions.push(`years: ${filters.year_min || 'any'}-${filters.year_max || 'any'}`)
    }
    if (filters.actors) descriptions.push(`actors: ${filters.actors.join(', ')}`)
    if (filters.directors) descriptions.push(`directors: ${filters.directors.join(', ')}`)

    return descriptions.join(', ')
  }
}
```

**Test**: `npm run test -- --testNamePattern="smart search engine"`  
**Validation**: ✅ Search strategies work, results merged correctly, personal ranking applied

---

### **Task 4.3: Voice Input Integration** ✅

**Objective**: Add voice input using Web Speech API  
**Time**: 3-4 hours  
**Dependencies**: Task 4.2  
**Risk**: Medium

#### **Implementation**:

```typescript
// src/hooks/useVoiceInput.ts
import { useState, useCallback, useRef } from 'react'

interface VoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
}

export const useVoiceInput = (options: VoiceInputOptions = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (typeof window === 'undefined') return false

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser')
      return false
    }

    const recognition = new SpeechRecognition()
    recognition.lang = options.language || 'en-US'
    recognition.continuous = options.continuous || false
    recognition.interimResults = options.interimResults || true

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = event => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (final) {
        setTranscript(prev => prev + final)
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = event => {
      setError(`Speech recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setIsSupported(true)
    return true
  }, [options.language, options.continuous, options.interimResults])

  const startListening = useCallback(() => {
    if (!recognitionRef.current && !initializeRecognition()) {
      return
    }

    try {
      recognitionRef.current?.start()
    } catch (error) {
      setError('Failed to start voice recognition')
    }
  }, [initializeRecognition])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
```

**Test**: `npm run test -- --testNamePattern="voice input hook"`  
**Validation**: ✅ Voice recognition works, handles errors gracefully, cross-browser compatible

---

### **Task 4.4: Voice Output with Text-to-Speech** ✅

**Objective**: Add voice responses using Web Speech API  
**Time**: 2-3 hours  
**Dependencies**: Task 4.3  
**Risk**: Low

#### **Implementation**:

```typescript
// src/hooks/useVoiceOutput.ts
import { useState, useCallback } from 'react'

interface VoiceOutputOptions {
  voice?: SpeechSynthesisVoice
  rate?: number
  pitch?: number
  volume?: number
}

export const useVoiceOutput = (options: VoiceOutputOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  // Initialize TTS
  const initializeTTS = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false
    }

    setIsSupported(true)

    // Load available voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return true
  }, [])

  const speak = useCallback(
    (text: string, customOptions?: Partial<VoiceOutputOptions>) => {
      if (!isSupported && !initializeTTS()) {
        console.warn('Text-to-speech not supported')
        return
      }

      // Stop any current speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      // Apply options
      utterance.voice = customOptions?.voice || options.voice || null
      utterance.rate = customOptions?.rate || options.rate || 1
      utterance.pitch = customOptions?.pitch || options.pitch || 1
      utterance.volume = customOptions?.volume || options.volume || 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [isSupported, options, initializeTTS]
  )

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  const getPreferredVoice = useCallback(
    (language: string = 'en-US') => {
      return (
        availableVoices.find(voice => voice.lang.startsWith(language) && voice.localService) ||
        availableVoices.find(voice => voice.lang.startsWith(language))
      )
    },
    [availableVoices]
  )

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    isSupported,
    availableVoices,
    getPreferredVoice,
  }
}
```

**Test**: `npm run test -- --testNamePattern="voice output hook"`  
**Validation**: ✅ TTS works, voice selection functional, handles edge cases

---

### **Task 4.5: Voice-Enabled Search Component** ✅

**Objective**: Create voice search UI component  
**Time**: 4-5 hours  
**Dependencies**: Task 4.4  
**Risk**: Medium

#### **Implementation**:

```tsx
// src/components/search/VoiceSearchModal.tsx
import { useState, useEffect } from 'react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useVoiceOutput } from '@/hooks/useVoiceOutput'
import { ConversationalParser } from '@/lib/ai/conversational-parser'
import { SmartSearchEngine } from '@/lib/ai/smart-search-engine'
import { useAuth } from '@/hooks/useAuth'

interface VoiceSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onResults: (movies: Movie[], context: any) => void
}

export const VoiceSearchModal = ({ isOpen, onClose, onResults }: VoiceSearchModalProps) => {
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [lastQuery, setLastQuery] = useState('')

  const {
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    continuous: false,
    interimResults: true,
  })

  const { speak, stopSpeaking, isSpeaking } = useVoiceOutput({
    rate: 0.9,
    pitch: 1.0,
  })

  // Auto-process when speech ends
  useEffect(() => {
    if (transcript && !isListening && !isProcessing) {
      processVoiceQuery(transcript)
    }
  }, [transcript, isListening, isProcessing])

  // Update status based on states
  useEffect(() => {
    if (isSpeaking) setStatus('speaking')
    else if (isProcessing) setStatus('processing')
    else if (isListening) setStatus('listening')
    else setStatus('idle')
  }, [isListening, isProcessing, isSpeaking])

  const processVoiceQuery = async (query: string) => {
    if (!user || !query.trim()) return

    setIsProcessing(true)
    setLastQuery(query)

    try {
      // Parse the conversational query
      const parser = new ConversationalParser()
      const parsedQuery = await parser.parseQuery(query, user.id)

      // Execute the search
      const searchEngine = new SmartSearchEngine()
      const results = await searchEngine.executeSearch(parsedQuery, user.id)

      // Provide voice feedback
      const responseText = generateVoiceResponse(results, parsedQuery)
      speak(responseText)

      // Return results to parent
      onResults(results.movies, {
        query: parsedQuery,
        explanations: results.explanations,
      })
    } catch (error) {
      console.error('Voice search error:', error)
      speak("Sorry, I couldn't process that request. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const generateVoiceResponse = (results: any, query: any): string => {
    const movieCount = results.movies.length

    if (movieCount === 0) {
      return "I didn't find any movies matching that description. Try rephrasing your request."
    }

    const topMovie = results.movies[0]

    if (movieCount === 1) {
      return `I found ${topMovie.title}. This ${topMovie.release_date?.split('-')[0]} movie seems perfect for what you're looking for.`
    }

    if (movieCount <= 3) {
      const titles = results.movies
        .slice(0, 2)
        .map(m => m.title)
        .join(' and ')
      return `I found ${movieCount} movies including ${titles}. Check your screen for the full list.`
    }

    return `I found ${movieCount} great options for you. The top recommendation is ${topMovie.title}. Take a look at your screen to see all the results.`
  }

  const handleStartListening = () => {
    resetTranscript()
    stopSpeaking()
    startListening()
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'listening':
        return 'Listening... speak your movie request'
      case 'processing':
        return 'Finding movies for you...'
      case 'speaking':
        return 'Here are my recommendations'
      default:
        return 'Tap the microphone to start voice search'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'listening':
        return '🎤'
      case 'processing':
        return '🔍'
      case 'speaking':
        return '🗣️'
      default:
        return '🎬'
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold">Voice Search</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-6 text-center">
          {/* Status Display */}
          <div className="space-y-4">
            <div className="text-6xl">{getStatusIcon()}</div>
            <p className="text-lg">{getStatusMessage()}</p>
          </div>

          {/* Voice Input Display */}
          {(transcript || interimTranscript) && (
            <div className="bg-base-200 rounded-lg p-4">
              <div className="mb-2 text-sm opacity-70">You said:</div>
              <div className="text-lg">
                {transcript}
                {interimTranscript && <span className="opacity-50">{interimTranscript}</span>}
              </div>
            </div>
          )}

          {/* Error Display */}
          {voiceError && (
            <div className="alert alert-error">
              <span>{voiceError}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <button
              className={`btn btn-circle btn-lg ${isListening ? 'btn-error' : 'btn-primary'}`}
              onClick={isListening ? stopListening : handleStartListening}
              disabled={isProcessing}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>

            {transcript && (
              <button
                className="btn btn-circle btn-lg btn-secondary"
                onClick={() => processVoiceQuery(transcript)}
                disabled={isProcessing}
              >
                🔍
              </button>
            )}

            {isSpeaking && (
              <button className="btn btn-circle btn-lg btn-warning" onClick={stopSpeaking}>
                🔇
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-1 text-sm opacity-70">
            <p>Try saying things like:</p>
            <ul className="list-none space-y-1">
              <li>"Show me action movies like John Wick"</li>
              <li>"What should I watch on a rainy Sunday?"</li>
              <li>"Find me a funny movie from the 90s"</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}
```

**Test**: `npm run test -- --testNamePattern="voice search modal"`  
**Validation**: ✅ Voice search works end-to-end, UI responsive, error handling robust

---

### **Task 4.6: Conversational Memory System** 📋

**Objective**: Implement conversation memory with 11Labs integration  
**Time**: 6-8 hours  
**Dependencies**: Task 4.5  
**Risk**: Medium

#### **Implementation**:

```typescript
// src/app/api/conversations/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ConversationMemoryService } from '@/lib/ai/conversation-memory-service'
import { getUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { movieId, contextType } = await request.json()

    const conversationService = new ConversationMemoryService()
    const sessionId = await conversationService.startConversation({
      userId: user.id,
      movieId,
      contextType,
    })

    const initialContext = await conversationService.getConversationContext(user.id, movieId)

    return NextResponse.json({
      sessionId,
      initialContext,
      success: true,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start conversation' }, { status: 500 })
  }
}

// src/app/api/conversations/exchange/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const sessionId = formData.get('sessionId') as string
    const audioBlob = formData.get('audioBlob') as File
    const fallbackTranscript = formData.get('transcript') as string

    const conversationService = new ConversationMemoryService()

    let transcript = fallbackTranscript
    if (audioBlob) {
      const { transcript: audioTranscript } = await conversationService.processAudio(audioBlob)
      transcript = audioTranscript
    }

    const response = await conversationService.processExchange(sessionId, transcript)

    return NextResponse.json({
      aiResponse: response.aiResponse,
      aiAudioUrl: response.aiAudioUrl,
      extractedMemories: response.extractedMemories,
      conversationInsights: response.insights,
      success: true,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process conversation exchange' }, { status: 500 })
  }
}
```

```typescript
// src/lib/ai/conversation-memory-service.ts
import { anthropic } from '@/lib/anthropic/config'
import { ElevenLabsService } from './elevenlabs-service'
import { createClient } from '@/lib/supabase/server-client'

export class ConversationMemoryService {
  private supabase = createClient()
  private elevenLabs = new ElevenLabsService()

  async startConversation(context: {
    userId: string
    movieId?: string
    contextType: 'movie_page' | 'dashboard' | 'search'
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('conversation_sessions')
      .insert({
        user_id: context.userId,
        movie_id: context.movieId,
        context_type: context.contextType,
        session_type: context.movieId ? 'movie_discussion' : 'general_discovery',
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async processExchange(
    sessionId: string,
    userTranscript: string
  ): Promise<{
    aiResponse: string
    aiAudioUrl: string
    extractedMemories: ConversationalMemory[]
    insights: ConversationInsights
  }> {
    // Get conversation context
    const context = await this.getConversationContext(sessionId)

    // Generate AI response using Claude
    const aiResponse = await this.generateAIResponse(userTranscript, context)

    // Convert to speech using 11Labs
    const { audioUrl } = await this.elevenLabs.textToSpeech(aiResponse)

    // Extract memories from this exchange
    const extractedMemories = await this.extractMemoriesFromExchange({
      userTranscript,
      aiResponse,
      context,
    })

    // Store the exchange
    await this.storeExchange(sessionId, {
      userTranscript,
      aiResponse,
      aiAudioUrl: audioUrl,
      extractedMemories,
    })

    // Update memories
    await this.updateConversationalMemories(extractedMemories)

    return {
      aiResponse,
      aiAudioUrl: audioUrl,
      extractedMemories,
      insights: await this.generateConversationInsights(sessionId),
    }
  }

  private async generateAIResponse(
    userInput: string,
    context: ConversationContext
  ): Promise<string> {
    const prompt = this.buildConversationPrompt(userInput, context)

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    })

    return response.content[0].text
  }

  private async extractMemoriesFromExchange(exchange: {
    userTranscript: string
    aiResponse: string
    context: ConversationContext
  }): Promise<ConversationalMemory[]> {
    const extractionPrompt = this.buildMemoryExtractionPrompt(exchange)

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: extractionPrompt }],
      max_tokens: 500,
    })

    try {
      const extracted = JSON.parse(response.content[0].text)
      return extracted.extracted_memories || []
    } catch (error) {
      console.error('Failed to parse memory extraction:', error)
      return []
    }
  }

  private async updateConversationalMemories(memories: ConversationalMemory[]): Promise<void> {
    for (const memory of memories) {
      // Check if similar memory already exists
      const existing = await this.findExistingMemory(memory)

      if (existing) {
        // Reinforce existing memory
        await this.reinforceMemory(existing.id, memory)
      } else {
        // Create new memory
        await this.createMemory(memory)
      }
    }
  }

  private buildConversationPrompt(userInput: string, context: ConversationContext): string {
    // Implementation of CONVERSATION_COMPANION_PROMPT with context substitution
    return `
You are CineAI, a sophisticated movie companion having a natural conversation with a user about movies.

Current Context:
- Movie being discussed: ${context.movieTitle || 'General discussion'}
- User's previous preferences: ${JSON.stringify(context.recentMemories)}
- Conversation history: ${JSON.stringify(context.conversationHistory)}

User just said: "${userInput}"

Have a natural, engaging conversation about movies. Ask thoughtful questions to understand their taste deeply.
Keep responses under 3 sentences and always end with a question or observation.
`
  }

  private buildMemoryExtractionPrompt(exchange: any): string {
    // Implementation of MEMORY_EXTRACTION_PROMPT
    return `
Analyze this conversation exchange and extract any movie preferences.

User: "${exchange.userTranscript}"
AI: "${exchange.aiResponse}"

Extract preferences as JSON with extracted_memories array.
Only extract clear, confident preferences.
`
  }
}
```

```typescript
// src/lib/ai/elevenlabs-service.ts
export class ElevenLabsService {
  private apiKey = process.env.ELEVENLABS_API_KEY!
  private voiceId = process.env.ELEVENLABS_VOICE_ID!

  async speechToText(audioBlob: Blob): Promise<{
    transcript: string
    confidence: number
    duration: number
  }> {
    // Convert speech to text using 11Labs API
    const formData = new FormData()
    formData.append('audio', audioBlob)

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
      },
      body: formData,
    })

    const result = await response.json()

    return {
      transcript: result.text,
      confidence: result.confidence || 0.9,
      duration: result.duration || 0,
    }
  }

  async textToSpeech(text: string): Promise<{
    audioUrl: string
    audioBlob: Blob
    duration: number
  }> {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
        },
      }),
    })

    const audioBlob = await response.blob()

    // Upload to Supabase storage
    const audioUrl = await this.uploadAudio(audioBlob)

    return {
      audioUrl,
      audioBlob,
      duration: 0, // Would need to calculate from audio
    }
  }

  private async uploadAudio(audioBlob: Blob): Promise<string> {
    // Upload to Supabase storage and return URL
    const fileName = `conversation-${Date.now()}.mp3`
    // Implementation details for Supabase storage upload
    return `${process.env.AUDIO_STORAGE_URL}/${fileName}`
  }
}
```

**Test**: `npm run test -- --testNamePattern="conversation memory"`  
**Validation**: ✅ Conversations stored, memories extracted, 11Labs integration works

---

# 🔗 **INTEGRATION & POLISH** (Week 5-6)

## **Phase 5: System Integration** (Week 5)

### **Task 5.1: Dashboard Integration** 📋

**Objective**: Integrate all features into main dashboard  
**Time**: 4-5 hours  
**Dependencies**: All previous tasks  
**Risk**: Medium

#### **Implementation**:

```tsx
// src/app/dashboard/page.tsx - Enhanced with new features
import { VoiceSearchModal } from '@/components/search/VoiceSearchModal'
import { ExplanationCard } from '@/components/movies/ExplanationCard'
import { EnhancedRecommendationGrid } from '@/components/movies/EnhancedRecommendationGrid'
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker'

export default function DashboardPage() {
  const [voiceSearchOpen, setVoiceSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const { trackInteraction } = useBehaviorTracker()

  // Enhanced movie recommendations with all features
  const { data: recommendations } = useQuery({
    queryKey: ['enhanced-recommendations'],
    queryFn: () => fetch('/api/movies?behavioral=true&explanations=true').then(r => r.json()),
  })

  const handleVoiceSearchResults = (movies: Movie[], context: any) => {
    setSearchResults({ movies, context })
    setVoiceSearchOpen(false)
  }

  const handleMovieInteraction = (movie: Movie, type: 'browse' | 'preview') => {
    trackInteraction({ movieId: movie.id, type, context: ['dashboard'] })
  }

  return (
    <div className="bg-base-100 min-h-screen">
      {/* Enhanced Header with Voice Search */}
      <div className="navbar bg-base-200">
        <div className="navbar-start">
          <h1 className="text-xl font-bold">CineAI</h1>
        </div>
        <div className="navbar-center">
          <button className="btn btn-circle btn-primary" onClick={() => setVoiceSearchOpen(true)}>
            🎤
          </button>
        </div>
        <div className="navbar-end">{/* User menu */}</div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Voice Search Results */}
        {searchResults && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-bold">Voice Search Results</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {searchResults.movies.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  showExplanation={true}
                  onInteraction={handleMovieInteraction}
                />
              ))}
            </div>
          </section>
        )}

        {/* Personalized Recommendations */}
        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">Recommended for You</h2>
          <EnhancedRecommendationGrid
            recommendations={recommendations?.movies || []}
            showExplanations={true}
            onMovieInteraction={handleMovieInteraction}
          />
        </section>

        {/* Continue Watching (with behavior tracking) */}
        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">Continue Watching</h2>
          {/* Implementation */}
        </section>

        {/* Mood-Based Suggestions */}
        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">Perfect for Right Now</h2>
          {/* Time-aware recommendations */}
        </section>
      </div>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        isOpen={voiceSearchOpen}
        onClose={() => setVoiceSearchOpen(false)}
        onResults={handleVoiceSearchResults}
      />
    </div>
  )
}
```

**Test**: `npm run dev && navigate to /dashboard`  
**Validation**: ✅ All features integrated, UI cohesive, performance good

---

### **Task 5.2: Performance Optimization** 📋

**Objective**: Optimize system performance and caching  
**Time**: 3-4 hours  
**Dependencies**: Task 5.1  
**Risk**: Low

#### **Implementation**:

```typescript
// src/lib/ai/cache-manager.ts
export class CacheManager {
  private static instance: CacheManager
  private cache = new Map<string, { data: any; expires: number }>()
  private readonly TTL = {
    recommendations: 30 * 60 * 1000, // 30 minutes
    explanations: 7 * 24 * 60 * 60 * 1000, // 7 days
    behavioral_patterns: 60 * 60 * 1000, // 1 hour
    voice_responses: 24 * 60 * 60 * 1000, // 24 hours
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  set(key: string, data: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.TTL.recommendations)
    this.cache.set(key, { data, expires })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }
}

// Enhanced services with caching
export class SmartRecommenderV2 {
  private cache = CacheManager.getInstance()

  async getEnhancedRecommendations(
    options: SmartRecommendationOptions
  ): Promise<SmartRecommendationResult> {
    const cacheKey = `recommendations:${options.userId}:${JSON.stringify(options)}`

    // Check cache first
    const cached = this.cache.get<SmartRecommendationResult>(cacheKey)
    if (cached) return cached

    // Generate recommendations
    const recommendations = await this.generateRecommendations(options)

    // Cache results
    this.cache.set(cacheKey, recommendations, this.cache.TTL?.recommendations)

    return recommendations
  }
}
```

**Test**: `npm run test -- --testNamePattern="cache manager"`  
**Validation**: ✅ Caching works, performance improved, memory usage reasonable

---

### **Task 5.3: Error Handling & Resilience** 📋

**Objective**: Add comprehensive error handling and fallbacks  
**Time**: 2-3 hours  
**Dependencies**: Task 5.2  
**Risk**: Low

#### **Implementation**:

```typescript
// src/lib/ai/error-handler.ts
export class AIServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public retryable: boolean = false,
    public fallback?: any
  ) {
    super(message)
    this.name = 'AIServiceError'
  }
}

export class ErrorHandler {
  static async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    service: string
  ): Promise<T> {
    try {
      return await primary()
    } catch (error) {
      logger.warn(`Primary ${service} failed, using fallback`, { error })
      return await fallback()
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries) break

        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }

    throw lastError!
  }
}

// Enhanced services with error handling
export class SmartRecommenderV2 {
  async getEnhancedRecommendations(
    options: SmartRecommendationOptions
  ): Promise<SmartRecommendationResult> {
    return ErrorHandler.withFallback(
      () => this.getFullRecommendations(options),
      () => this.getBasicRecommendations(options),
      'SmartRecommender'
    )
  }

  private async getBasicRecommendations(
    options: SmartRecommendationOptions
  ): Promise<SmartRecommendationResult> {
    // Fallback to simple recommendations without AI
    const movies = await this.getPopularMovies(options.limit)
    return {
      movies,
      insights: { fallbackMode: true },
      query: options.userQuery,
    }
  }
}
```

**Test**: `npm run test -- --testNamePattern="error handling"`  
**Validation**: ✅ Errors handled gracefully, fallbacks work, system resilient

---

## **Phase 6: Testing & Polish** (Week 6)

### **Task 6.1: End-to-End Testing**

**Objective**: Test complete user journeys  
**Time**: 4-5 hours  
**Dependencies**: Task 5.3  
**Risk**: Low

#### **Implementation**:

```typescript
// src/__tests__/integration/personal-companion-e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('Personal Companion Features', () => {
  test('complete voice search journey', async ({ page }) => {
    await page.goto('/dashboard')

    // Open voice search
    await page.click('[data-testid="voice-search-button"]')

    // Mock speech recognition
    await page.evaluate(() => {
      // Mock the voice input
      window.mockVoiceInput('show me action movies like John Wick')
    })

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]')

    // Verify movies displayed
    const movieCards = await page.locator('[data-testid="movie-card"]')
    expect(await movieCards.count()).toBeGreaterThan(0)

    // Verify explanations shown
    const explanations = await page.locator('[data-testid="explanation-card"]')
    expect(await explanations.count()).toBeGreaterThan(0)
  })

  test('behavioral tracking and personalization', async ({ page }) => {
    await page.goto('/dashboard')

    // Browse several movies
    const movieCards = await page.locator('[data-testid="movie-card"]').first()
    await movieCards.hover()

    // Verify tracking API called
    await page.waitForRequest(
      request => request.url().includes('/api/user/behavior') && request.method() === 'POST'
    )

    // Wait for personalization to update
    await page.waitForTimeout(1000)

    // Verify recommendations updated
    await page.reload()
    const newRecommendations = await page.locator('[data-testid="recommendation-grid"]')
    expect(newRecommendations).toBeVisible()
  })

  test('explanation generation and display', async ({ page }) => {
    await page.goto('/dashboard')

    // Click on explanation toggle
    await page.click('[data-testid="show-explanations"]')

    // Wait for explanations to load
    await page.waitForSelector('[data-testid="explanation-card"]')

    // Verify explanation content
    const explanation = await page.locator('[data-testid="explanation-card"]').first()
    expect(await explanation.textContent()).toContain('recommended')
    expect(await explanation.textContent()).toContain('%')
  })
})

// Performance tests
test.describe('Performance', () => {
  test('voice search response time', async ({ page }) => {
    await page.goto('/dashboard')

    const startTime = Date.now()

    // Trigger voice search
    await page.click('[data-testid="voice-search-button"]')
    await page.evaluate(() => {
      window.mockVoiceInput('comedy movies')
    })

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]')

    const responseTime = Date.now() - startTime
    expect(responseTime).toBeLessThan(5000) // Under 5 seconds
  })

  test('recommendation loading time', async ({ page }) => {
    await page.goto('/dashboard')

    const startTime = Date.now()

    // Wait for recommendations to load
    await page.waitForSelector('[data-testid="recommendation-grid"]')

    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Under 3 seconds
  })
})
```

**Test**: `npm run test:e2e`  
**Validation**: ✅ All user journeys work, performance acceptable, edge cases handled

---

### **Task 6.2: Documentation & User Guide**

**Objective**: Create user documentation for new features  
**Time**: 2-3 hours  
**Dependencies**: Task 6.1  
**Risk**: Low

#### **Implementation**:

```markdown
<!-- docs/USER_GUIDE.md -->

# CineAI Personal Companion - User Guide

## 🎬 Welcome to Your AI Movie Companion

CineAI is now your personal movie companion with advanced AI capabilities. This guide covers the three major new features:

### 🧠 **Hyper-Personalized Recommendations**

**What it does**: Learns from everything you do - what you watch, when you watch, how you browse - to give you increasingly better recommendations.

**How to use**:

1. Simply use the app normally - browse, rate, add to watchlist
2. Your preferences are automatically learned and remembered
3. Recommendations get better over time
4. Look for the behavioral insights in your recommendation explanations

**Pro tips**:

- Rate movies honestly - even low ratings help improve recommendations
- Browse during different times of day to get temporal insights
- The system learns your weekend vs weekday preferences

### 💡 **Explainable Recommendations**

**What it does**: Every recommendation comes with a clear explanation of why it was chosen for you.

**How to use**:

1. Look for the confidence percentage and explanation cards on movie recommendations
2. Click on explanations to see detailed reasoning
3. "Because you liked" section shows which of your past favorites influenced this pick
4. Discovery level (Safe/Stretch/Adventure) indicates how familiar vs new the recommendation is

**Understanding the explanations**:

- **Confidence Score**: How sure we are you'll like this (higher = better match)
- **Taste Match**: How well this aligns with your established preferences
- **Discovery Factor**:
  - Safe = Very similar to what you usually like
  - Stretch = Slightly outside your comfort zone but still aligned
  - Adventure = Something completely new to explore

### 🗣️ **Voice-First Conversational Discovery**

**What it does**: Talk naturally to find movies - just like asking a knowledgeable friend.

**How to use**:

1. Click the microphone button on the dashboard
2. Speak naturally: "What should I watch on a rainy Sunday?"
3. Listen to the voice response
4. Browse the visual results on screen

**Great voice commands to try**:

- "Movies like Inception but more emotional"
- "Show me 90s comedies with great acting"
- "What's good for a date night?"
- "I'm feeling nostalgic, surprise me"
- "Action movies but not too violent"
- "Something uplifting after a hard day"

**Voice tips**:

- Speak clearly and naturally
- Include context (time, mood, who you're watching with)
- Be specific about what you want or don't want
- The system remembers your preferences from past searches

## 🔧 **Settings & Customization**

### Behavioral Learning

- **Auto-tracking**: Enabled by default, tracks browsing and viewing patterns
- **Privacy**: All data stays in your account, never shared
- **Reset**: Can clear behavioral data in settings if needed

### Voice Settings

- **Language**: Supports multiple languages (set in browser)
- **Voice Output**: Can be disabled if you prefer silent operation
- **Wake Word**: Currently uses manual activation (button press)

## 🎯 **Getting the Best Experience**

### First Week Tips:

1. **Rate everything**: Even movies you've seen before - this builds your taste profile
2. **Use voice search**: Try different types of queries to train the conversational system
3. **Browse actively**: Hover over movies, read descriptions - all interactions help learning
4. **Try discovery recommendations**: Don't just stick to safe picks - try "Stretch" and "Adventure" recommendations

### Long-term Usage:

- **Seasonal patterns**: The system learns you might prefer different genres in winter vs summer
- **Mood tracking**: Regular voice searches help the system understand your emotional preferences
- **Social context**: Mention if you're watching alone, with family, on a date - this improves contextual recommendations

## 🔍 **Troubleshooting**

### Voice Search Issues:

- **Browser compatibility**: Works best in Chrome/Edge, limited in Firefox/Safari
- **Microphone permissions**: Make sure you've allowed microphone access
- **Background noise**: Find a quiet environment for better recognition
- **Slow responses**: Voice processing may take 3-5 seconds - this is normal

### Recommendation Issues:

- **Not personalized enough**: Rate more movies and use the app for a few days
- **Too repetitive**: Try voice searching for specific moods or genres to expand your profile
- **Explanations unclear**: This improves as the system learns your preferences better

### Performance:

- **Slow loading**: Recommendations are cached for 30 minutes - refresh if needed
- **Voice lag**: First voice search may be slower as the system initializes

## 📊 **Privacy & Data**

Your personal movie data is:

- ✅ Stored securely in your personal account
- ✅ Used only to improve your recommendations
- ✅ Never shared with other users or third parties
- ✅ Can be deleted from your account settings

Voice data is:

- ✅ Processed in real-time and not permanently stored
- ✅ Used only for search processing
- ✅ Never recorded or saved beyond the search session

---

**Questions or feedback?** This is a personal use system, so iterate and improve based on your own usage patterns!
```

**Test**: Review documentation for clarity and completeness  
**Validation**: ✅ Documentation clear, comprehensive, actionable

---

### **Task 6.3: Final Integration Testing & Bug Fixes**

**Objective**: Final system testing and bug fixes  
**Time**: 3-4 hours  
**Dependencies**: Task 6.2  
**Risk**: Low

#### **Implementation**:

```typescript
// Final integration test suite
// src/__tests__/integration/system-integration.test.ts

describe('Complete System Integration', () => {
  let testUser: User
  let testMovies: Movie[]

  beforeEach(async () => {
    // Set up test environment
    testUser = await createTestUser()
    testMovies = await seedTestMovies()
  })

  test('full recommendation pipeline', async () => {
    // 1. User interactions generate behavioral data
    await trackBehavior(testUser.id, testMovies[0].id, 'browse')
    await trackBehavior(testUser.id, testMovies[1].id, 'watch', { completion: 85 })

    // 2. Get enhanced recommendations
    const recommendations = await getEnhancedRecommendations({
      userId: testUser.id,
      includeBehavioral: true,
      explanations: true,
    })

    expect(recommendations.movies).toBeDefined()
    expect(recommendations.movies.length).toBeGreaterThan(0)
    expect(recommendations.movies[0].explanation).toBeDefined()

    // 3. Verify behavioral influence
    expect(recommendations.insights.behavioralFactors).toBeDefined()
  })

  test('voice to recommendation pipeline', async () => {
    // 1. Parse voice query
    const query = 'action movies like John Wick'
    const parsedQuery = await parseConversationalQuery(query, testUser.id)

    expect(parsedQuery.intent).toBe('search')
    expect(parsedQuery.extracted_criteria.similar_to).toContain('John Wick')

    // 2. Execute search
    const results = await executeSmartSearch(parsedQuery, testUser.id)

    expect(results.movies).toBeDefined()
    expect(results.explanations).toBeDefined()

    // 3. Generate voice response
    const voiceResponse = generateVoiceResponse(results, parsedQuery)
    expect(voiceResponse).toContain('found')
  })

  test('explanation generation pipeline', async () => {
    // 1. Get movie recommendation
    const movie = testMovies[0]

    // 2. Generate explanation
    const explanation = await generateExplanation(testUser.id, movie, {
      userHistory: testMovies.slice(1, 4),
      temporalPrefs: {},
      behavioralContext: {},
    })

    expect(explanation.primary_reason).toBeDefined()
    expect(explanation.confidence_score).toBeGreaterThan(0)
    expect(explanation.confidence_score).toBeLessThanOrEqual(100)

    // 3. Verify explanation storage
    const cached = await getCachedExplanation(testUser.id, movie.id)
    expect(cached).toBeDefined()
  })

  test('error handling and fallbacks', async () => {
    // Simulate API failures
    jest.spyOn(anthropic.messages, 'create').mockRejectedValue(new Error('API Error'))

    // Should fall back gracefully
    const recommendations = await getEnhancedRecommendations({
      userId: testUser.id,
      includeBehavioral: true,
    })

    expect(recommendations.movies).toBeDefined()
    expect(recommendations.insights.fallbackMode).toBe(true)
  })

  test('performance benchmarks', async () => {
    const startTime = Date.now()

    // Full recommendation pipeline
    const recommendations = await getEnhancedRecommendations({
      userId: testUser.id,
      includeBehavioral: true,
      explanations: true,
      limit: 10,
    })

    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(5000) // Under 5 seconds
    expect(recommendations.movies.length).toBe(10)
  })
})
```

**Test**: `npm run test:integration`  
**Validation**: ✅ All systems integrated, performance good, no critical bugs

---

# 📋 **FINAL CHECKLIST & DEPLOYMENT**

## **Pre-Deployment Checklist** ✅

### **Database & Infrastructure**

- [ ] All migrations applied successfully
- [ ] Indexes created and optimized
- [ ] RLS policies tested and secure
- [ ] Cleanup functions scheduled
- [ ] Backup strategy in place

### **AI Services**

- [ ] Claude Sonnet 4 integration updated (when available)
- [ ] OpenAI embedding service configured
- [ ] Rate limiting implemented
- [ ] Error handling and fallbacks tested
- [ ] API keys and secrets secure

### **Voice Features**

- [ ] Web Speech API compatibility tested across browsers
- [ ] Microphone permissions handling
- [ ] Voice output working correctly
- [ ] Graceful fallbacks for unsupported browsers
- [ ] Performance optimized

### **User Experience**

- [ ] All UI components responsive
- [ ] Loading states implemented
- [ ] Error messages user-friendly
- [ ] Accessibility standards met
- [ ] Mobile experience optimized

### **Performance**

- [ ] Caching implemented and tested
- [ ] API response times under 3 seconds
- [ ] Database queries optimized
- [ ] Memory usage acceptable
- [ ] Bundle size reasonable

### **Testing**

- [ ] Unit tests passing (90%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests covering critical paths
- [ ] Performance benchmarks met
- [ ] Error scenarios tested

### **Documentation**

- [ ] User guide complete
- [ ] API documentation updated
- [ ] Code comments comprehensive
- [ ] Deployment guide ready
- [ ] Troubleshooting guide available

## **Success Metrics** 📊

### **User Engagement**

- Voice search usage rate
- Explanation interaction rate
- Recommendation click-through rate
- Time spent exploring recommendations
- User retention and return visits

### **System Performance**

- Average recommendation response time < 3 seconds
- Voice search response time < 5 seconds
- 99%+ uptime
- Cache hit rate > 70%
- Error rate < 1%

### **AI Quality**

- Recommendation accuracy improvement over time
- Explanation relevance scores
- Voice query parsing accuracy
- User satisfaction with behavioral personalization

## **Launch Strategy** 🚀

### **Phase 1: Soft Launch** (Week 6)

- Deploy to production
- Enable features for primary user
- Monitor performance and errors
- Collect initial usage data

### **Phase 2: Optimization** (Week 7-8)

- Analyze usage patterns
- Fine-tune algorithms based on real data
- Optimize performance bottlenecks
- Enhance user experience based on feedback

### **Phase 3: Full Personal Use** (Ongoing)

- System fully operational
- Continuous learning and improvement
- Regular model updates
- Feature enhancements based on usage

---

# 🎯 **IMPLEMENTATION TIMELINE SUMMARY**

| Week       | Focus                              | Key Deliverables                     | Risk Level |
| ---------- | ---------------------------------- | ------------------------------------ | ---------- |
| **Week 1** | Foundation & Behavioral Tracking   | Schema, APIs, Frontend hooks         | Low        |
| **Week 2** | Pattern Recognition & Explanations | Analysis engine, Claude integration  | Medium     |
| **Week 3** | Voice & Conversational System      | Voice components, NLP parser         | Medium     |
| **Week 4** | Search Engine & Integration        | Smart search, API endpoints          | Medium     |
| **Week 5** | System Integration & Polish        | Dashboard integration, optimization  | Low        |
| **Week 6** | Testing & Launch                   | E2E tests, documentation, deployment | Low        |

**Total Estimated Time**: 6 weeks  
**Total Development Hours**: ~120-150 hours  
**Success Probability**: High (95%+)

---

**🎬 Ready to transform CineAI into your ultimate personal movie companion!**

The system is designed to learn and grow with your viewing habits, providing increasingly personalized and insightful movie recommendations through advanced AI capabilities, behavioral learning, and natural voice interaction.

---

## 🗂️ Kanban Board – Personal Companion Build

| 📝 To Do                                                                                                                                                                                                                    | 🚧 In Progress                                                                              | ✅ Done                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Nightly preference synthesis (Mem → Insights)<br/>3.2 Memory boost in SmartRecommender<br/>3.3 Dashboard UX: toast + refetch<br/>3.4 Memory-influenced tests & benchmarks<br/>Playwright `window.mockVoiceInput` helper | Voice → STT integration polish (ElevenLabs real API)<br/>Audio playback auto-retry handling | 1.x Interaction tracking schema + API + hook<br/>2.1-2.4 Temporal pattern engine & nightly cron<br/>Explainable recommendations system<br/>Conversational Start + Exchange APIs<br/>Memory extraction + storage<br/>VoiceConversationWidget wiring |

# ✅ SPRINT 1 – Tie-ups & Trust (🚧 IN PROGRESS)

## Task A: Recommender + API wiring ✅ COMPLETE

- [x] Add `includePreferenceInsights` query flag to `/api/movies`
- [x] When flag present, API fetches the 30-day `user_preference_insights` row and injects it into the JSON response
- [x] Pass the data through `SmartRecommenderV2.getEnhancedRecommendations()` so scoring code can read it
- [x] Add boost if a movie's genre is in `top_genres` (+0.1 per matching genre)
- [x] Mark matching movies with `preferenceMatch: true` flag

## Task B: UI polish on dashboard panel ✅ COMPLETE

- [x] Add segmented control (7 / 30 / 90-day) to `BehavioralInsightsPanel`
- [x] Panel re-queries the API on selection change
- [x] Display preference insight badge on movie cards when `preferenceMatch` is true

+# ✅ SPRINT 2 – Voice Pipeline Integration (🚧 IN PROGRESS)

- +## Task A: Voice Widget Integration ✅ COMPLETE
  +- [x] Add `VoiceConversationWidget` to dashboard page (compact mode)
  +- [x] Add `VoiceConversationWidget` to movies page header (desktop only)
  +- [x] Updated env.example with ElevenLabs configuration variables
  +- [x] Verified PCMPlayer audio component exists and functional
- +## Task B: ElevenLabs API Integration 🚧 NEXT
  +- [ ] Set up ElevenLabs API keys and agent configuration
  +- [ ] Test WebSocket connection with signed URL endpoint
  +- [ ] Verify real-time speech-to-text functionality
  +- [ ] Test audio playback of AI responses
  +- [ ] Integration with conversation memory system

  +## 🧪 Voice Pipeline Testing Guide

- +### Local Testing (without ElevenLabs API)
  +1. **Voice Search Modal** (uses Web Speech API)
- - Go to `/search` page
- - Click the microphone icon
- - Grant microphone permissions
- - Say: "Show me action movies from 2020"
- - Should see parsed query and movie results
- +2. **Voice Conversation Widget** (fallback mode)
- - Visit dashboard or movies page
- - Click voice widget button
- - Should open conversation modal with microphone
- - Test basic recording → transcription flow
- +### Full ElevenLabs Testing (requires API keys)
  +1. **Environment Setup**
- ```bash

  ```
- # Add to .env.local
- ELEVEN_CONVAI_API_KEY=your_api_key_here
- ELEVEN_AGENT_ID=your_agent_id_here
- NEXT_PUBLIC_ENABLE_ELEVENLABS=true
- ```

  ```
- +2. **Real-time Voice Chat**
- - Visit dashboard → click voice widget
- - Should connect to ElevenLabs WebSocket
- - Speak naturally about movies
- - Should hear AI voice responses in real-time
- - Check network tab for WebSocket connection
- +3. **Memory Extraction**
- - During voice conversation, mention preferences
- - Check `conversational_memory` table for extracted data
- - Verify preferences show up in insights panel

+# ✅ SPRINT 3 – UX POLISH (NEXT)

- +### Goal
  +Bring the front-end to "delightful" level: smooth skeletons, polished voice widget, full a11y pass.
- +| Task | Owner | Est | Notes |
  +|------|-------|-----|-------|
  +| **3.A** Global loading provider & skeleton variants | FE | 3h | Suspense wrapper, fade-in.
  +| **3.B** VoiceConversationWidget UX | FE | 4h | Permission snackbar, waveform, auto-scroll, long-press to cancel TTS.
  +| **3.C** Accessibility pass | FE | 2h | Run axe-playwright → fix contrast, aria-labels.
  +| **3.D** Minor responsive tweaks | FE | 1h | Ensure mobile modal & grid breakpoints.
-
- +# ✅ SPRINT 4 – ACCURACY & META-WEIGHTS
- +### Goal
  +Introduce runtime-tunable weight config + optional lightweight regression fitter.
- +| Task | Owner | Est | Notes |
  +|------|-------|-----|-------|
  +| **4.A** ENV-tunable weight config | BE | 3h | JSON config, 5-min cache, fallback defaults.
  +| **4.B** Update scoring logic to use weights | BE | 2h | Semantic/rating/popularity/recency balance.
  +| **4.C** Manual tuning API endpoint | BE | 2h | GET/POST `/api/admin/tune-weights` for runtime adjustment.
  +| **4.D** Optional: Ridge regression script | BE | 4h | Auto-fit based on user interaction patterns.
- ++**✅ SPRINT 4 COMPLETED** 🎉
  +- Runtime-tunable weight configuration with JSON config file ✅
  +- Smart recommender now uses configurable weights with 5-min cache ✅
- +# ✅ SPRINT 6 – LIGHT OBSERVABILITY (OPTIONAL)
- +| Task | Owner | Est | Notes |
  +|------|-------|-----|-------|
  +| **6.A** `/api/healthz` (cache stats, last-TMDB-fetch) | BE | 1h |
  +| **6.B** Slow query log → console | BE | 1h |
  +| **6.C** Decide on Prometheus/Slack later | — | — |
-
-
