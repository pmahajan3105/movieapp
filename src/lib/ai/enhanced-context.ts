import { createClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'
// import { movieMemoryService } from '@/lib/mem0/client' // Disabled due to package removal
import { analyzeCompleteUserBehavior, type UserBehaviorProfile } from './behavioral-analysis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Type definitions for data structures
type UserProfile = {
  favorite_movies: string[]
  preferred_genres: string[]
  preferred_decades: string[]
  preferred_languages: string[]
  streaming_services: string[]
  content_preferences: string[]
}

type WatchedMovie = {
  movie: Movie
  rating?: number
  watched_at: string
  notes?: string
  context: string
}

type WatchlistMovie = {
  movie: Movie
  added_at: string
}

type RecentActivity = {
  last_watched: Movie[]
  recently_added: Movie[]
  recent_ratings: Array<{ movie: Movie; rating: number; date: string }>
}

type Mem0Memories = {
  preferences: string[]
  behavioral_patterns: string[]
  contextual_insights: string[]
  evolution_timeline: string[]
}

type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface EnhancedRecommendationContext {
  user_profile: {
    basic_info: {
      favorite_movies: string[]
      preferred_genres: string[]
      preferred_decades: string[]
      preferred_languages: string[]
      streaming_services: string[]
      content_preferences: string[]
    }
    conversation_history: {
      recent_messages: Array<{
        role: 'user' | 'assistant'
        content: string
        timestamp: string
      }>
      total_conversations: number
      key_insights: string[]
    }
  }

  behavioral_intelligence: UserBehaviorProfile

  viewing_history: {
    all_watched_movies: Array<{
      movie: Movie
      rating?: number
      watched_at: string
      notes?: string
      context: string
    }>
    all_watchlist_movies: Array<{
      movie: Movie
      added_at: string
    }>
    recent_activity: {
      last_watched: Movie[]
      recently_added: Movie[]
      recent_ratings: Array<{ movie: Movie; rating: number; date: string }>
    }
  }

  mem0_memories: {
    preferences: string[]
    behavioral_patterns: string[]
    contextual_insights: string[]
    evolution_timeline: string[]
  }

  current_context: {
    timestamp: string
    user_query: string
    mood_context?: string
    situational_context?: string
    recommendation_count: number
  }

  intelligence_summary: {
    taste_profile: string
    behavior_patterns: string
    recommendation_strategy: string
    confidence_factors: string[]
  }
}

/**
 * Build comprehensive context for AI recommendations using ALL available data
 */
export async function buildEnhancedRecommendationContext(
  userId: string,
  userQuery: string,
  recommendationCount: number = 10,
  moodContext?: string
): Promise<EnhancedRecommendationContext> {
  console.log('🚀 Building enhanced recommendation context for user:', userId)

  try {
    // Run all data collection in parallel for maximum efficiency
    const [
      userProfile,
      conversationHistory,
      allWatchedMovies,
      allWatchlistMovies,
      behavioralProfile,
    ] = await Promise.all([
      getUserProfile(userId),
      getConversationHistory(userId),
      getAllWatchedMovies(userId),
      getAllWatchlistMovies(userId),
      analyzeCompleteUserBehavior(userId),
    ])

    // Use empty mem0 memories since package was removed
    const mem0Memories = {
      preferences: [],
      behavioral_patterns: [],
      contextual_insights: [],
      evolution_timeline: [],
    }

    // Extract recent activity
    const recentActivity = extractRecentActivity(allWatchedMovies, allWatchlistMovies)

    // Generate intelligence summary
    const intelligenceSummary = generateIntelligenceSummary(
      userProfile,
      behavioralProfile,
      mem0Memories,
      allWatchedMovies
    )

    const context: EnhancedRecommendationContext = {
      user_profile: {
        basic_info: userProfile,
        conversation_history: conversationHistory,
      },
      behavioral_intelligence: behavioralProfile,
      viewing_history: {
        all_watched_movies: allWatchedMovies,
        all_watchlist_movies: allWatchlistMovies,
        recent_activity: recentActivity,
      },
      mem0_memories: mem0Memories,
      current_context: {
        timestamp: Math.floor(Date.now() / 1000).toString(), // Unix timestamp in seconds
        user_query: userQuery,
        ...(moodContext && { mood_context: moodContext }),
        recommendation_count: recommendationCount,
      },
      intelligence_summary: intelligenceSummary,
    }

    console.log('✅ Enhanced context built successfully:', {
      watchedMovies: allWatchedMovies.length,
      watchlistMovies: allWatchlistMovies.length,
      memories:
        context.mem0_memories.preferences.length +
        context.mem0_memories.behavioral_patterns.length +
        context.mem0_memories.contextual_insights.length,
      conversations: conversationHistory.total_conversations,
      behavioralInsights: Object.keys(behavioralProfile).length,
    })

    return context
  } catch (error) {
    console.error('❌ Error building enhanced context:', error)
    throw error
  }
}

/**
 * Convert enhanced context to comprehensive prompt for Claude
 */
export function buildComprehensivePrompt(context: EnhancedRecommendationContext): string {
  const {
    user_profile,
    behavioral_intelligence,
    viewing_history,
    mem0_memories,
    current_context,
    intelligence_summary,
  } = context

  return `# COMPREHENSIVE USER CONTEXT FOR MOVIE RECOMMENDATIONS

## USER INTELLIGENCE SUMMARY
${intelligence_summary.taste_profile}

${intelligence_summary.behavior_patterns}

${intelligence_summary.recommendation_strategy}

## DETAILED USER PROFILE

### Basic Preferences
- **Favorite Movies**: ${user_profile.basic_info.favorite_movies.join(', ') || 'Not specified'}
- **Preferred Genres**: ${user_profile.basic_info.preferred_genres.join(', ') || 'Not specified'}
- **Preferred Decades**: ${user_profile.basic_info.preferred_decades.join(', ') || 'Not specified'}
- **Languages**: ${user_profile.basic_info.preferred_languages.join(', ') || 'Not specified'}
- **Streaming Services**: ${user_profile.basic_info.streaming_services.join(', ') || 'Not specified'}

### Conversation Intelligence
- **Total Conversations**: ${user_profile.conversation_history.total_conversations}
- **Key Insights**: ${user_profile.conversation_history.key_insights.join('; ') || 'None'}

## BEHAVIORAL INTELLIGENCE

### Rating Intelligence (${behavioral_intelligence.rating_patterns.total_ratings} total ratings, avg: ${behavioral_intelligence.rating_patterns.average_rating}/5)
${formatRatingIntelligence(behavioral_intelligence.rating_patterns)}

### Watchlist Behavior (${behavioral_intelligence.watchlist_patterns.completion_rate}% completion rate)
${formatWatchlistIntelligence(behavioral_intelligence.watchlist_patterns)}

### Temporal Patterns
${formatTemporalIntelligence(behavioral_intelligence.temporal_patterns)}

### Intelligence Insights
${formatIntelligenceInsights(behavioral_intelligence.intelligence_insights)}

## COMPLETE VIEWING HISTORY

### All Watched Movies (${viewing_history.all_watched_movies.length} movies)
${formatWatchedMovies(viewing_history.all_watched_movies)}

### Current Watchlist (${viewing_history.all_watchlist_movies.length} movies)
${formatWatchlistMovies(viewing_history.all_watchlist_movies)}

### Recent Activity
${formatRecentActivity(viewing_history.recent_activity)}

## MEM0 MEMORY INTELLIGENCE

### User Preferences
${mem0_memories.preferences.map(p => `- ${p}`).join('\n') || '- No preferences stored yet'}

### Behavioral Patterns
${mem0_memories.behavioral_patterns.map(p => `- ${p}`).join('\n') || '- No patterns identified yet'}

### Contextual Insights
${mem0_memories.contextual_insights.map(i => `- ${i}`).join('\n') || '- No contextual insights yet'}

## CURRENT REQUEST CONTEXT
- **User Query**: "${current_context.user_query}"
- **Requested Count**: ${current_context.recommendation_count} recommendations
- **Mood Context**: ${current_context.mood_context || 'Not specified'}
- **Timestamp**: ${current_context.timestamp}

## RECOMMENDATION INSTRUCTIONS

Based on this comprehensive intelligence profile, provide exactly ${current_context.recommendation_count} highly personalized movie recommendations that:

1. **Align with proven behavioral patterns** (use rating patterns, completion rates, temporal preferences)
2. **Leverage stored memories and insights** (reference specific Mem0 memories and conversation history)
3. **Consider current context and mood** (factor in the user's query and any mood indicators)
4. **Balance exploration and comfort** (mix familiar preferences with intelligent discovery based on their exploration ratio)
5. **Use real-time learning** (acknowledge recent activity and evolving tastes)

For each recommendation, provide:
- **Movie details** (title, year, genre, director, plot)
- **Personalized reasoning** (why this specific movie fits their proven patterns)
- **Intelligence confidence** (how confident you are based on their behavioral data)
- **Learning opportunity** (what this recommendation might reveal about their tastes)

Return recommendations as a valid JSON array with this exact structure:
\`\`\`json
{
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2023,
      "genre": ["Genre1", "Genre2"],
      "director": ["Director Name"],
      "plot": "Brief plot description",
      "reasoning": "Detailed personalized explanation based on user's behavioral intelligence",
      "confidence_score": 0.95,
      "learning_opportunity": "What this recommendation might teach us about the user",
      "behavioral_match": ["specific patterns this matches"],
      "tmdb_id": 123456
    }
  ],
  "context_summary": "Brief summary of how the behavioral intelligence was used",
  "learning_notes": ["Real-time insights to remember for future recommendations"]
}
\`\`\`

Important: Use the behavioral intelligence extensively. Reference specific patterns, ratings, and insights throughout your reasoning.`
}

// Helper functions for data collection

async function getUserProfile(userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return {
    favorite_movies: profile?.favorite_movies || [],
    preferred_genres: profile?.preferred_genres || [],
    preferred_decades: profile?.preferred_decades || [],
    preferred_languages: profile?.preferred_languages || [],
    streaming_services: profile?.streaming_services || [],
    content_preferences: profile?.content_preferences || [],
  }
}

async function getConversationHistory(userId: string) {
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select(
      `
      id,
      created_at,
      chat_messages (
        id, role, content, created_at
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  const allMessages =
    sessions?.flatMap(
      session =>
        session.chat_messages?.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.created_at,
        })) || []
    ) || []

  // Extract key insights from conversation history
  const keyInsights = extractConversationInsights(allMessages)

  return {
    recent_messages: allMessages.slice(0, 20), // Last 20 messages for context
    total_conversations: sessions?.length || 0,
    key_insights: keyInsights,
  }
}

async function getAllWatchedMovies(userId: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .select(
      `
      watched_at,
      notes,
      movies (*),
      movie_id
    `
    )
    .eq('user_id', userId)
    .eq('watched', true)
    .order('watched_at', { ascending: false })

  if (error) {
    console.error('Error fetching watched movies:', error)
    return [] // Return empty array instead of throwing to prevent app crash
  }

  if (!data) return []

  // Get ratings for these movies from separate ratings table
  const movieIds = data.map(item => item.movie_id)
  const { data: ratingsData } = await supabase
    .from('ratings')
    .select('movie_id, rating')
    .eq('user_id', userId)
    .in('movie_id', movieIds)

  const ratingsMap = new Map(ratingsData?.map(r => [r.movie_id, r.rating]) || [])

  return data.map(item => ({
    ...item,
    movie: item.movies as unknown as Movie,
    rating: ratingsMap.get(item.movie_id),
    context: inferWatchingContext(item.watched_at, ratingsMap.get(item.movie_id)),
  }))
}

async function getAllWatchlistMovies(userId: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .select(
      `
      added_at,
      movies (*)
    `
    )
    .eq('user_id', userId)
    .eq('watched', false)
    .order('added_at', { ascending: false })

  if (error) {
    console.error('Error fetching watchlist:', error)
    return [] // Return empty array instead of throwing to prevent app crash
  }

  return (
    data?.map(item => ({
      ...item,
      movie: item.movies as unknown as Movie,
    })) || []
  )
}

// getMem0Memories function removed - mem0 package was removed

// Helper functions for formatting context

function extractRecentActivity(
  watchedMovies: WatchedMovie[],
  watchlistMovies: WatchlistMovie[]
): RecentActivity {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const lastWatched = watchedMovies.slice(0, 5).map(w => w.movie)
  const recentlyAdded = watchlistMovies
    .filter(w => new Date(w.added_at) >= oneWeekAgo)
    .slice(0, 5)
    .map(w => w.movie)

  const recentRatings = watchedMovies
    .filter(w => w.rating && new Date(w.watched_at) >= oneWeekAgo)
    .slice(0, 5)
    .map(w => ({
      movie: w.movie,
      rating: w.rating!,
      date: w.watched_at,
    }))

  return {
    last_watched: lastWatched,
    recently_added: recentlyAdded,
    recent_ratings: recentRatings,
  }
}

function generateIntelligenceSummary(
  userProfile: UserProfile,
  behavioralProfile: UserBehaviorProfile,
  memories: Mem0Memories,
  watchedMovies: WatchedMovie[]
) {
  const tasteProfile = `**TASTE PROFILE**: User has ${behavioralProfile.rating_patterns.total_ratings} ratings with ${behavioralProfile.rating_patterns.average_rating}/5 average. Taste consistency: ${behavioralProfile.intelligence_insights.taste_consistency_score} (${behavioralProfile.intelligence_insights.taste_consistency_score > 0.7 ? 'predictable' : 'diverse'}). Quality threshold: ${behavioralProfile.intelligence_insights.quality_threshold}/5.`

  const behaviorPatterns = `**BEHAVIOR PATTERNS**: ${behavioralProfile.watchlist_patterns.completion_rate}% watchlist completion rate. Watches ${behavioralProfile.temporal_patterns.recent_viewing_velocity} movies/week recently. Prefers ${behavioralProfile.temporal_patterns.weekend_genres.join(', ')} on weekends, ${behavioralProfile.temporal_patterns.weekday_genres.join(', ')} on weekdays.`

  const strategy = `**RECOMMENDATION STRATEGY**: Focus on genres with ${Array.from(
    behavioralProfile.rating_patterns.genre_rating_averages.entries()
  )
    .filter(([, rating]) => rating >= 4.0)
    .map(([genre]) => genre)
    .join(
      ', '
    )} (high-rated). Consider directors: ${Array.from(behavioralProfile.intelligence_insights.director_loyalty_scores.keys()).join(', ')}. Balance exploration ratio: ${behavioralProfile.intelligence_insights.exploration_vs_comfort_ratio}.`

  return {
    taste_profile: tasteProfile,
    behavior_patterns: behaviorPatterns,
    recommendation_strategy: strategy,
    confidence_factors: [
      `${behavioralProfile.rating_patterns.total_ratings} total ratings`,
      `${memories.preferences.length} stored preferences`,
      `${watchedMovies.length} watched movies`,
    ],
  }
}

function formatRatingIntelligence(patterns: UserBehaviorProfile['rating_patterns']): string {
  const lines = []

  if (patterns.five_star_movies.length > 0) {
    lines.push(
      `**LOVES (5★)**: ${patterns.five_star_movies
        .slice(0, 5)
        .map(p => p.movie.title)
        .join(', ')}`
    )
  }

  if (patterns.one_star_movies.length > 0) {
    lines.push(
      `**DISLIKES (1★)**: ${patterns.one_star_movies
        .slice(0, 3)
        .map(p => p.movie.title)
        .join(', ')}`
    )
  }

  const topGenres = Array.from(patterns.genre_rating_averages.entries())
    .filter(([, rating]) => rating >= 4.0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre, rating]) => `${genre} (${rating}★)`)

  if (topGenres.length > 0) {
    lines.push(`**TOP GENRES**: ${topGenres.join(', ')}`)
  }

  return lines.join('\n')
}

function formatWatchlistIntelligence(patterns: UserBehaviorProfile['watchlist_patterns']): string {
  const lines = []

  lines.push(
    `**COMPLETION**: ${patterns.completion_rate}% overall, avg ${patterns.average_time_to_watch} days to watch`
  )

  if (patterns.impulse_watches.length > 0) {
    lines.push(
      `**IMPULSE WATCHES**: ${patterns.impulse_watches
        .slice(0, 3)
        .map(w => w.movie.title)
        .join(', ')}`
    )
  }

  if (patterns.abandoned_movies.length > 0) {
    lines.push(
      `**ABANDONED**: ${patterns.abandoned_movies
        .slice(0, 3)
        .map(w => w.movie.title)
        .join(', ')}`
    )
  }

  return lines.join('\n')
}

function formatTemporalIntelligence(patterns: UserBehaviorProfile['temporal_patterns']): string {
  const lines = []

  if (patterns.weekend_genres.length > 0) {
    lines.push(`**WEEKENDS**: ${patterns.weekend_genres.join(', ')}`)
  }

  if (patterns.weekday_genres.length > 0) {
    lines.push(`**WEEKDAYS**: ${patterns.weekday_genres.join(', ')}`)
  }

  lines.push(`**VELOCITY**: ${patterns.recent_viewing_velocity} movies/week`)

  return lines.join('\n')
}

function formatIntelligenceInsights(
  insights: UserBehaviorProfile['intelligence_insights']
): string {
  const lines = []

  lines.push(
    `**CONSISTENCY**: ${insights.taste_consistency_score} (${insights.taste_consistency_score > 0.7 ? 'predictable' : 'diverse'})`
  )
  lines.push(`**QUALITY THRESHOLD**: ${insights.quality_threshold}/5 stars`)
  lines.push(`**EXPLORATION RATIO**: ${insights.exploration_vs_comfort_ratio}`)

  return lines.join('\n')
}

function formatWatchedMovies(movies: WatchedMovie[]): string {
  return movies
    .slice(0, 50)
    .map(
      w =>
        `- **${w.movie.title}** (${w.movie.year}) ${w.rating ? `- ${w.rating}★` : ''} - ${w.movie.genre?.join(', ') || 'Unknown'}`
    )
    .join('\n')
}

function formatWatchlistMovies(movies: WatchlistMovie[]): string {
  return movies
    .slice(0, 30)
    .map(
      w =>
        `- **${w.movie.title}** (${w.movie.year}) [Watchlist] - ${w.movie.genre?.join(', ') || 'Unknown'}`
    )
    .join('\n')
}

function formatRecentActivity(activity: RecentActivity): string {
  const lines = []

  if (activity.last_watched.length > 0) {
    lines.push(
      `**RECENTLY WATCHED**: ${activity.last_watched.map((m: Movie) => m.title).join(', ')}`
    )
  }

  if (activity.recently_added.length > 0) {
    lines.push(
      `**RECENTLY ADDED**: ${activity.recently_added.map((m: Movie) => m.title).join(', ')}`
    )
  }

  if (activity.recent_ratings.length > 0) {
    lines.push(
      `**RECENT RATINGS**: ${activity.recent_ratings.map(r => `${r.movie.title} (${r.rating}★)`).join(', ')}`
    )
  }

  return lines.join('\n')
}

function extractConversationInsights(messages: ConversationMessage[]): string[] {
  const insights = []

  // Simple pattern extraction - could be enhanced with NLP
  const userMessages = messages.filter(m => m.role === 'user')

  if (userMessages.some(m => m.content.toLowerCase().includes('love'))) {
    insights.push('User expresses strong preferences')
  }

  if (userMessages.some(m => m.content.toLowerCase().includes('recently'))) {
    insights.push('User mentions recent viewing context')
  }

  if (userMessages.some(m => m.content.toLowerCase().includes('mood'))) {
    insights.push('User considers mood when selecting movies')
  }

  return insights
}

function inferWatchingContext(watchedAt: string, rating?: number): string {
  const date = new Date(watchedAt)
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const hour = date.getHours()

  let context = isWeekend ? 'Weekend viewing' : 'Weekday viewing'

  if (hour >= 20) {
    context += ', Evening'
  } else if (hour >= 12) {
    context += ', Afternoon'
  } else {
    context += ', Morning'
  }

  if (rating) {
    context += rating >= 4 ? ', Enjoyed' : rating <= 2 ? ', Disappointed' : ', Mixed feelings'
  }

  return context
}
