# CineAI Improvement Plan

*Goal: Build the best personalized self-hosted movie recommender*

**Guiding Principles:**
- Recommendation quality over features
- Simplicity over complexity
- Performance over scalability
- Privacy and self-hosting first
- No monetization, no tracking, no analytics

---

## Current State Summary

| Area | Status | Priority Action |
|------|--------|-----------------|
| Recommendation Engine | Good (B+) | Complete memory service |
| API Routes | Bloated (52 routes) | Consolidate to ~15 |
| Database Migrations | Chaotic (36 files) | Squash to 3 |
| Type Safety | Mixed | Remove `any` types |
| Caching | Missing | Add server-side cache |
| Chat Persistence | Broken | Fix message saving |

---

## Phase 1: Database Cleanup (Day 1)

### 1.1 Consolidate Migrations

**Current State:** 36 migration files with iterative fixes
**Target State:** 3 clean migration files

```
supabase/migrations/
├── 001_core_schema.sql        # Users, movies, ratings, watchlist
├── 002_ai_features.sql        # Chat, behavior signals, memory
└── 003_indexes_and_rls.sql    # Performance indexes, RLS policies
```

**Action Items:**
- [ ] Export current production schema as baseline
- [ ] Create `001_core_schema.sql` with essential tables
- [ ] Create `002_ai_features.sql` with AI-related tables
- [ ] Create `003_indexes_and_rls.sql` with all indexes and policies
- [ ] Test migration on fresh database
- [ ] Archive old migrations to `supabase/migrations/archive/`

### 1.2 Schema Optimization

**Tables to Keep:**
```sql
-- Core
users (via auth.users)
user_profiles
movies
ratings
watchlist

-- AI Features
chat_sessions
user_behavior_signals
user_interactions

-- Can Remove (if not used)
recommendation_queue      -- If not using background jobs
preference_insights       -- If computed on-the-fly
```

---

## Phase 2: API Consolidation (Day 2-3)

### 2.1 Current API Audit

**52 routes → Target: ~15 routes**

| Current | Keep/Merge | Notes |
|---------|------------|-------|
| `/api/movies/route.ts` | Keep | Main movies endpoint |
| `/api/movies/[id]/route.ts` | Keep | Single movie |
| `/api/movies/details/[id]/route.ts` | Merge into [id] | Duplicate |
| `/api/movies/search/route.ts` | Keep | Search |
| `/api/movies/add/route.ts` | Merge into POST /movies | Duplicate |
| `/api/movies/autocomplete/route.ts` | Keep | Different purpose |
| `/api/movies/emotional/route.ts` | Remove | Unused |
| `/api/movies/explanations/route.ts` | Merge into recommendations | |
| `/api/movies/genres/route.ts` | Keep | Simple utility |
| `/api/movies/thematic/route.ts` | Remove | Unused |
| `/api/movies/style/route.ts` | Remove | Unused |
| `/api/movies/refresh/route.ts` | Keep | TMDB sync |
| `/api/movies/similar/route.ts` | Keep | Core feature |
| `/api/ai/chat/route.ts` | Keep | Chat interface |
| `/api/ai/recommendations/route.ts` | Keep | AI recommendations |
| `/api/recommendations/hyper-personalized/route.ts` | Merge into /ai/recommendations | |
| `/api/recommendations/precomputed/route.ts` | Remove | Not needed for single user |
| `/api/recommendations/recent/route.ts` | Merge | |
| `/api/recommendations/semantic/route.ts` | Merge | |
| `/api/ratings/route.ts` | Keep | Core |
| `/api/watchlist/route.ts` | Keep | Core |
| `/api/user/profile/route.ts` | Keep | Core |
| `/api/user/preferences/route.ts` | Merge into profile | |
| `/api/user/ai-settings/route.ts` | Merge into profile | |
| `/api/user/ai-profile/route.ts` | Remove | Unused |
| `/api/user/ai-insights/route.ts` | Remove | |
| `/api/user/interactions/route.ts` | Keep | Behavior tracking |
| `/api/health/route.ts` | Keep | Self-hosting essential |
| `/api/auth/*` | Keep auth routes | |
| `/api/test/*` | Remove all | Development only |
| `/api/query/intelligence/route.ts` | Remove | Unused |
| `/api/conversations/*` | Remove | Redundant with chat |
| `/api/preferences/*` | Merge into user/profile | |
| `/api/analytics/*` | Remove | No analytics needed |

### 2.2 Target API Structure

