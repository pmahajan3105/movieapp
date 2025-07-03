# Moving Recommendation Generation “Offline”

Design | Implementation | Best-Practice Guide  
CineAI Movie Recommendation App

---

## 1 Problem Statement

Today the `UnifiedAIService` runs inside API routes (or even React Server Components) and makes multiple Claude/LLM calls at request time for sophisticated AI analysis including thematic profiling, emotional journey mapping, cinematic style analysis, and conversational query processing.

Resulting pain points:

1. **User-visible latency** – Up to 5-8s on first page load while deep AI analysis (thematic, emotional, style) finishes.
2. **Bursty token spend** – Peak traffic → peak Anthropic bill for complex multi-pass analysis.
3. **Limited algorithm depth** – We avoid comprehensive thematic analysis or cinematic style comparison because they would make requests timeout.
4. **Inefficient recomputation** – The same movie's thematic profile or style analysis can be computed repeatedly across sessions.
5. **Underutilized AI capabilities** – Rich features like emotional journey mapping and conversational query understanding are limited by real-time constraints.

---

## 2 Goal / Success Criteria

• Page requests must become DB-only (≤ 200 ms).  
• AI pipelines may run minutes or hours before they’re needed.  
• System scales linearly with users, not page views.  
• We preserve the ability to refresh quickly after the user takes an action (rating, watch-list add).

---

## 3 Solution Overview

1. **Move heavy work to background jobs** (cron or event-driven Edge Functions).
2. **Persist results** in `recommendations` (already in schema) and specialised analysis tables.
3. **Serve UI** by reading pre-computed rows; fall back to real-time generation only if nothing exists.
4. **Trigger refresh** when user behaviour changes (ratings, preferences).

---

## 4 High-Level Architecture

```text
                ┌────────────┐
  user action ──►   RLS DB    ──► TRIGGER (ratings insert) ┐
                └────────────┘                             │queue
                                                           ▼
              nightly/hourly cron   ┌─────────────────────────────────────┐
              -------------------->│ Advanced AI Processing Pipeline     │
                                  │ ┌─────────────────────────────────┐ │
                                  │ │ CinematicStyleAnalyzer          │ │
                                  │ │ ThematicAnalysisEngine          │ │
                                  │ │ EmotionalJourneyMapper          │ │
                                  │ │ ConversationalParser (cache)    │ │
                                  │ └─────────────────────────────────┘ │
                                  │ Smart Recommendation Generation     │
                                  └─────────────────────────────────────┘
                                                         │ upsert
                                                         ▼
              ┌──────────────────────────────────────────────────────────────┐
GET /dashboard│ recommendations (user_id, movie_id, score, reason)           │
──────────────┤ movie_cinematic_styles (style analysis cache)               │
              │ movie_thematic_profiles (psychological themes)               │
              │ movie_emotional_journeys (emotional patterns)               │
              │ conversational_query_cache (smart query understanding)      │
              └──────────────────────────────────────────────────────────────┘
```

---

## 5 Implementation Steps

### 5.1 Schema Enhancements

```sql
-- Enhanced recommendations table
alter table recommendations
  add column if not exists last_generated_at timestamptz,
  add column if not exists status text default 'ready',
  add column if not exists algorithm_used text default 'hybrid',
  add column if not exists thematic_factors jsonb,
  add column if not exists style_similarity_score float,
  add column if not exists emotional_alignment_score float;

-- AI Services tables (already created in migration)
-- movie_cinematic_styles: stores style analysis cache
-- movie_thematic_profiles: stores psychological theme analysis
-- movie_emotional_journeys: stores emotional pattern data
-- conversational_query_cache: caches advanced query understanding
-- ai_service_health: monitors AI service performance
```

Optional: small `rec_refresh_queue(user_id uuid primary key, queued_at timestamptz)` if you prefer queue table over NOTIFY.

### 5.2 Server-Side Helper

`src/jobs/generateRecommendations.ts`

