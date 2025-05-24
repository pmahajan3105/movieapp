import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { groq, groqConfig } from '@/lib/groq/config'

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

    // Call Groq AI for mood-based recommendations
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: MOOD_SEARCH_PROMPT },
        {
          role: 'user',
          content: `Current mood/situation: "${mood}"\n\nRecommend ${count} movies that perfectly match this mood.`,
        },
      ],
      model: groqConfig.model,
      max_tokens: groqConfig.maxTokens,
      temperature: 0.8, // Slightly higher for more creative mood matching
      top_p: groqConfig.topP,
    })

    const aiResponse = completion.choices[0]?.message?.content

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

          // If not in database, try OMDB API
          const omdbMovie = await fetchMovieFromOMDB(rec.title, rec.year)
          if (omdbMovie) {
            return {
              ...omdbMovie,
              mood_reason: rec.reason || 'Perfect for your current mood',
              mood_match: rec.mood_match || 'Great choice for this mood',
              confidence: rec.confidence || 0.8,
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

// Fetch movie from OMDB API (same as recommendations route)
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
