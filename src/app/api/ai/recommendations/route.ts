import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import type { Movie } from '@/types'
import { movieService } from '@/lib/services/movie-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ENHANCED_RECOMMENDATION_PROMPT = `You are an expert movie recommendation AI with deep understanding of user preferences extracted from conversational data.

Generate exactly 15 highly personalized movie recommendations in this JSON format:
{
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2020,
      "confidence": 0.95,
      "reason": "Perfect match for your love of mind-bending sci-fi narratives like Inception",
      "genre_match": ["sci-fi", "thriller"],
      "mood_match": "thought-provoking",
      "similarity_score": 0.92
    }
  ]
}

ADVANCED MATCHING CRITERIA:
- Analyze user's conversational preferences deeply
- Consider viewing context (solo, date night, family, etc.)
- Match emotional moods and themes mentioned in conversation
- Factor in specific actors, directors, and filmmaking styles discussed
- Consider year preferences and rating ranges if specified
- Avoid explicitly disliked genres or elements
- Balance between user's stated preferences and introducing quality surprises
- Provide confidence scores based on multi-factor preference alignment

IMPORTANT:
- Only recommend movies that actually exist
- Diversify across user's preferred spectrum
- Include specific, personalized reasoning
- Consider conversational context and implicit preferences
- Balance popular films with hidden gems`

interface EnhancedPreferences {
  // Original preferences
  favorite_movies?: string[]
  preferred_genres?: string[]
  avoid_genres?: string[]
  themes?: string[]
  preferred_eras?: string[]
  favorite_actors?: string[]
  favorite_directors?: string[]
  // Enhanced from conversation
  viewing_context?: {
    solo?: boolean
    social?: boolean
    weekend?: string
    weekday?: string
  }
  mood_preferences?: {
    default?: string
    relaxing?: string
    energizing?: string
  }
  // New advanced fields
  disliked_genres?: string[]
  languages?: string[]
  yearRange?: { min: number; max: number }
  ratingRange?: { min: number; max: number }
  moods?: string[]
  viewingContexts?: string[]
}

interface EnhancedRecommendationItem {
  title: string
  year?: number
  reason?: string
  confidence?: number
  genre_match?: string[]
  mood_match?: string
  similarity_score?: number
}

interface EnhancedRecommendationResponse {
  recommendations: EnhancedRecommendationItem[]
}

interface RecommendationRequest {
  count?: number
  regenerate?: boolean
  mood?: string
  userId?: string
  context?: string
}

interface ConversationData {
  id?: string
  user_id?: string
  preferences_extracted?: boolean
  updated_at?: string
  // Add other fields as needed
}

export async function POST(request: NextRequest) {
  try {
    const {
      count = 15,
      regenerate = false,
      mood,
      userId,
      context,
    }: RecommendationRequest = await request.json()

    // For now, work with anonymous users
    const effectiveUserId = userId || '00000000-0000-0000-0000-000000000001' // UUID for anonymous user

    console.log('🎬 Enhanced AI Recommendation request:', {
      count,
      regenerate,
      mood,
      context,
      userId: effectiveUserId,
    })

    // Get comprehensive user preferences from multiple sources
    let userPreferences: EnhancedPreferences = {}
    let conversationData: ConversationData | null = null
    let viewingHistory: Movie[] = []

    try {
      // Get preferences from user profile (primary source)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('preferences, onboarding_completed')
        .eq('id', effectiveUserId)
        .single()

      if (profile?.preferences) {
        userPreferences = profile.preferences
      }

      // Get latest chat session for additional context
      const { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('preferences_extracted', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      conversationData = chatSession

      // Get viewing history (watchlist, ratings, etc.)
      const { data: watchlistItems } = await supabase
        .from('watchlist_items')
        .select(`
          movies (
            id, title, year, genre, rating, description, poster_url
          ),
          status,
          rating
        `)
        .eq('user_id', effectiveUserId)
        .eq('status', 'watched')
        .order('created_at', { ascending: false })
        .limit(20)

      if (watchlistItems) {
        viewingHistory = watchlistItems
          .map(item => item.movies)
          .filter(movie => movie !== null) as Movie[]
      }

      // Get popular movies as fallback context
      if (viewingHistory.length === 0) {
        const { data: popularMovies } = await supabase
          .from('movies')
          .select('*')
          .order('rating', { ascending: false })
          .limit(10)

        viewingHistory = popularMovies || []
      }

    } catch (error) {
      console.log('Using fallback preferences for user:', error)
      // Enhanced fallback preferences
      userPreferences = {
        preferred_genres: ['action', 'drama', 'sci-fi'],
        favorite_movies: ['The Dark Knight', 'Inception', 'Parasite'],
        themes: ['complex narratives', 'character development'],
        moods: ['thought-provoking', 'exciting'],
        yearRange: { min: 2000, max: 2024 },
        ratingRange: { min: 7.0, max: 10.0 },
      }
    }

    // Build enhanced context for AI
    const enhancedUserContext = buildEnhancedUserContext(
      userPreferences,
      viewingHistory,
      conversationData,
      mood,
      context
    )

    // Call Claude API with enhanced prompt
    const completion = await anthropic.messages.create({
      model: claudeConfig.model,
      max_tokens: 1000, // Increased for enhanced recommendations
      temperature: 0.7, // Balanced for creativity and relevance
      system: ENHANCED_RECOMMENDATION_PROMPT,
      messages: [
        { role: 'user', content: enhancedUserContext },
      ],
    })

    const recommendations = completion.content.find(block => block.type === 'text')?.text

    if (!recommendations) {
      throw new Error('No response from AI')
    }

    // Parse and validate AI response
    let parsedRecommendations: EnhancedRecommendationItem[] = []
    try {
      parsedRecommendations = JSON.parse(recommendations)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback to database-based recommendations
      parsedRecommendations = await getFallbackRecommendations(count, userPreferences)
    }

    // Enrich recommendations with real movie data and enhanced metadata
    const enrichedRecommendations = await Promise.all(
      parsedRecommendations.slice(0, count).map(async (rec, index) => {
        try {
          // Search for movie in database with fuzzy matching
          const { data: existingMovie } = await supabase
            .from('movies')
            .select('*')
            .or(`title.ilike.%${rec.title}%,title.ilike.%${rec.title.replace(/[^\w\s]/gi, '')}%`)
            .limit(1)
            .single()

          if (existingMovie) {
            return {
              movie: existingMovie,
              reason: rec.reason || 'AI recommended based on your preferences',
              confidence: rec.confidence || 0.8,
              position: index + 1,
              genre_match: rec.genre_match || [],
              mood_match: rec.mood_match || '',
              similarity_score: rec.similarity_score || 0.7,
            }
          }

          // Try TMDB as fallback
          const tmdbResults = await movieService.searchMovies(rec.title, { year: rec.year, limit: 1 })
          if (tmdbResults.movies.length > 0) {
            return {
              movie: tmdbResults.movies[0],
              reason: rec.reason || 'AI recommended based on your preferences',
              confidence: rec.confidence || 0.7,
              mood_match: rec.mood_match || '',
              similarity_score: rec.similarity_score || 0.6,
              source: 'tmdb'
            }
          }

          return null
        } catch (error) {
          console.error(`Error enriching recommendation for ${rec.title}:`, error)
          return null
        }
      })
    )

    // Filter out null results and ensure we have recommendations
    const validRecommendations = enrichedRecommendations.filter(Boolean)

    if (validRecommendations.length === 0) {
      // Ultimate fallback to popular movies
      const fallbackMovies = await getFallbackMoviesFromDatabase(count)
      return NextResponse.json({
        success: true,
        recommendations: fallbackMovies,
        source: 'fallback',
        message: 'Using popular movies as recommendations',
      })
    }

    return NextResponse.json({
      success: true,
      recommendations: validRecommendations,
      source: 'ai_enhanced',
      userPreferences,
      totalGenerated: parsedRecommendations.length,
      validCount: validRecommendations.length,
    })

  } catch (error) {
    console.error('❌ AI Recommendation error:', error)
    
    // Fallback to database recommendations
    try {
      const fallbackMovies = await getFallbackMoviesFromDatabase(count || 15)
      return NextResponse.json({
        success: true,
        recommendations: fallbackMovies,
        source: 'database_fallback',
        error: 'AI service unavailable, using database recommendations',
      })
    } catch (fallbackError) {
      console.error('❌ Fallback recommendation error:', fallbackError)
      return NextResponse.json(
        {
          error: 'Failed to generate recommendations',
          success: false,
        },
        { status: 500 }
      )
    }
  }
}

function buildEnhancedUserContext(
  preferences: EnhancedPreferences,
  viewingHistory: Movie[],
  conversationData: ConversationData | null,
  mood?: string,
  context?: string
): string {
  const sections = []

  // User preferences section
  sections.push(`USER PREFERENCES:`)
  sections.push(`- Favorite Movies: ${preferences.favorite_movies?.join(', ') || 'Not specified'}`)
  sections.push(`- Preferred Genres: ${preferences.preferred_genres?.join(', ') || 'Action, Drama, Sci-Fi'}`)
  sections.push(`- Avoided Genres: ${(preferences.avoid_genres || preferences.disliked_genres || []).join(', ') || 'None specified'}`)
  sections.push(`- Favorite Themes: ${preferences.themes?.join(', ') || 'Character development, engaging plots'}`)
  sections.push(`- Preferred Eras: ${preferences.preferred_eras?.join(', ') || 'Any era'}`)
  sections.push(`- Favorite Actors: ${preferences.favorite_actors?.join(', ') || 'Not specified'}`)
  sections.push(`- Favorite Directors: ${preferences.favorite_directors?.join(', ') || 'Not specified'}`)

  // Enhanced preferences
  if (preferences.moods?.length) {
    sections.push(`- Preferred Moods: ${preferences.moods.join(', ')}`)
  }
  if (preferences.viewingContexts?.length) {
    sections.push(`- Viewing Contexts: ${preferences.viewingContexts.join(', ')}`)
  }
  if (preferences.languages?.length) {
    sections.push(`- Preferred Languages: ${preferences.languages.join(', ')}`)
  }
  if (preferences.yearRange) {
    sections.push(`- Year Range: ${preferences.yearRange.min} - ${preferences.yearRange.max}`)
  }
  if (preferences.ratingRange) {
    sections.push(`- Rating Range: ${preferences.ratingRange.min}/10 - ${preferences.ratingRange.max}/10`)
  }

  // Viewing history
  if (viewingHistory.length > 0) {
    sections.push(`\nVIEWING HISTORY:`)
    viewingHistory.slice(0, 10).forEach(movie => {
      sections.push(`- ${movie.title} (${movie.year}) - ${movie.genre?.join(', ')} - ${movie.rating}/10`)
    })
  }

  // Conversation context
  if (conversationData?.messages) {
    sections.push(`\nCONVERSATION INSIGHTS:`)
    sections.push(`- Conversation completed: ${conversationData.preferences_extracted ? 'Yes' : 'No'}`)
    sections.push(`- Total messages: ${conversationData.messages.length}`)
    // Extract key themes from conversation
    const userMessages = conversationData.messages
      .filter((msg: any) => msg.role === 'user')
      .slice(-3) // Last 3 user messages
      .map((msg: any) => msg.content)
      .join(' ')
    if (userMessages) {
      sections.push(`- Recent preferences mentioned: "${userMessages.substring(0, 200)}..."`)
    }
  }

  // Current context
  if (mood) {
    sections.push(`\nCURRENT MOOD: ${mood}`)
  }
  if (context) {
    sections.push(`\nCURRENT CONTEXT: ${context}`)
  }

  sections.push(`\nBased on this comprehensive profile, recommend ${15} movies that perfectly align with their preferences. Focus on quality films they likely haven't seen, with detailed reasoning for each recommendation.`)

  return sections.join('\n')
}