```
src/app/api/
├── auth/
│   ├── login/route.ts
│   └── logout/route.ts
├── movies/
│   ├── route.ts              # GET (list), POST (add from TMDB)
│   ├── [id]/route.ts         # GET (details + similar)
│   ├── search/route.ts       # GET (search TMDB)
│   └── autocomplete/route.ts # GET (quick search)
├── ai/
│   ├── chat/route.ts         # POST (chat with AI)
│   └── recommend/route.ts    # GET (all recommendation types)
├── user/
│   ├── profile/route.ts      # GET/PATCH (profile + preferences + settings)
│   └── behavior/route.ts     # POST (track interactions)
├── ratings/route.ts          # GET/POST/PATCH/DELETE
├── watchlist/
│   ├── route.ts              # GET/POST
│   └── [id]/route.ts         # PATCH/DELETE
└── health/route.ts           # GET (system health)
```

### 2.3 Remove Handler Files

```
src/app/api/movies/handlers/  # Delete entire directory
├── advanced-intelligence-handler.ts  # Unused
├── behavioral-recommendations.ts     # Merge logic into engine
├── legacy-handler.ts                 # Remove
├── realtime-handler.ts               # Remove
├── smart-recommendations.ts          # Merge logic into engine
└── index.ts
```

---

## Phase 3: Recommendation Engine Enhancement (Day 4-5)

### 3.1 Fix UserMemoryService

**Current Problem:** Genre preferences not properly calculated

**File:** `src/lib/services/user-memory-service.ts`

```typescript
// Current (broken):
genreWeights.set('general', ...)

// Fixed:
async calculateGenreWeights(ratings, behavior): Promise<Map<string, number>> {
  const genreWeights = new Map<string, number>()

  // Get all movie IDs from ratings
  const movieIds = ratings.map(r => r.movie_id)

  // Fetch movies with genres
  const { data: movies } = await supabase
    .from('movies')
    .select('id, genre')
    .in('id', movieIds)

  // Calculate weighted genre preferences
  for (const rating of ratings) {
    const movie = movies?.find(m => m.id === rating.movie_id)
    if (!movie?.genre) continue

    const weight = this.calculateDecayedWeight(
      rating.rated_at,
      (rating.rating || 3) / 5.0
    )

    for (const genre of movie.genre) {
      genreWeights.set(genre, (genreWeights.get(genre) || 0) + weight)
    }
  }

  return this.normalizeWeights(genreWeights)
}
```

### 3.2 Fix Chat Message Persistence

**Current Problem:** Messages not saved to database

**File:** `src/app/api/ai/chat/route.ts`

Add method to `ChatSessionService`:
```typescript
async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
  const { data: session } = await this.supabase
    .from('chat_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single()

  const messages = [...(session?.messages || []), message]

  await this.supabase
    .from('chat_sessions')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}
```

### 3.3 Enhance Scoring Algorithm

**Current Weights:**
```typescript
behavioral_weight: 0.4
temporal_weight: 0.2
exploration_weight: 0.15
quality_threshold_weight: 0.15
recency_weight: 0.1
```

**Proposed Enhancement - Add Director/Actor Affinity:**
```typescript
// Enhanced scoring in hyper-personalized-engine.ts
calculatePersonalizationScore(movie, profile, factors) {
  const scores = {
    genre_affinity: this.calculateGenreAffinity(movie, profile),        // Existing
    director_affinity: this.calculateDirectorAffinity(movie, profile),  // Existing
    actor_affinity: this.calculateActorAffinity(movie, profile),        // NEW
    quality_prediction: this.predictQualityScore(movie, profile),       // Existing
    temporal_fit: this.calculateTemporalFit(movie, profile),            // Existing
    exploration_bonus: this.calculateExplorationBonus(movie, profile),  // Existing
    freshness_score: this.calculateFreshnessScore(movie),               // NEW
  }
}

// New: Actor affinity based on cast the user likes
calculateActorAffinity(movie: Movie, profile: UserBehaviorProfile): number {
  if (!movie.cast || movie.cast.length === 0) return 0.5

  let totalAffinity = 0
  let actorCount = 0

  for (const actor of movie.cast.slice(0, 5)) { // Top 5 billed actors
    const avgRating = profile.rating_patterns.actor_rating_averages?.get(actor)
    if (avgRating !== undefined) {
      totalAffinity += (avgRating - 1) / 4
      actorCount++
    }
  }

  return actorCount > 0 ? totalAffinity / actorCount : 0.5
}

// New: Prefer newer releases slightly
calculateFreshnessScore(movie: Movie): number {
  if (!movie.year) return 0.5
  const currentYear = new Date().getFullYear()
  const age = currentYear - movie.year

  if (age <= 2) return 0.9   // Very recent
  if (age <= 5) return 0.7   // Recent
  if (age <= 10) return 0.5  // Modern
  if (age <= 20) return 0.4  // Classic
  return 0.3                  // Older
}
```

### 3.4 Add "Why This Recommendation" Feature

Enhance explanation generation in `hyper-personalized-engine.ts`:

