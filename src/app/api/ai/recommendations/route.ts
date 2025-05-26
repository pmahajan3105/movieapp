import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import type { Movie, EnhancedRecommendation, RecommendationExplanation } from '@/types'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// TMDB Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

const AI_MOVIE_DISCOVERY_PROMPT = `You are an expert movie recommendation AI with access to comprehensive knowledge of world cinema from the 1920s to 2024.

Your task: Generate personalized movie recommendations from the ENTIRE universe of films, not just popular ones.

Return EXACTLY this JSON format:
{
  "recommendations": [
    {
      "title": "The exact movie title",
      "year": 2023,
      "director": "Director Name",
      "confidence": 0.95,
      "reason": "Specific personal reason why this perfectly matches the user",
      "explanation": {
        "primaryReasons": [
          "Matches your love of complex sci-fi narratives",
          "Features the cerebral storytelling you enjoy"
        ],
        "preferenceMatches": {
          "genres": ["sci-fi", "thriller"],
          "directors": ["Denis Villeneuve"],
          "themes": ["philosophical", "mind-bending"],
          "actors": ["Oscar Isaac"],
          "mood": "thought-provoking"
        },
        "qualitySignals": {
          "rating": 8.5,
          "criticsScore": 85,
          "awards": ["Academy Award nominee"],
          "acclaim": "Critically acclaimed masterpiece"
        },
        "contextMatch": {
          "runtime": "Perfect 2-hour epic",
          "year": "Recent masterpiece (2023)",
          "availability": "Available on major platforms",
          "mood": "Perfect for thoughtful viewing",
          "accessibility": "Widely accessible"
        },
        "considerations": [
          "Complex plot requires attention",
          "Some abstract concepts"
        ],
        "similarToLiked": ["Arrival", "Blade Runner 2049"]
      }
    }
  ]
}

CRITICAL REQUIREMENTS:
1. **REAL MOVIES ONLY**: Every recommendation must be an actual, existing film
2. **DIVERSE DISCOVERY**: Include hidden gems, international films, classics, recent releases
3. **EXACT TITLES**: Use precise, searchable movie titles and release years
4. **COMPREHENSIVE REASONING**: Detailed explanations showing deep understanding of user preferences
5. **QUALITY FOCUS**: Prioritize critically acclaimed and well-regarded films
6. **VARIED SOURCES**: Draw from Hollywood, international cinema, documentaries, indie films

SEARCH STRATEGY:
- Consider the user's stated preferences deeply
- Think about films that match their psychological and emotional needs
- Include both mainstream and obscure films that fit perfectly
- Balance different eras, countries, and styles
- Focus on films they likely haven't seen but would love

Generate exactly 12 highly personalized recommendations from your vast knowledge of cinema.`

interface TMDBSearchResult {
  id: number
  title: string
  release_date: string
  poster_path: string
  backdrop_path: string
  overview: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  original_language: string
  adult: boolean
}

interface TMDBMovieDetails {
  id: number
  title: string
  release_date: string
  runtime: number
  poster_path: string
  backdrop_path: string
  overview: string
  vote_average: number
  vote_count: number
  genres: { id: number; name: string }[]
  production_countries: { iso_3166_1: string; name: string }[]
  spoken_languages: { iso_639_1: string; name: string }[]
  credits: {
    cast: { id: number; name: string; character: string; profile_path: string }[]
    crew: { id: number; name: string; job: string; department: string }[]
  }
  tagline: string
  status: string
  imdb_id: string
}

interface AIRecommendationResponse {
  recommendations: Array<{
    title: string
    year: number
    director?: string
    confidence: number
    reason: string
    explanation: {
      primaryReasons: string[]
      preferenceMatches: {
        genres?: string[]
        directors?: string[]
        themes?: string[]
        actors?: string[]
        mood?: string
      }
      qualitySignals: {
        rating?: number
        criticsScore?: number
        awards?: string[]
        acclaim?: string
      }
      contextMatch: {
        runtime?: string
        year?: string
        availability?: string
        mood?: string
        accessibility?: string
      }
      considerations?: string[]
      similarToLiked?: string[]
    }
  }>
}

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