// ... existing code ...

async function getFallbackRecommendations(count: number, preferences: EnhancedPreferences): Promise<EnhancedRecommendationItem[]> {
  // Enhanced fallback using user preferences
  const preferredGenres = preferences.preferred_genres || ['action', 'drama']
  const recommendations: EnhancedRecommendationItem[] = []

  // Try to get movies from preferred genres
  for (const genre of preferredGenres.slice(0, 3)) {
    const { data: genreMovies } = await supabase
      .from('movies')
      .select('*')
      .contains('genre', [genre])
      .order('rating', { ascending: false })
      .limit(Math.ceil(count / preferredGenres.length))

    if (genreMovies) {
      genreMovies.forEach((movie, index) => {
        recommendations.push({
          title: movie.title,
          year: movie.year,
          confidence: 0.6,
          reason: `Popular ${genre} movie that matches your preferences`,
          genre_match: [genre],
          similarity_score: 0.6,
        })
      })
    }
  }

  return recommendations.slice(0, count)
}

async function getFallbackMoviesFromDatabase(count: number) {
  const { data: movies } = await supabase
    .from('movies')
    .select('*')
    .order('rating', { ascending: false })
    .limit(count)

  return (movies || []).map((movie, index) => ({
    movie,
    reason: 'Popular highly-rated movie',
    confidence: 0.5,
    position: index + 1,
    genre_match: movie.genre || [],
    mood_match: 'popular',
    similarity_score: 0.5,
  }))
}