```typescript
generateExplanation(movie: Movie, scores: Scores, profile: Profile): string {
  const reasons: string[] = []

  // Genre match
  if (scores.genre_affinity > 0.6) {
    const matchedGenres = movie.genre?.filter(g =>
      profile.rating_patterns.genre_rating_averages.get(g) >= 4
    )
    if (matchedGenres?.length) {
      reasons.push(`You've rated ${matchedGenres[0]} movies highly`)
    }
  }

  // Director match
  if (scores.director_affinity > 0.6 && movie.director?.[0]) {
    reasons.push(`You enjoyed other films by ${movie.director[0]}`)
  }

  // Actor match
  if (scores.actor_affinity > 0.6 && movie.cast?.[0]) {
    reasons.push(`Features ${movie.cast[0]}, whose work you've liked`)
  }

  // Quality match
  if (scores.quality_prediction > 0.7 && movie.rating) {
    reasons.push(`Highly rated (${movie.rating}/10) matching your standards`)
  }

  // Exploration
  if (scores.exploration_bonus > 0.5) {
    reasons.push(`Something different to expand your tastes`)
  }

  return reasons.slice(0, 2).join(' and ') ||
    `Recommended based on your viewing history`
}
```

---

## Phase 4: Type Safety Cleanup (Day 6)

### 4.1 Replace `any` Types

**Files to fix:**
```
src/hooks/useMovieActions.ts:8          → MovieInsights type
src/hooks/useWatchlistPage.ts           → Proper action types
src/lib/services/user-memory-service.ts → Recommendation type
src/components/dashboard/*.tsx          → Props types
```

**Create missing types:**
```typescript
// src/types/ai.ts
export interface MovieInsights {
  whyRecommended: string[]
  similarTo: string[]
  themes: string[]
  mood: string
  watchContext: string
}

export interface ScoredRecommendation {
  movie: Movie
  score: number
  confidence: number
  explanation: string
  factors: {
    genreAffinity: number
    directorAffinity: number
    actorAffinity: number
    qualityPrediction: number
    explorationBonus: number
  }
}
```

### 4.2 Strict TypeScript Config

Already enabled, but ensure:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

## Phase 5: Performance Optimization (Day 7)

### 5.1 Add Server-Side Caching

**Option A: In-Memory Cache (Simple)**
```typescript
// src/lib/cache/memory-cache.ts
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>()

  set(key: string, data: any, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    return item.data as T
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new MemoryCache()
```

**Usage in recommendation engine:**
```typescript
async generateRecommendations(userId: string, options: Options) {
  const cacheKey = `recs:${userId}:${JSON.stringify(options)}`

  // Check cache first
  const cached = cache.get<HyperPersonalizedRecommendation[]>(cacheKey)
  if (cached) {
    logger.info('Returning cached recommendations')
    return cached
  }

  // Generate fresh recommendations
  const recommendations = await this.computeRecommendations(userId, options)

  // Cache for 5 minutes
  cache.set(cacheKey, recommendations, 300)

  return recommendations
}
```

### 5.2 Optimize Database Queries

**Current:** Multiple queries for user memory
**Optimized:** Single query with joins (already in UserMemoryService, ensure it's used everywhere)

**Add indexes for common queries:**
```sql
-- Already have some, verify these exist:
CREATE INDEX IF NOT EXISTS idx_ratings_user_movie ON ratings(user_id, movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_watched ON watchlist(user_id, watched);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_user_recent
  ON user_behavior_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movies_rating_desc ON movies(rating DESC);
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies USING GIN(genre);
```

### 5.3 Reduce Candidate Pool Processing

**Current:** 200 candidates scored individually
**Optimization:** Two-stage filtering

```typescript
async getCandidateMovies(userId: string, excludeWatched: boolean) {
  // Stage 1: Quick filter (database level)
  const candidates = await this.getQuickFilteredCandidates(userId, 100)

  // Stage 2: Only score the top candidates
  return candidates
}

private async getQuickFilteredCandidates(userId: string, limit: number) {
  const memory = await memoryService.getUnifiedMemory(userId)
  const topGenres = Array.from(memory.genrePreferences.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre)

  // Query movies matching user's top genres
  const { data: movies } = await supabase
    .from('movies')
    .select('*')
    .contains('genre', topGenres)
    .gte('rating', memory.qualityThreshold)
    .order('rating', { ascending: false })
    .limit(limit)

  return movies || []
}
```

---

## Phase 6: Code Cleanup (Day 8)

### 6.1 Remove Dead Code

**Files to delete:**
```
src/app/api/movies/handlers/          # Entire directory
src/app/api/test/                     # Entire directory
src/app/api/analytics/                # Entire directory
src/app/api/query/                    # Entire directory
src/app/api/conversations/            # Redundant with chat
src/app/api/movies/emotional/         # Unused
src/app/api/movies/thematic/          # Unused
src/app/api/movies/style/             # Unused
src/app/api/recommendations/precomputed/  # Not needed
src/app/api/user/ai-profile/          # Unused
src/app/api/user/ai-insights/         # Unused
```

### 6.2 Consolidate Services

**Current:** 16 service files
**Target:** 8 focused services

```
src/lib/services/
├── ai-service.ts              # Keep (main AI orchestration)
├── movie-service.ts           # Keep (TMDB + local movies)
├── user-memory-service.ts     # Keep (user context)
├── recommendation-service.ts  # Merge semantic + others into this
├── chat-session-service.ts    # Keep
├── watchlist-service.ts       # Keep
├── rating-service.ts          # NEW: Extract from routes
└── cache-service.ts           # NEW: Centralized caching

# Remove/Merge:
├── embedding-service.ts       # Merge into recommendation if used
├── message-validation-service.ts  # Move to utils
├── preference-extraction-service.ts  # Merge into chat
├── preference-service.ts      # Merge into user-memory
├── semantic-recommendations.ts  # Merge into recommendation
├── session-service.ts         # Merge into chat-session
├── streaming-response-handler.ts  # Move to utils
├── non-streaming-response-handler.ts  # Remove, inline in route
└── user-profile-service.ts    # Merge into user-memory
```

### 6.3 Component Cleanup

**Split large components:**
```
HyperPersonalizedSection.tsx (390 lines) →
├── HyperPersonalizedSection.tsx (main, ~100 lines)
├── HyperPersonalizedSettings.tsx (settings panel, ~100 lines)
├── HyperPersonalizedGrid.tsx (movie grid, ~80 lines)
└── HyperPersonalizedSkeleton.tsx (loading state, ~60 lines)
```

---

## Phase 7: Self-Hosting Enhancements (Day 9)

### 7.1 Improve Setup Experience

**Enhance setup script:**
```bash
# scripts/setup.sh
#!/bin/bash

echo "🎬 CineAI Self-Hosted Setup"
echo "=========================="

# Check prerequisites
check_node() { ... }
check_env() { ... }

# Guided setup
if [ ! -f .env.local ]; then
  echo "Creating .env.local..."
  cp .env.example .env.local
  echo "Please edit .env.local with your API keys"
  exit 1
fi

# Validate keys
validate_tmdb_key() { ... }
validate_openai_key() { ... }
validate_supabase() { ... }

# Run migrations
npm run db:migrate

# Sync initial movies
npm run sync:movies

echo "✅ Setup complete! Run 'npm run dev' to start"
```

### 7.2 Add Data Export/Import

```typescript
// scripts/export-data.ts
// Export all user data for backup/migration

// scripts/import-data.ts
// Import data from backup
```

### 7.3 Docker Compose for Full Self-Hosting

```yaml
# docker-compose.yml
version: '3.8'
services:
  cineai:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - supabase

  supabase:
    image: supabase/postgres:15
    # ... Supabase self-hosted config
```

---

## Implementation Timeline

| Phase | Days | Focus | Priority |
|-------|------|-------|----------|
| 1. Database Cleanup | 1 | Migrations, schema | High |
| 2. API Consolidation | 2 | Routes, handlers | High |
| 3. Recommendation Engine | 2 | Memory, scoring | Critical |
| 4. Type Safety | 1 | Remove `any`, strict types | Medium |
| 5. Performance | 1 | Caching, query optimization | Medium |
| 6. Code Cleanup | 1 | Dead code, consolidation | Medium |
| 7. Self-Hosting | 1 | Setup, Docker, export | Low |

**Total: ~9 days of focused work**

---

## Success Metrics

Since this is a personal project without analytics, success is measured by:

1. **Recommendation Quality**
   - Do I actually want to watch the recommended movies?
   - Are recommendations diverse (not all same genre)?
   - Does the system learn my preferences over time?

2. **Performance**
   - Dashboard loads in < 2 seconds
   - Recommendations generate in < 3 seconds
   - Search is instant (< 500ms)

3. **Simplicity**
   - Can I understand any part of the code quickly?
   - Is adding a new feature straightforward?
   - Are there clear patterns to follow?

4. **Reliability**
   - Does it work offline (local mode)?
   - Does it recover gracefully from API failures?
   - Is data never lost?

---

## Files Changed Summary

After all phases, the codebase will be:

```
Before:
- 52 API routes
- 36 migration files
- 16 service files
- ~15,000 lines of TypeScript

After:
- ~15 API routes (-70%)
- 3 migration files (-92%)
- 8 service files (-50%)
- ~10,000 lines of TypeScript (-33%)
```

---

## Next Steps

1. Review this plan
2. Approve or modify phases
3. Start with Phase 1 (Database Cleanup)
4. Commit after each phase completes

Ready to begin when you are.
