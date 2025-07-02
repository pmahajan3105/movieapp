import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMovieService } from '@/lib/services/movie-service'
import { smartRecommenderV2 } from '@/lib/ai/smart-recommender-v2'
import { MovieRepository } from '@/repositories'
import { ExplanationService } from '@/lib/ai/explanation-service'
import { logger } from '@/lib/logger'
import { aiRecommendationDeduplicator, RequestDeduplicator } from '@/lib/utils/request-deduplication'

export async function handleSmartRecommendations(
  supabase: SupabaseClient,
  limit: number,
  page: number,
  query: string,
  mood: string,
  genres: string[]
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Fallback to popular movies for logged-out users
    const movieService = getMovieService()
    const result = await movieService.getPopularMovies({ limit, page })
    return NextResponse.json({
      success: true,
      data: result.movies,
      total: result.totalResults,
      pagination: {
        currentPage: result.page,
        limit: limit,
        hasMore: result.page * limit < result.totalResults,
        totalPages: Math.ceil(result.totalResults / limit),
      },
      source: 'local-popular',
      vectorEnhanced: false,
    })
  }

  logger.info('Handling fast smart recommendations for user', { userId: user.id })

  // Generate cache key for deduplication
  const requestKey = RequestDeduplicator.generateKey({
    userId: user.id,
    limit,
    page,
    query,
    mood,
    genres: genres.sort().join(',')
  })

  // Use deduplication for expensive recommendations
  return await aiRecommendationDeduplicator.deduplicate(requestKey, async () => {
    try {
      // Get user profile for preferences
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Extract preferred genres from user profile
      const userPreferredGenres = userProfile?.preferences?.preferred_genres || []
      const finalGenres = genres.length > 0 ? genres : userPreferredGenres

      // Use MovieRepository for smart filtering
      const movieRepo = new MovieRepository(supabase)

      // Build search filters
      const filters: Parameters<typeof movieRepo.search>[1] = {
        limit,
        offset: (page - 1) * limit,
      }

      // Apply genre filtering if specified
      if (finalGenres.length > 0) {
        filters.genres = finalGenres
      }

      // Apply mood-based genre filtering
      if (mood) {
        const moodGenres: Record<string, string[]> = {
          happy: ['Comedy', 'Animation', 'Family', 'Musical'],
          upbeat: ['Comedy', 'Animation', 'Family', 'Musical'],
          sad: ['Drama', 'Romance'],
          emotional: ['Drama', 'Romance'],
          excited: ['Action', 'Adventure', 'Thriller'],
          energetic: ['Action', 'Adventure', 'Thriller'],
          relaxed: ['Documentary', 'Biography', 'History'],
          calm: ['Documentary', 'Biography', 'History'],
          scared: ['Horror', 'Thriller', 'Mystery'],
          thrilled: ['Horror', 'Thriller', 'Mystery'],
        }

        const moodLower = mood.toLowerCase()
        if (moodGenres[moodLower]) {
          filters.genres = [...(filters.genres || []), ...moodGenres[moodLower]]
          // Remove duplicates
          filters.genres = [...new Set(filters.genres)]
        }
      }

      try {
        const { movies, total } = await movieRepo.search(query || '', filters)

      // Enhance movies with recommendation reasoning
      let enhancedMovies = movies.map(movie => ({
        ...movie,
        reasoning: generateRecommendationReason(movie, finalGenres, mood, query),
        confidence_score: calculateConfidenceScore(movie, finalGenres, mood, query),
        source: 'smart-local',
      }))

      // Attach explanations (always-on)
      const explanationService = new ExplanationService()
      try {
        const explanations = await explanationService.generateExplanationsForMovies(user.id, enhancedMovies)
        enhancedMovies = enhancedMovies.map(movie => ({
          ...movie,
          explanation: explanations.get(movie.id) || null
        }))
      } catch (error) {
        logger.warn(`Failed to generate batch explanations: ${error instanceof Error ? error.message : String(error)}`)
        // Continue without explanations
      }

      // Save user interaction for future recommendations
      if (query || mood || finalGenres.length > 0) {
        await smartRecommenderV2.saveUserInteraction(user.id, 'smart-search', 'search', {
          source: 'search',
          query,
          mood,
          genres: finalGenres,
          timestamp: new Date().toISOString(),
        })
      }

      const totalPages = Math.ceil(total / limit)

      return NextResponse.json({
        success: true,
        data: enhancedMovies,
        total,
        pagination: {
          currentPage: page,
          limit,
          hasMore: page < totalPages,
          totalPages,
        },
        source: 'smart-local-v2',
        vectorEnhanced: true,
        filters: {
          genres: finalGenres,
          mood,
          query,
        },
        performance: {
          fast: true,
          local: true,
        },
      })
      } catch (searchError) {
        logger.error('Movie search error', { error: searchError instanceof Error ? searchError.message : String(searchError) })
        throw searchError
      }
    } catch (error) {
      logger.error('Smart recommendations V2 error', { error: error instanceof Error ? error.message : String(error) })

      // Fallback to standard preference-based recommendations on error
      const movieService = getMovieService()
      const preferencesResult = await movieService.getMoviesByPreferences(user.id, { limit, page })

      if (preferencesResult) {
        return NextResponse.json({
          success: true,
          data: preferencesResult.movies,
          total: preferencesResult.totalResults,
          pagination: {
            currentPage: preferencesResult.page,
            limit: limit,
            hasMore: preferencesResult.page * limit < preferencesResult.totalResults,
            totalPages: Math.ceil(preferencesResult.totalResults / limit),
          },
          source: 'local-preferences-fallback',
          vectorEnhanced: false,
        })
      }

      // Final fallback to popular movies
      const popularResult = await movieService.getPopularMovies({ limit, page })
      return NextResponse.json({
        success: true,
        data: popularResult.movies,
        total: popularResult.totalResults,
        pagination: {
          currentPage: popularResult.page,
          limit: limit,
          hasMore: popularResult.page * limit < popularResult.totalResults,
          totalPages: Math.ceil(popularResult.totalResults / limit),
        },
        source: 'popular-fallback',
        vectorEnhanced: false,
      })
    }
  }) // Close deduplication wrapper
}