// EnhancedRecommendationResponse interface removed as unused

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
  messages?: Array<{ role: string; content: string }>
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

    console.log('🎬 Enhanced AI Recommendation request (with API fixes):', {
      count,
      regenerate,
      mood,
      context,
      userId: effectiveUserId,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasTmdbKey: !!process.env.TMDB_API_KEY,
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
        .select(
          `
          movies (
            id, title, year, genre, rating, description, poster_url
          ),
          status,
          rating
        `
        )
        .eq('user_id', effectiveUserId)
        .eq('status', 'watched')
        .order('created_at', { ascending: false })
        .limit(20)

      if (watchlistItems) {
        viewingHistory = watchlistItems
          .map(item => item.movies)
          .filter(movie => movie !== null)
          .flat() as Movie[]
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
      system: AI_MOVIE_DISCOVERY_PROMPT,
      messages: [{ role: 'user', content: enhancedUserContext }],
    })

    const recommendations = completion.content.find(block => block.type === 'text')?.text

    if (!recommendations) {
      throw new Error('No response from AI')
    }

    // Parse and validate AI response
    let aiRecommendations: AIRecommendationResponse['recommendations'] = []
    try {
      const aiResponse: AIRecommendationResponse = JSON.parse(recommendations)
      aiRecommendations = aiResponse.recommendations || []
      console.log(`🎯 Parsed ${aiRecommendations.length} AI recommendations`)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.log('Raw AI response:', recommendations.substring(0, 500))
      throw new Error('AI returned invalid response format')
    }

    if (aiRecommendations.length === 0) {
      throw new Error('AI returned no recommendations')
    }

    // Check if TMDB is configured
    if (!TMDB_API_KEY) {
      console.log('⚠️ TMDB API key not configured - using local database only')
      return NextResponse.json({
        success: false,
        error: 'TMDB API key required for AI recommendations',
        message: 'Please set TMDB_API_KEY in your environment variables',
        setupGuide: 'See scripts/setup-tmdb.md for setup instructions',
      }, { status: 500 })
    }

    // Process AI recommendations with TMDB-first approach
    const enhancedRecommendations: EnhancedRecommendation[] = []
    
    for (const [index, aiRec] of aiRecommendations.slice(0, count).entries()) {
      console.log(`🔍 Processing: ${aiRec.title} (${aiRec.year})`)
      
      try {
        // PRIMARY: Search TMDB for real-time movie data
        const tmdbMovie = await searchAndFetchFromTMDB(aiRec.title, aiRec.year)
        
        if (tmdbMovie) {
          console.log(`✅ Found on TMDB: ${tmdbMovie.title}`)
          
          // Save to our database for future reference
          const finalMovie = await findOrCreateMovieInDatabase(tmdbMovie)
          
          enhancedRecommendations.push({
            movie: finalMovie,
            reason: aiRec.reason,
            confidence: aiRec.confidence,
            position: index + 1,
            explanation: aiRec.explanation as RecommendationExplanation,
          })
        } else {
          console.log(`⚠️ TMDB miss: ${aiRec.title} - checking local database`)
          
          // FALLBACK: Try our local database
          const { data: localMovie } = await supabase
            .from('movies')
            .select('*')
            .ilike('title', `%${aiRec.title}%`)
            .limit(1)
            .single()
          
          if (localMovie) {
            console.log(`📋 Found in local database: ${localMovie.title}`)
            enhancedRecommendations.push({
              movie: localMovie,
              reason: aiRec.reason,
              confidence: aiRec.confidence * 0.8, // Lower confidence for local fallback
              position: index + 1,
              explanation: aiRec.explanation as RecommendationExplanation,
            })
          } else {
            console.log(`❌ Movie not found anywhere: ${aiRec.title}`)
            // Skip this recommendation
          }
        }
      } catch (error) {
        console.error(`Error processing ${aiRec.title}:`, error)
        // Skip this recommendation
      }
    }

    if (enhancedRecommendations.length === 0) {
      console.log('⚠️ No TMDB recommendations found, falling back to database')
      const fallbackMovies = await getFallbackMoviesFromDatabase(count)
      return NextResponse.json({
        success: true,
        recommendations: fallbackMovies,
        source: 'database_fallback',
        message: 'AI recommendations not found, using database movies',
      })
    }

    console.log(`🎉 Successfully processed ${enhancedRecommendations.length} recommendations`)

    return NextResponse.json({
      success: true,
      recommendations: enhancedRecommendations,
      source: 'ai_tmdb_enhanced',
      userPreferences,
      totalGenerated: aiRecommendations.length,
      validCount: enhancedRecommendations.length,
      usingTmdb: true,
    })
  } catch (error) {
    console.error('❌ AI Recommendation error:', error)

    // Fallback to database recommendations
    try {
      const fallbackMovies = await getFallbackMoviesFromDatabase(15)
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
  sections.push(
    `- Preferred Genres: ${preferences.preferred_genres?.join(', ') || 'Action, Drama, Sci-Fi'}`
  )
  sections.push(
    `- Avoided Genres: ${(preferences.avoid_genres || preferences.disliked_genres || []).join(', ') || 'None specified'}`
  )
  sections.push(
    `- Favorite Themes: ${preferences.themes?.join(', ') || 'Character development, engaging plots'}`
  )
  sections.push(`- Preferred Eras: ${preferences.preferred_eras?.join(', ') || 'Any era'}`)
  sections.push(`- Favorite Actors: ${preferences.favorite_actors?.join(', ') || 'Not specified'}`)
  sections.push(
    `- Favorite Directors: ${preferences.favorite_directors?.join(', ') || 'Not specified'}`
  )

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
    sections.push(
      `- Rating Range: ${preferences.ratingRange.min}/10 - ${preferences.ratingRange.max}/10`
    )
  }

  // Viewing history
  if (viewingHistory.length > 0) {
    sections.push(`\nVIEWING HISTORY:`)
    viewingHistory.slice(0, 10).forEach(movie => {
      sections.push(
        `- ${movie.title} (${movie.year}) - ${movie.genre?.join(', ')} - ${movie.rating}/10`
      )
    })
  }

  // Conversation context
  if (conversationData?.messages) {
    sections.push(`\nCONVERSATION INSIGHTS:`)
    sections.push(
      `- Conversation completed: ${conversationData.preferences_extracted ? 'Yes' : 'No'}`
    )
    sections.push(`- Total messages: ${conversationData.messages.length}`)
    // Extract key themes from conversation
    const userMessages = conversationData.messages
      .filter((msg: { role: string; content: string }) => msg.role === 'user')
      .slice(-3) // Last 3 user messages
      .map((msg: { role: string; content: string }) => msg.content)
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

  sections.push(
    `\nBased on this comprehensive profile, recommend ${15} movies that perfectly align with their preferences. Focus on quality films they likely haven't seen, with detailed reasoning for each recommendation.`
  )

  return sections.join('\n')
}

// ... existing code ...

async function getFallbackRecommendations(
  count: number,
  preferences: EnhancedPreferences
): Promise<EnhancedRecommendationItem[]> {
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
      genreMovies.forEach(movie => {
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

// Enhanced function to generate explanations
function generateEnhancedExplanation(
  movie: Movie,
  userPreferences: EnhancedPreferences,
  baseReason: string
): RecommendationExplanation {
  const explanation: RecommendationExplanation = {
    primaryReasons: [baseReason],
    preferenceMatches: {},
    qualitySignals: {},
    contextMatch: {},
    considerations: [],
    similarToLiked: []
  }

  // Extract preference matches
  if (userPreferences.preferred_genres && movie.genre) {
    const matchedGenres = movie.genre.filter((g: string) => 
      userPreferences.preferred_genres!.some((pg: string) => 
        pg.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(pg.toLowerCase())
      )
    )
    if (matchedGenres.length > 0) {
      explanation.preferenceMatches.genres = matchedGenres
    }
  }

  // Director matches
  if (userPreferences.favorite_directors && movie.director) {
    const matchedDirectors = movie.director.filter((d: string) =>
      userPreferences.favorite_directors!.some((fd: string) =>
        fd.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(fd.toLowerCase())
      )
    )
    if (matchedDirectors.length > 0) {
      explanation.preferenceMatches.directors = matchedDirectors
    }
  }

  // Quality signals
  if (movie.rating && movie.rating >= 7.5) {
    explanation.qualitySignals.rating = movie.rating
  }

  // Context matching
  if (movie.runtime) {
    if (movie.runtime >= 90 && movie.runtime <= 120) {
      explanation.contextMatch.runtime = "Perfect 90-120 minute sweet spot"
    } else if (movie.runtime < 90) {
      explanation.contextMatch.runtime = "Quick watch under 90 minutes"
    } else if (movie.runtime > 150) {
      explanation.contextMatch.runtime = "Epic length - perfect for dedicated viewing"
    }
  }

  if (movie.year) {
    if (movie.year >= 2020) {
      explanation.contextMatch.year = "Recent release"
    } else if (movie.year >= 2010) {
      explanation.contextMatch.year = "Modern classic"
    } else if (movie.year >= 2000) {
      explanation.contextMatch.year = "2000s favorite"
    }
  }

  // Add considerations based on movie characteristics
  if (movie.runtime && movie.runtime > 150) {
    explanation.considerations?.push("Long runtime - plan for extended viewing")
  }

  if (movie.genre?.includes('Horror')) {
    explanation.considerations?.push("Contains horror elements")
  }

  // Find similar movies from user's favorites
  if (userPreferences.favorite_movies) {
    const similar = userPreferences.favorite_movies.filter((fav: string) => {
      // Simple similarity check based on shared genres
      if (!movie.genre) return false
      return movie.genre.some((g: string) => 
        fav.toLowerCase().includes(g.toLowerCase()) ||
        // Add more sophisticated similarity matching here
        false
      )
    })
    if (similar.length > 0) {
      explanation.similarToLiked = similar
    }
  }

  return explanation
}

// New TMDB Integration Functions

async function searchAndFetchFromTMDB(title: string, year?: number): Promise<Movie | null> {
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not configured')
    return null
  }

  try {
    // Search for the movie on TMDB
    const searchQuery = encodeURIComponent(title)
    const yearParam = year ? `&year=${year}` : ''
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}&include_adult=false`
    
    console.log(`🔍 TMDB Search: ${title} (${year})`)
    
    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()
    
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`❌ No TMDB results for: ${title}`)
      return null
    }
    
    // Get the best match (first result)
    const bestMatch = searchData.results[0] as TMDBSearchResult
    
    // Fetch detailed information including credits
    const detailsUrl = `${TMDB_BASE_URL}/movie/${bestMatch.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
    const detailsResponse = await fetch(detailsUrl)
    const movieDetails = await detailsResponse.json() as TMDBMovieDetails
    
    // Convert TMDB data to our Movie format
    const movie: Movie = {
      id: `tmdb-${movieDetails.id}`,
      title: movieDetails.title,
      year: movieDetails.release_date ? new Date(movieDetails.release_date).getFullYear() : undefined,
      genre: movieDetails.genres.map(g => g.name),
      rating: movieDetails.vote_average,
      director: movieDetails.credits.crew
        .filter(person => person.job === 'Director')
        .map(person => person.name),
      plot: movieDetails.overview || undefined,
      poster_url: movieDetails.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`
        : undefined,
      runtime: movieDetails.runtime,
      imdb_id: movieDetails.imdb_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    console.log(`✅ TMDB Movie: ${movie.title} (${movie.year})`)
    return movie
    
  } catch (error) {
    console.error(`Error fetching from TMDB for ${title}:`, error)
    return null
  }
}

async function findOrCreateMovieInDatabase(tmdbMovie: Movie): Promise<Movie> {
  try {
    // Check if movie already exists in our database
    const { data: existingMovie } = await supabase
      .from('movies')
      .select('*')
      .or(`imdb_id.eq.${tmdbMovie.imdb_id},title.ilike.%${tmdbMovie.title}%`)
      .single()
    
    if (existingMovie) {
      console.log(`📋 Found existing movie in database: ${existingMovie.title}`)
      return existingMovie
    }
    
    // Movie doesn't exist, let's add it to our database
    const { data: newMovie, error } = await supabase
      .from('movies')
      .insert({
        title: tmdbMovie.title,
        year: tmdbMovie.year,
        genre: tmdbMovie.genre,
        rating: tmdbMovie.rating,
        director: tmdbMovie.director,
        plot: tmdbMovie.plot,
        poster_url: tmdbMovie.poster_url,
        runtime: tmdbMovie.runtime,
        imdb_id: tmdbMovie.imdb_id,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error adding movie to database:', error)
      // Return the TMDB movie data even if we can't save it
      return tmdbMovie
    }
    
    console.log(`➕ Added new movie to database: ${newMovie.title}`)
    return newMovie
    
  } catch (error) {
    console.error('Error in findOrCreateMovieInDatabase:', error)
    // Return the TMDB movie data as fallback
    return tmdbMovie
  }
}
