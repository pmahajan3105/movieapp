# Personal AI Movie Companion - Background Processing
Design | Implementation | Simple & Practical  
CineAI Movie Recommendation App

--------------------------------------------------------------------
## 1  The Vision

A personal AI movie companion that:
- **Learns your taste** through conversations and ratings
- **Discovers trending movies** from TMDB automatically  
- **Maps new movies** to your learned preferences
- **Recommends carefully curated films** with clear reasons why
- **Gets smarter** every time you watch and rate something

**Keep it simple:** Just you, the AI, and great movie discoveries.

--------------------------------------------------------------------
## 2  Current Problem

Right now when you visit the dashboard:
1. **3-5 second wait** while AI processes recommendations live
2. **Same movies analyzed repeatedly** across sessions
3. **Limited depth** because we can't timeout the page load
4. **Expensive API calls** every time you refresh

**Goal:** Instant dashboard loads with pre-computed, personalized recommendations.

--------------------------------------------------------------------
## 3  Simple Solution

Move the heavy AI work to background jobs that run:
- **Hourly:** Check trending movies + update your recommendations  
- **When you rate:** Quick refresh based on your new feedback
- **When you chat:** Learn from what you tell the AI

```text
You rate/chat → AI learns → Background job runs → 
TMDB trending check → Map to your taste → Store curated picks
```

--------------------------------------------------------------------
## 4  Implementation

### 4.1 Store Pre-Computed Recommendations

```sql
-- Enhance existing recommendations table
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS reason TEXT, -- "Similar to Inception which you loved"
ADD COLUMN IF NOT EXISTS discovery_source TEXT, -- "trending", "similar_to_rated", "mood_match"
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2), -- 0.85 = 85% confidence
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
```

### 4.2 Learn From Conversations

```sql
-- Remember what you tell the AI
CREATE TABLE movie_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  movie_id TEXT, -- TMDB ID (nullable for general preferences)
  conversation_type TEXT CHECK (conversation_type IN ('loved_it', 'hated_it', 'want_more_like_this', 'mood_request', 'general_preference')),
  what_you_said TEXT, -- "The cinematography in Dune was incredible"
  ai_learned JSONB, -- {"visual_style": "epic_cinematography", "genre": "sci_fi_positive"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Your evolving taste profile
CREATE TABLE taste_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  preferences JSONB, -- All learned preferences in one place
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Background Movie Discovery Job

```ts
// supabase/functions/personal-movie-scout/index.ts
import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const { userId } = await req.json()
  
  // 1. Get your taste profile
  const tasteProfile = await getUserTasteProfile(userId)
  
  // 2. Check TMDB trending (keep it simple - just top 10)
  const trending = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`)
  const movies = await trending.json()
  
  // 3. For each trending movie, see if it matches your taste
  const personalPicks = []
  for (const movie of movies.results.slice(0, 10)) {
    const enrichedMovie = await enrichMovieFromTMDB(movie.id)
    const match = await analyzePersonalMatch(enrichedMovie, tasteProfile)
    
    if (match.confidence > 0.7) {
      personalPicks.push({
        user_id: userId,
        movie_id: movie.id,
        score: match.confidence,
        reason: match.reason, // "Like Inception - complex sci-fi with stunning visuals"
        discovery_source: 'trending',
        confidence: match.confidence
      })
    }
  }
  
  // 4. Store your curated recommendations
  if (personalPicks.length > 0) {
    await supabase.from('recommendations').upsert(personalPicks)
  }
  
  return new Response(`Found ${personalPicks.length} movies for you`)
})

async function analyzePersonalMatch(movie, tasteProfile) {
  // Simple AI prompt: "Does this movie match this user's taste?"
  const prompt = `
    Movie: ${movie.title} (${movie.year})
    Genres: ${movie.genres.join(', ')}
    Plot: ${movie.overview}
    Director: ${movie.director}
    
    User's taste profile: ${JSON.stringify(tasteProfile)}
    
    Rate 0-1 how well this matches their taste and explain why in one sentence.
  `
  
  const response = await callClaudeAPI(prompt)
  return parseMatchResponse(response) // Extract confidence + reason
}
```

### 4.4 Learn When You Rate Movies

