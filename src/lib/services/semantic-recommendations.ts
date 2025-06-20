import { embeddingService } from '@/lib/ai/embedding-service'
import type { Movie } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-generated'

type TypedSupabaseClient = SupabaseClient<Database>

// Enhanced movie type with semantic search data
export interface SemanticMovie extends Movie {
  semanticSimilarity: number
  recommendationReason: string
  confidence: number
}

export interface SemanticRecommendationRequest {
  userId: string
  query?: string
  preferredGenres?: string[]
  mood?: string
  limit?: number
  semanticThreshold?: number
}

export interface RecommendationInsights {
  method: 'semantic' | 'preference-based' | 'fallback'
  semanticMatches: number
  totalCandidates: number
  diversityScore: number
}

export interface SemanticRecommendationResponse {
  movies: SemanticMovie[]
  insights: RecommendationInsights
  pagination: {
    currentPage: number
    limit: number
    hasMore: boolean
    totalResults: number
  }
}

export class SemanticRecommendationService {
  constructor(private supabase: TypedSupabaseClient) {}

  async generateRecommendations(
    request: SemanticRecommendationRequest
  ): Promise<SemanticRecommendationResponse> {
    const { userId, query, preferredGenres, mood, limit = 10, semanticThreshold = 0.7 } = request

    console.log('🔍 Semantic search request:', { userId, query, preferredGenres, mood })

    let recommendedMovies: SemanticMovie[] = []
    let insights: RecommendationInsights = {
      method: 'fallback',
      semanticMatches: 0,
      totalCandidates: 0,
      diversityScore: 0,
    }

    // Try semantic search first if query provided
    if (query) {
      recommendedMovies = await this.performSemanticSearch(
        query,
        semanticThreshold,
        limit,
        insights
      )
    }

    // Fallback to preference-based recommendations
    if (recommendedMovies.length === 0) {
      recommendedMovies = await this.performPreferenceBasedSearch(preferredGenres, limit, insights)
    }

    // Calculate diversity score
    this.calculateDiversityScore(recommendedMovies, insights)

    // Save user search memory
    if (userId && query) {
      await this.saveSearchMemory(userId, query, preferredGenres, mood, recommendedMovies.length)
    }

    return {
      movies: recommendedMovies,
      insights,
      pagination: {
        currentPage: 1,
        limit,
        hasMore: false,
        totalResults: recommendedMovies.length,
      },
    }
  }

  private async performSemanticSearch(
    query: string,
    semanticThreshold: number,
    limit: number,
    insights: RecommendationInsights
  ): Promise<SemanticMovie[]> {
    console.log('🧠 Using semantic search for query:', query)

    const semanticResults = await embeddingService.searchSimilarMovies(
      query,
      semanticThreshold,
      limit * 3 // Get more candidates for filtering
    )

    insights.semanticMatches = semanticResults.length
    insights.method = 'semantic'

    if (semanticResults.length === 0) {
      return []
    }

    // Get full movie details
    const movieIds = semanticResults.map(r => r.movieId)
    const { data: movies } = await this.supabase
      .from('movies')
      .select('*')
      .in('id', movieIds)
      .limit(limit * 2)

    if (!movies) {
      return []
    }

    // Add semantic scores and apply basic filtering
    const recommendedMovies = movies
      .map(movie => {
        const semanticMatch = semanticResults.find(r => r.movieId === movie.id)
        return {
          ...movie,
          semanticSimilarity: semanticMatch?.similarity || 0,
          recommendationReason: this.generateReason(movie, semanticMatch?.similarity || 0),
          confidence: Math.min(0.9, (semanticMatch?.similarity || 0) * 1.2),
        }
      })
      .sort((a, b) => b.semanticSimilarity - a.semanticSimilarity)
      .slice(0, limit)

    insights.totalCandidates = movies.length
    return recommendedMovies
  }

  private async performPreferenceBasedSearch(
    preferredGenres: string[] | undefined,
    limit: number,
    insights: RecommendationInsights
  ): Promise<SemanticMovie[]> {
    console.log('📋 Using preference-based fallback')

    let query = this.supabase
      .from('movies')
      .select('*')
      .not('rating', 'is', null)
      .order('rating', { ascending: false })

    // Apply genre filtering if provided
    if (preferredGenres && preferredGenres.length > 0) {
      const genreConditions = preferredGenres.map((genre: string) => `genre.ilike.%${genre}%`)
      query = query.or(genreConditions.join(','))
    }

    const { data: fallbackMovies } = await query.limit(limit)

    if (!fallbackMovies) {
      return []
    }

    const recommendedMovies = fallbackMovies.map(movie => ({
      ...movie,
      semanticSimilarity: 0,
      recommendationReason: 'Based on your preferences',
      confidence: 0.4,
    }))

    insights.method = 'preference-based'
    insights.totalCandidates = fallbackMovies.length
    return recommendedMovies
  }

  private calculateDiversityScore(movies: SemanticMovie[], insights: RecommendationInsights): void {
    if (movies.length === 0) return

    const uniqueGenres = new Set(
      movies.flatMap(movie =>
        Array.isArray(movie.genre) ? movie.genre : [movie.genre || 'unknown']
      )
    )
    insights.diversityScore = Math.round((uniqueGenres.size / movies.length) * 100) / 100
  }

  private async saveSearchMemory(
    userId: string,
    query: string,
    preferredGenres: string[] | undefined,
    mood: string | undefined,
    resultsCount: number
  ): Promise<void> {
    try {
      await embeddingService.saveUserMemory({
        userId,
        type: 'search',
        content: `Search query: ${query}`,
        metadata: {
          query,
          preferredGenres,
          mood,
          timestamp: new Date().toISOString(),
          resultsCount,
        },
        confidence: 0.7,
      })
    } catch (memoryError) {
      console.warn('⚠️ Failed to save search memory:', memoryError)
    }
  }

  private generateReason(movie: Movie, similarity: number): string {
    if (similarity > 0.8) {
      return `Perfect match • ${movie.genre ? `${Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre}` : 'Great choice'}`
    } else if (similarity > 0.6) {
      return `Great match • ${movie.rating ? `${movie.rating}/10 rated` : 'Recommended'}`
    } else if (similarity > 0.4) {
      return `Good match • ${movie.year ? `${movie.year}` : 'Popular choice'}`
    } else {
      return `Recommended for you • ${movie.genre ? `${Array.isArray(movie.genre) ? movie.genre[0] : movie.genre}` : 'Worth watching'}`
    }
  }
}
