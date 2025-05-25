import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import { movieService } from '@/lib/services/movie-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MOOD_SEARCH_PROMPT = `You are a movie mood expert. Based on the user's current mood/situation, recommend 5 perfect movies.

Analyze this mood description and return exactly 5 movie recommendations in JSON format:
{
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2020,
      "reason": "Perfect for your current mood because...",
      "confidence": 0.95,
      "mood_match": "Exactly what you need for [mood]"
    }
  ]
}

IMPORTANT:
- Only recommend movies that actually exist
- Focus on movies that match the EXACT mood described
- Provide specific explanations for why each movie fits the mood
- Include a variety of genres and time periods
- Consider both popular and hidden gems`

interface MoodSearchRequest {
  mood: string
  count?: number
}

interface MoodRecommendation {
  title: string
  year?: number
  reason?: string
  confidence?: number
  mood_match?: string
}

interface MoodSearchResponse {
  recommendations: MoodRecommendation[]
}

export async function POST(request: NextRequest) {
  try {
    const { mood, count = 5 }: MoodSearchRequest = await request.json()

    if (!mood || mood.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mood description is required' },
        { status: 400 }
      )
    }

    console.log('🎭 Mood search request:', { mood, count })

    // Call Claude for mood-based recommendations
    const completion = await anthropic.messages.create({
      model: claudeConfig.model,
      max_tokens: claudeConfig.maxTokens,
      temperature: 0.8, // Slightly higher for more creative mood matching
      system: MOOD_SEARCH_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current mood/situation: "${mood}". Please recommend ${count} perfect movies for this mood.`,
        },
      ],
    })

    const aiResponse = completion.content.find(block => block.type === 'text')?.text

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse JSON response
    let moodRecommendations: MoodRecommendation[] = []
    try {
      const parsed: MoodSearchResponse = JSON.parse(aiResponse)
      moodRecommendations = parsed.recommendations || []
    } catch (parseError) {
      console.error('Failed to parse mood search response:', parseError)
      // Return fallback response
      return NextResponse.json({
        success: true,
        movies: [],
        mood,
        source: 'fallback',
        message: 'Unable to process mood search at this time',
      })
    }

    // Enrich recommendations with real movie data
    const enrichedMovies = await Promise.all(
      moodRecommendations.slice(0, count).map(async rec => {
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
              ...existingMovie,
              mood_reason: rec.reason || 'Perfect for your current mood',
              mood_match: rec.mood_match || 'Great choice for this mood',
              confidence: rec.confidence || 0.8,
            }
          }

          // If not in database, try TMDB API
          const tmdbResults = await movieService.searchMovies(rec.title, { year: rec.year, limit: 1 })
          if (tmdbResults.movies.length > 0) {
            return {
              ...tmdbResults.movies[0],
              reason: rec.reason || 'Matches your mood',
              confidence: rec.confidence || 0.7,
              source: 'tmdb'
            }
          }

          return null
        } catch (error) {
          console.error(`Error enriching mood recommendation: ${rec.title}`, error)
          return null
        }
      })
    )

    // Filter out null results
    const validMovies = enrichedMovies.filter(Boolean)

    console.log(`🎭 Mood search completed: ${validMovies.length} movies found for "${mood}"`)

    return NextResponse.json({
      success: true,
      movies: validMovies,
      mood,
      source: 'ai',
      totalFound: validMovies.length,
    })
  } catch (error) {
    console.error('Mood search error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process mood search' },
      { status: 500 }
    )
  }
}
