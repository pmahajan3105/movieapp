import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { groq, groqConfig } from '@/lib/groq/config'
import type { Movie } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RECOMMENDATION_SYSTEM_PROMPT = `You are an expert movie recommendation AI. Based on user preferences and viewing history, generate highly personalized movie recommendations.

Generate exactly 15 movie recommendations in this JSON format:
{
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2020,
      "confidence": 0.95,
      "reason": "Matches your love for sci-fi and complex narratives like Interstellar"
    }
  ]
}

IMPORTANT:
- Only recommend movies that actually exist
- Provide diverse recommendations (different genres, years, styles)
- Include confidence score (0.1-1.0) based on how well it matches their taste
- Give specific, personalized reasons for each recommendation
- Mix popular and lesser-known quality films
- Consider the user's specific preferences and viewing patterns`

interface UserPreferences {
  favorite_movies?: string[]
  preferred_genres?: string[]
  avoid_genres?: string[]
  themes?: string[]
  preferred_eras?: string[]
  favorite_actors?: string[]
  favorite_directors?: string[]
}

interface RecommendationItem {
  title: string
  year?: number
  reason?: string
  confidence?: number
}

interface RecommendationResponse {
  recommendations: RecommendationItem[]
}

interface RecommendationRequest {
  count?: number
  regenerate?: boolean
  mood?: string
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      count = 15,
      regenerate = false,
      mood,
      userId,
    }: RecommendationRequest = await request.json()

    // For now, work with anonymous users
    const effectiveUserId = userId || 'anonymous-user'

    console.log('🎬 AI Recommendation request:', {
      count,
      regenerate,
      mood,
      userId: effectiveUserId,
    })

    // Get user preferences from chat sessions or profile
    let userPreferences: UserPreferences = {}
    let viewingHistory: Movie[] = []

    try {
      // Try to get preferences from latest chat session
      const { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('preferences_extracted', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (chatSession) {
        // Try to get preferences from user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', effectiveUserId)
          .single()

        userPreferences = profile?.preferences || {}
      }

      // Get recent movies (simulate viewing history)
      const { data: recentMovies } = await supabase
        .from('movies')
        .select('*')
        .order('rating', { ascending: false })
        .limit(20)

      viewingHistory = recentMovies || []
    } catch {
      console.log('Using fallback preferences for anonymous user')
      // Fallback preferences for anonymous users
      userPreferences = {
        preferred_genres: ['action', 'sci-fi', 'thriller'],
        favorite_movies: ['The Dark Knight', 'Inception'],
        themes: ['complex narratives', 'heroic journeys'],
      }
    }

    // Build comprehensive prompt
    const userContext = `
USER PREFERENCES:
- Favorite Movies: ${userPreferences.favorite_movies?.join(', ') || 'Not specified'}
- Preferred Genres: ${userPreferences.preferred_genres?.join(', ') || 'Action, Drama, Sci-Fi'}
- Avoided Genres: ${userPreferences.avoid_genres?.join(', ') || 'None specified'}
- Favorite Themes: ${userPreferences.themes?.join(', ') || 'Character development, interesting plots'}
- Preferred Eras: ${userPreferences.preferred_eras?.join(', ') || 'Any'}
- Favorite Actors: ${userPreferences.favorite_actors?.join(', ') || 'Not specified'}
- Favorite Directors: ${userPreferences.favorite_directors?.join(', ') || 'Not specified'}

RECENT VIEWING CONTEXT:
${viewingHistory
  .slice(0, 10)
  .map(movie => `- ${movie.title} (${movie.year}) - ${movie.genre?.join(', ')}`)
  .join('\n')}

${mood ? `CURRENT MOOD: ${mood}` : ''}

Based on this profile, recommend ${count} movies that perfectly match their taste. Focus on quality films they haven't seen yet.`

    // Call Groq API for recommendations
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: RECOMMENDATION_SYSTEM_PROMPT },
        { role: 'user', content: userContext },
      ],
      model: groqConfig.model,
      max_tokens: groqConfig.maxTokens,
      temperature: groqConfig.temperature,
      top_p: groqConfig.topP,
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse JSON response
    let recommendations: RecommendationItem[] = []
    try {
      const parsed: RecommendationResponse = JSON.parse(aiResponse)
      recommendations = parsed.recommendations || []
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback to popular movies
      recommendations = await getFallbackRecommendations(count)
    }

    // Validate and enrich recommendations with real movie data
    const enrichedRecommendations = await Promise.all(
      recommendations.slice(0, count).map(async (rec, index) => {
        try {
          // Try to find movie in our database first
          const { data: existingMovie } = await supabase
            .from('movies')
            .select('*')
            .ilike('title', rec.title)
            .limit(1)
            .single()

          if (existingMovie) {
            return {
              movie: existingMovie,
              reason: rec.reason || 'AI recommended based on your preferences',
              confidence: rec.confidence || 0.8,
              position: index + 1,
            }
          }

          // If not in database, try OMDB API
          const omdbMovie = await fetchMovieFromOMDB(rec.title, rec.year)
          if (omdbMovie) {
            return {
              movie: omdbMovie,
              reason: rec.reason || 'AI recommended based on your preferences',
              confidence: rec.confidence || 0.8,
              position: index + 1,
            }
          }

          return null
        } catch (error) {
          console.error(`Error enriching recommendation: ${rec.title}`, error)
          return null
        }
      })
    )

    // Filter out null recommendations and ensure we have some results
    const validRecommendations = enrichedRecommendations.filter(Boolean)

    if (validRecommendations.length === 0) {
      // Return fallback recommendations
      const fallbackRecs = await getFallbackRecommendations(count)
      return NextResponse.json({
        success: true,
        recommendations: fallbackRecs,
        batchId: `batch-${Date.now()}`,
        source: 'fallback',
      })
    }

    console.log(`🎬 AI Recommendations generated: ${validRecommendations.length} movies`)

    return NextResponse.json({
      success: true,
      recommendations: validRecommendations,
      batchId: `batch-${Date.now()}`,
      source: 'ai',
      userPreferences: userPreferences,
    })
  } catch (error) {
    console.error('AI Recommendation error:', error)

    // Return fallback recommendations on error
    try {
      const fallbackRecs = await getFallbackRecommendations(15)
      return NextResponse.json({
        success: true,
        recommendations: fallbackRecs,
        batchId: `fallback-${Date.now()}`,
        source: 'fallback',
        warning: 'AI service unavailable, showing popular movies',
      })
    } catch {
      return NextResponse.json(
        { success: false, error: 'Recommendation service unavailable' },
        { status: 500 }
      )
    }
  }
}