// Helper function to generate recommendation reasoning
function generateRecommendationReason(
  movie: any,
  genres: string[],
  mood: string,
  query: string
): string {
  const reasons = []

  if (
    query &&
    (movie.title.toLowerCase().includes(query.toLowerCase()) ||
      movie.plot?.toLowerCase().includes(query.toLowerCase()))
  ) {
    reasons.push(`Matches your search for "${query}"`)
  }

  if (genres.length > 0 && movie.genre) {
    const matchingGenres = movie.genre.filter((g: string) => genres.includes(g))
    if (matchingGenres.length > 0) {
      reasons.push(`Perfect ${matchingGenres.join(', ')} match`)
    }
  }

  if (mood) {
    reasons.push(`Great for ${mood} mood`)
  }

  if (movie.rating && movie.rating > 7.5) {
    reasons.push(`Highly rated (${movie.rating}/10)`)
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for you'
}

// Helper function to calculate confidence score
function calculateConfidenceScore(
  movie: any,
  genres: string[],
  mood: string,
  query: string
): number {
  let score = 0.5 // Base score

  // Query match boost
  if (
    query &&
    (movie.title.toLowerCase().includes(query.toLowerCase()) ||
      movie.plot?.toLowerCase().includes(query.toLowerCase()))
  ) {
    score += 0.3
  }

  // Genre match boost
  if (genres.length > 0 && movie.genre) {
    const matchingGenres = movie.genre.filter((g: string) => genres.includes(g))
    score += (matchingGenres.length / genres.length) * 0.2
  }

  // Rating boost
  if (movie.rating) {
    score += (movie.rating / 10) * 0.2
  }

  return Math.min(score, 1.0)
}