```sql
-- Trigger to refresh recommendations when you rate something
CREATE OR REPLACE FUNCTION update_taste_on_rating() RETURNS TRIGGER AS $$
BEGIN
  -- Queue a quick taste profile update
  INSERT INTO recommendation_refresh_queue (user_id, trigger_type, movie_id)
  VALUES (NEW.user_id, 'new_rating', NEW.movie_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rating_triggers_learning
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_taste_on_rating();
```

### 4.5 Instant Dashboard Loading

```ts
// Frontend: Fast database-only dashboard
export async function getDashboardRecommendations(userId: string) {
  const { data: recommendations } = await supabase
    .from('recommendations')
    .select(`
      *,
      movies (*)
    `)
    .eq('user_id', userId)
    .order('confidence', { ascending: false })
    .limit(12)
  
  // If no recent recommendations, trigger background refresh
  if (!recommendations?.length || isStale(recommendations[0].generated_at)) {
    fetch('/api/trigger-movie-scout', { 
      method: 'POST', 
      body: JSON.stringify({ userId }) 
    })
    
    // Show fallback loading state or cached recommendations
    return getFallbackRecommendations(userId)
  }
  
  return recommendations
}
```

### 4.4 Smart Movie Enrichment (Optional Enhancement)

### 4.4.1 TMDB + Web Data Fusion
```ts
async function enrichMovieFromTMDB(movieId: string) {
  // 1. Get core data from TMDB (fast, reliable)
  const tmdbData = await fetchTMDBDetails(movieId)
  
  // 2. Enhance with selective web data (for trending movies only)
  const webEnrichment = await enrichWithWebData(tmdbData)
  
  return {
    ...tmdbData,
    ...webEnrichment
  }
}

async function enrichWithWebData(movie: TMDBMovie) {
  const enrichments = await Promise.allSettled([
    // Recent reviews/discussions (Reddit, Letterboxd)
    fetchRecentDiscussions(movie.title, movie.year),
    
    // Director/cast insights
    fetchCreatorInsights(movie.director, movie.cast),
    
    // Cultural context (Wikipedia summary)
    fetchCulturalContext(movie.title),
    
    // Themes and mood (from reviews)
    extractWebThemes(movie.title)
  ])
  
  return {
    recentBuzz: enrichments[0]?.value || null,
    creatorContext: enrichments[1]?.value || null,
    culturalSignificance: enrichments[2]?.value || null,
    publicMood: enrichments[3]?.value || null
  }
}
```

### 4.4.2 Smart Web Sources (Personal Project Friendly)
- **Wikipedia API** (free) - Cultural context and themes
- **Reddit API** (free) - Recent discussions and opinions  
- **Google Custom Search** (100 free queries/day) - Recent reviews
- **Letterboxd public data** - Film community insights

--------------------------------------------------------------------
## 5  Conversational Learning

### 5.1 Chat Interface Integration

```ts
// When you chat with the AI about movies
export async function learnFromConversation(userId: string, message: string, movieId?: string) {
  const insights = await extractInsights(message) // AI extracts what you like/dislike
  
  await supabase.from('movie_conversations').insert({
    user_id: userId,
    movie_id: movieId,
    what_you_said: message,
    ai_learned: insights,
    conversation_type: classifyMessage(message) // 'loved_it', 'want_more_like_this', etc.
  })
  
  // Update your taste profile
  await updateTasteProfile(userId, insights)
  
  // Trigger quick recommendation refresh if significant preference change
  if (insights.significance > 0.7) {
    await triggerRecommendationRefresh(userId)
  }
}

function extractInsights(message: string) {
  // Simple AI call to extract preferences
  const prompt = `
    User said: "${message}"
    
    Extract key movie preferences as JSON:
    {
      "genres": ["sci-fi"], 
      "visual_style": "epic_cinematography",
      "pacing": "fast",
      "themes": ["complex_narratives"],
      "mood": "adventurous",
      "significance": 0.8
    }
  `
  return parseAIResponse(prompt)
}
```

### 5.2 Natural Learning Examples

- **You:** "I loved Dune's visuals but it was too slow"
- **AI learns:** `{"visual_style": "epic_cinematography", "pacing": "prefers_faster"}`
- **Next rec:** "Blade Runner 2049 - stunning visuals like Dune but faster-paced"