// Fallback recommendation function
async function getFallbackRecommendations(count: number) {
  const { data: movies } = await supabase
    .from('movies')
    .select('*')
    .order('rating', { ascending: false })
    .limit(count)

  return (movies || []).map(movie => ({
    title: movie.title,
    year: movie.year,
    reason: 'Popular highly-rated movie',
    confidence: 0.7,
  }))
}

// Fetch movie from OMDB API
async function fetchMovieFromOMDB(title: string, year?: number) {
  try {
    const apiKey = process.env.OMDB_API_KEY
    if (!apiKey) return null

    let url = `http://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}&type=movie&plot=short`
    if (year) {
      url += `&y=${year}`
    }

    const response = await fetch(url)
    const data = await response.json()

    if (data.Response === 'True') {
      return {
        id: data.imdbID,
        title: data.Title,
        year: parseInt(data.Year) || null,
        genre: data.Genre ? data.Genre.split(', ') : [],
        director: data.Director ? data.Director.split(', ') : [],
        plot: data.Plot !== 'N/A' ? data.Plot : '',
        poster_url: data.Poster !== 'N/A' ? data.Poster : null,
        rating: parseFloat(data.imdbRating) || null,
        runtime: data.Runtime ? parseInt(data.Runtime.replace(' min', '')) : null,
        imdb_id: data.imdbID,
      }
    }

    return null
  } catch (error) {
    console.error('OMDB fetch error:', error)
    return null
  }
}