```ts
import {
  getRecommendations,
  getThematicAnalysis,
  getEmotionalAnalysis,
  getStyleAnalysis,
} from '@/lib/ai/unified-ai-service'
import { CinematicStyleAnalyzer } from '@/lib/ai/cinematic-style-analyzer'
import { ThematicAnalysisEngine } from '@/lib/ai/thematic-analysis-engine'
import { EmotionalJourneyMapper } from '@/lib/ai/emotional-journey-mapper'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateForUser(userId: string, limit = 50) {
  // Phase 1: Get enhanced recommendations with full AI analysis
  const result = await getRecommendations({
    userId,
    context: {
      limit,
      includeExplanations: true,
      diversityFactor: 0.4,
    },
    algorithm: 'hybrid',
  })

  // Phase 2: Pre-compute advanced AI analysis for each movie
  const enhancedRows = await Promise.all(
    result.movies.map(async (movie, i) => {
      try {
        // Run advanced analysis in parallel
        const [thematicProfile, emotionalJourney, styleAnalysis] = await Promise.allSettled([
          getThematicAnalysis(movie.id, 'standard'),
          getEmotionalAnalysis(movie.id),
          getStyleAnalysis(movie.id, ['cinematography', 'editing']),
        ])

        const explanation = result.explanations?.get(movie.id)

        return {
          user_id: userId,
          movie_id: movie.id,
          score: result.insights?.confidence ?? 0.8,
          reason: explanation?.primary_reason ?? 'AI-powered analysis',
          algorithm_used: result.algorithm,
          thematic_factors:
            thematicProfile.status === 'fulfilled'
              ? {
                  themes: thematicProfile.value.themes,
                  complexity_score: thematicProfile.value.complexity_score,
                  cultural_context: thematicProfile.value.cultural_context,
                }
              : null,
          emotional_alignment_score:
            emotionalJourney.status === 'fulfilled'
              ? emotionalJourney.value.overall_emotional_intensity
              : 0.7,
          style_similarity_score:
            styleAnalysis.status === 'fulfilled' ? styleAnalysis.value.overall_style_score : 0.7,
          last_generated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      } catch (error) {
        // Fallback for individual movie analysis failure
        return {
          user_id: userId,
          movie_id: movie.id,
          score: result.insights?.confidence ?? 0.7,
          reason: 'Standard recommendation',
          algorithm_used: result.algorithm,
          last_generated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      }
    })
  )

  // Phase 3: Batch upsert all recommendations
  await supabase.from('recommendations').upsert(enhancedRows, { onConflict: 'user_id,movie_id' })

  return enhancedRows.length
}

// Separate function for movie-level analysis pre-computation
export async function preComputeMovieAnalysis(movieIds: string[]) {
  const styleAnalyzer = CinematicStyleAnalyzer.getInstance()
  const thematicEngine = ThematicAnalysisEngine.getInstance()
  const emotionalMapper = EmotionalJourneyMapper.getInstance()

  for (const movieId of movieIds) {
    try {
      // Run comprehensive analysis and cache results
      await Promise.allSettled([
        styleAnalyzer.analyzeStyle({
          movieId,
          analysisDepth: 'detailed',
          focusAreas: ['cinematography', 'editing', 'sound', 'production_design'],
        }),
        thematicEngine.analyzeMovie({ movieId, analysisDepth: 'comprehensive' }),
        emotionalMapper.analyzeEmotionalJourney({
          userId: 'system',
          movieId,
          depth: 'detailed',
        }),
      ])
    } catch (error) {
      console.warn(`Analysis failed for movie ${movieId}:`, error)
    }
  }
}
```

### 5.3 Edge Function (Supabase)

`supabase/functions/recommendation-job/index.ts`

```ts
import { serve } from 'std/server'
import { generateForUser } from '@/jobs/generateRecommendations'

serve(async req => {
  const { userId } = await req.json()
  if (!userId) return new Response('Bad Request', { status: 400 })

  try {
    await generateForUser(userId)
    return new Response('ok')
  } catch (e) {
    return new Response(`Error ${e}`, { status: 500 })
  }
})
```

Schedule it:

```bash
supabase functions deploy recommendation-job --project-ref movie
supabase functions schedule recommendation-job --schedule "0 * * * *"   # hourly
```

### 5.4 Queue & Event Triggers

```sql
create or replace function enqueue_rec_refresh() returns trigger as $$
begin
  insert into rec_refresh_queue values (new.user_id, now())
  on conflict (user_id) do update set queued_at = now();
  return new;
end;
$$ language plpgsql;

create trigger ratings_refresh
after insert or update on ratings
for each row execute function enqueue_rec_refresh();
```

A lightweight “queue-drain” edge function runs every 5 min, pops N user_ids and calls `generateForUser`.

### 5.6 Advanced AI Processing Pipeline

```ts
// supabase/functions/ai-analysis-pipeline/index.ts
import { serve } from 'std/server'
import { preComputeMovieAnalysis } from '@/jobs/generateRecommendations'
import { ConversationalParser } from '@/lib/ai/conversational-parser'

serve(async req => {
  const { operation, data } = await req.json()

  switch (operation) {
    case 'movie-analysis':
      // Pre-compute thematic, emotional, and style analysis for popular movies
      const movieIds = data.movieIds || (await getPopularMovieIds())
      await preComputeMovieAnalysis(movieIds)
      break

    case 'query-cache-warmup':
      // Pre-process common conversational queries for instant responses
      const parser = ConversationalParser.getInstance()
      const commonQueries = [
        'movies like inception but more emotional',
        'something uplifting for a rainy day',
        'dark psychological thrillers with great cinematography',
      ]

      for (const query of commonQueries) {
        await parser.parseAdvancedQuery(query, 'system')
      }
      break
  }

  return new Response('Pipeline completed')
})
```

Schedule multiple pipelines:

```bash
# Movie analysis pipeline (daily)
supabase functions schedule ai-analysis-pipeline --schedule "0 2 * * *"

# Query cache warmup (hourly)
supabase functions schedule ai-analysis-pipeline --schedule "0 * * * *"
```

### 5.7 Enhanced Frontend with AI Analysis