- **You:** "Perfect movie for a rainy Sunday"  
- **AI learns:** `{"mood_context": {"rainy_day": "cozy_atmospheric"}}`
- **Next rec:** "Her - intimate, atmospheric perfect for contemplative mood"

--------------------------------------------------------------------
## 6  Your Personal Movie Dashboard

### 6.1 What AI Knows About You

```ts
// Simple taste summary display
export function TasteProfileSummary({ userId }: { userId: string }) {
  const profile = useTasteProfile(userId)
  
  return (
    <div className="card">
      <h3>What I've Learned About Your Taste</h3>
      <div className="badge-list">
        {profile.favoriteGenres?.map(genre => 
          <span key={genre} className="badge badge-primary">{genre}</span>
        )}
      </div>
      <p><strong>Visual Style:</strong> {profile.visualPreferences}</p>
      <p><strong>Pacing:</strong> {profile.pacingPreference}</p>
      <p><strong>Recent Learning:</strong> {profile.recentInsights}</p>
    </div>
  )
}
```

### 6.2 Today's Personal Picks

```ts
export function PersonalRecommendations({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="recommendations-grid">
      {recommendations.slice(0, 6).map(rec => (
        <MovieCard 
          key={rec.movie_id}
          movie={rec.movies}
          confidence={rec.confidence}
          reason={rec.reason} // "Because you loved the complex plot in Inception"
          onFeedback={(liked) => handleFeedback(rec.id, liked)}
        />
      ))}
    </div>
  )
}
```

--------------------------------------------------------------------
## 7  Scheduling & Automation

### 7.1 Simple Cron Jobs

```bash
# Deploy the background job
supabase functions deploy personal-movie-scout

# Run every 2 hours to check trending movies
supabase functions schedule personal-movie-scout --schedule "0 */2 * * *"

# Quick refresh job runs every 15 minutes for users who recently rated
supabase functions deploy quick-refresh
supabase functions schedule quick-refresh --schedule "*/15 * * * *"
```

### 7.2 Trigger-Based Updates

```sql
-- Queue for quick updates when you interact
CREATE TABLE recommendation_refresh_queue (
  user_id UUID PRIMARY KEY,
  trigger_type TEXT, -- 'new_rating', 'chat_learning', 'manual_refresh'
  movie_id TEXT,
  queued_at TIMESTAMPTZ DEFAULT NOW()
);
```

--------------------------------------------------------------------
## 8  Benefits of This Approach

### 8.1 For You (The User)
- **Instant dashboard loads** (< 200ms)
- **Always fresh recommendations** based on latest trending
- **Learns from every interaction** with you
- **Clear reasons** why each movie is recommended
- **Gets smarter over time** as you rate and chat

### 8.2 Technical Benefits  
- **Predictable costs** - controlled API usage
- **Scalable** - background jobs vs real-time processing
- **Reliable** - pre-computed recommendations always available
- **Simple to maintain** - clear separation of concerns

--------------------------------------------------------------------
## 9  Future Enhancements (Keep Simple)

1. **Weekly discovery email** (optional) - "5 new movies I found for you this week"
2. **Mood-based filtering** - "Show me something uplifting today"
3. **Friend recommendations** - Learn from movies your friends loved
4. **Seasonal suggestions** - "Perfect for Halloween" or "Summer blockbuster"
5. **Director/actor deep dives** - "Since you loved Denis Villeneuve..."

--------------------------------------------------------------------
## 10  Implementation Timeline

### Week 1: Foundation
- Update database schema
- Create basic background job
- Add conversation learning table

### Week 2: Background Processing  
- Deploy TMDB trending scout
- Implement taste profile updates
- Add recommendation refresh triggers

### Week 3: Frontend Integration
- Fast dashboard loading
- Conversation learning UI
- Taste profile display

### Week 4: Polish & Learning
- Improve AI matching accuracy
- Add feedback loops
- Fine-tune recommendation reasons

--------------------------------------------------------------------
### TL;DR

Transform your movie app into a personal AI companion that:
1. **Learns your taste** through ratings and conversations
2. **Scouts trending movies** in the background  
3. **Pre-computes personalized recommendations** with reasons
4. **Delivers instant dashboard** with curated picks
5. **Gets smarter** every time you interact with it

**Simple, personal, and focused on discovering great movies just for you.**