```ts
// Enhanced recommendations with AI analysis data
const { data: recs } = await supabase
  .from('recommendations')
  .select(
    `
    score, reason, algorithm_used, 
    thematic_factors, emotional_alignment_score, style_similarity_score,
    movies (*)
  `
  )
  .eq('user_id', user.id)
  .order('score', { ascending: false })
  .limit(20)

// Fast thematic search using pre-computed data
const { data: thematicRecs } = await supabase
  .from('movie_thematic_profiles')
  .select('movie_id, themes, complexity_score, movies (*)')
  .contains('themes', ['psychological_thriller'])
  .gte('complexity_score', 0.7)
  .limit(10)

// Style-based instant recommendations
const { data: styleRecs } = await supabase
  .from('movie_cinematic_styles')
  .select('movie_id, overall_style_score, cinematography, movies (*)')
  .eq('cinematography->style_category', 'neo_noir')
  .gte('overall_style_score', 0.8)
  .limit(10)

// Fallback only if no pre-computed data exists
if (recs.length === 0) {
  await fetch('/api/recommendations?algorithm=hybrid&includeExplanations=true')
}
```

---

## 6 Operational Considerations

| Topic                        | Recommendation                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Service Monitoring**    | Monitor `ai_service_health` table. Alert if any AI service fails. Track analysis cache hit rates.                                           |
| **Recommendation Freshness** | Add row count / age checks to `production-monitor.ts`. Alert if `last_generated_at` > 6 h.                                                  |
| **Rate limits**              | Batch AI calls: 25 users per minute × 10 movies each ≈ 250 Claude calls/hour → within free tier. Advanced analysis adds ~50% overhead.      |
| **AI Analysis Caching**      | Monitor cache hit rates for thematic (target: >80%), emotional (>75%), and style analysis (>85%).                                           |
| **Scaling up**               | Increase cron frequency or spin multiple workers; use `status = "in_progress"` lock flag to avoid duplicates. Separate AI analysis workers. |
| **Cold start**               | Run a one-time script that iterates all existing users + pre-computes analysis for top 1000 movies.                                         |
| **Data retention**           | Keep only top-200 recommendations per user. Cache AI analysis for 90 days (high compute cost). Purge old query cache weekly.                |
| **Performance Metrics**      | Track: recommendation generation time, AI analysis cache hits, query understanding accuracy, user satisfaction scores.                      |

---

## 7 Pros & Cons

| Pros                              | Cons / Mitigations                                                   |
| --------------------------------- | -------------------------------------------------------------------- |
| Sub-100 ms UI responses           | Recommendations can be up to 1 h “old”. Adjustable via cron interval |
| Predictable LLM spend             | Slightly higher complexity (jobs, queues)                            |
| Allows deeper models / embeddings | Extra storage for recommendation rows                                |
| Works offline (mobile)            | Need fall-back path for new users (handled)                          |

---

## 8 Future Enhancements

1. **Vector similarity pre-selection** – Store `storyline_embedding` and use pgvector to shortlist candidates before Claude scoring.
2. **Realtime micro-refresh** – For “You liked _Inception_” show 3 instant picks by local similarity while full job runs.
3. **A/B rotate algorithms** – Persist `algorithm` used in each row for analytics.
4. **Edge-cached JSON** – Convert recommendations to static JSON files on edge CDN for fully serverless read path.

---

### TL;DR

Move `UnifiedAIService.getRecommendations()` into an hourly Supabase Edge Function (plus a ratings-triggered micro-queue), store the outcome in `recommendations`, read that table in the UI, and keep the existing API route only as an initial fallback.  
This architecture delivers:

- **Instant responses** (<100ms) with sophisticated AI insights
- **Rich personalization** using deep thematic and style analysis
- **Smart query understanding** through cached conversational parsing
- **Cost optimization** by pre-computing expensive AI analysis
- **Scalable intelligence** supporting complex multi-pass AI algorithms

The result: A production-ready AI-powered recommendation system that combines the sophistication of advanced machine learning with the performance requirements of modern web applications.

---

## 9 Advanced AI Integration Benefits

### Real-Time Intelligence with Offline Processing

The enhanced architecture leverages our sophisticated AI services to deliver unprecedented recommendation quality:

1. **Thematic Intelligence** - `ThematicAnalysisEngine` pre-processes psychological themes, narrative patterns, and cultural contexts
2. **Cinematic Style Matching** - `CinematicStyleAnalyzer` enables instant style-based recommendations through cached visual analysis
3. **Emotional Journey Mapping** - `EmotionalJourneyMapper` provides mood-aware recommendations with emotional pattern matching
4. **Conversational Query Understanding** - `ConversationalParser` pre-processes common queries for instant natural language search

### Performance Gains

- **Query Processing**: 3-5s → <200ms (95% improvement)
- **Style Matching**: Real-time access to sophisticated cinematographic analysis
- **Thematic Search**: Instant psychological theme-based filtering
- **Conversational AI**: Pre-cached query understanding eliminates API latency

### AI Service Architecture Benefits

- **Horizontal Scaling**: Each AI service can be scaled independently based on demand
- **Fault Tolerance**: Service health monitoring with graceful degradation
- **Cost Optimization**: Expensive analysis runs once, serves many users
- **Rich Insights**: Comprehensive explanation generation for all recommendations
