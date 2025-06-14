/**
 * Smart Recommender V2 - Vector-Enhanced AI Recommendations
 * Uses semantic embeddings for intelligent movie discovery
 */

import { embeddingService } from './embedding-service'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env'
import type { Movie } from '@/types'

// Extended Movie type with recommendation properties
interface EnhancedMovie extends Movie {
  semanticSimilarity?: number
  recommendationReason?: string
  confidenceScore?: number
  matchCategories?: string[]
}

export interface SmartRecommendationOptions {
  userId: string
  userQuery?: string
  preferredGenres?: string[]
  mood?: string
  watchHistory?: string[]
  limit?: number
  semanticThreshold?: number
  diversityFactor?: number
}

export interface SmartRecommendationResult {
  movies: EnhancedMovie[]
  recommendations: Array<{
    movieId: string
    title: string
    reason: string
    confidence: number
    semanticMatch: number
    categories: string[]
  }>
  insights: {
    primaryReasons: string[]
    semanticMatches: number
    memoryInfluences: number
    diversityScore: number
  }
}

export interface UserContextVector {
  preferences: number[]
  behavior: number[]
  combined: number[]
  confidence: number
}

export interface UserInteractionContext {
  source?: 'search' | 'recommendation' | 'discovery' | 'watchlist'
  reason?: string
  rating?: number
  timestamp?: string
  sessionId?: string
  deviceType?: 'mobile' | 'desktop' | 'tablet'
  referrer?: string
  duration?: number
  [key: string]: string | number | boolean | undefined
}

export class SmartRecommenderV2 {
  private static instance: SmartRecommenderV2

  public static getInstance(): SmartRecommenderV2 {
    if (!SmartRecommenderV2.instance) {
      SmartRecommenderV2.instance = new SmartRecommenderV2()
    }
    return SmartRecommenderV2.instance
  }

  private getSupabaseClient() {
    const url = getSupabaseUrl()
    const key = getSupabaseServiceRoleKey()

    if (!url || !key) {
      throw new Error('Supabase configuration is missing')
    }

    return createClient(url, key)
  }

  /**
   * Generate vector-enhanced recommendations
   */
  async getSmartRecommendations(
    options: SmartRecommendationOptions
  ): Promise<SmartRecommendationResult> {
    console.log('🧠 Generating vector-enhanced recommendations for user:', options.userId)

    // Initialize candidates variable
    let candidates: Movie[] = []

    try {
      // Step 1: Build user context vector
      const userContext = await this.buildUserContextVector(options)

      // Step 2: Get candidate movies (either from query or general pool)
      candidates = await this.getCandidateMovies(options)

      // Step 3: Perform semantic matching
      const semanticMatches = await this.performSemanticMatching(candidates, userContext, options)

      // Step 4: Apply diversity and ranking
      const finalRecommendations = await this.applyDiversityRanking(semanticMatches, options)

      // Step 5: Generate insights
      const insights = this.generateInsights(finalRecommendations)

      return {
        movies: finalRecommendations.slice(0, options.limit || 10),
        recommendations: finalRecommendations.map(movie => {
          const enhancedMovie = movie as EnhancedMovie
          return {
            movieId: movie.id,
            title: movie.title || 'Unknown Title',
            reason: enhancedMovie.recommendationReason || 'AI recommendation',
            confidence: enhancedMovie.confidenceScore || 0.5,
            semanticMatch: enhancedMovie.semanticSimilarity || 0,
            categories: enhancedMovie.matchCategories || [],
          }
        }),
        insights,
      }
    } catch (error) {
      console.error('❌ Smart recommendations failed:', error)

      // Fallback to basic recommendations
      return {
        movies: candidates.slice(0, options.limit || 10),
        recommendations: candidates.slice(0, options.limit || 10).map((movie: Movie) => ({
          movieId: movie.id,
          title: movie.title || 'Unknown Title',
          reason: 'Fallback recommendation',
          confidence: 0.3,
          semanticMatch: 0,
          categories: ['fallback'],
        })),
        insights: {
          primaryReasons: ['System fallback'],
          semanticMatches: 0,
          memoryInfluences: 0,
          diversityScore: 0,
        },
      }
    }
  }

  /**
   * Build user context vector from preferences, behavior, and memories
   */
  private async buildUserContextVector(
    options: SmartRecommendationOptions
  ): Promise<UserContextVector> {
    const { userId, userQuery, preferredGenres, mood } = options

    // Create context text from user preferences
    const contextParts: string[] = []

    if (userQuery) {
      contextParts.push(`User query: ${userQuery}`)
    }

    if (preferredGenres && preferredGenres.length > 0) {
      contextParts.push(`Preferred genres: ${preferredGenres.join(', ')}`)
    }

    if (mood) {
      contextParts.push(`Mood: ${mood}`)
    }

    // Get user memories from vector database
    let memoryContext = ''
    if (contextParts.length > 0) {
      const queryText = contextParts.join('. ')
      const memories = await embeddingService.searchUserMemories(userId, queryText)

      if (memories.length > 0) {
        memoryContext = memories.map(m => m.content).join('. ')
        contextParts.push(`Previous preferences: ${memoryContext}`)
      }
    }

    // Generate context embedding
    const fullContext = contextParts.join('. ') || 'General movie preferences'
    const contextEmbedding = await embeddingService.generateEmbedding(fullContext, 'memory')

    return {
      preferences: contextEmbedding.embedding,
      behavior: contextEmbedding.embedding, // For now, same as preferences
      combined: contextEmbedding.embedding,
      confidence: Math.min(0.8, 0.4 + contextParts.length * 0.1),
    }
  }

  /**
   * Get candidate movies for recommendation
   */
  private async getCandidateMovies(options: SmartRecommendationOptions): Promise<Movie[]> {
    const supabase = this.getSupabaseClient()
    const limit = Math.min(100, (options.limit || 10) * 5) // Get more candidates for filtering

    try {
      if (options.userQuery) {
        // Search-based candidates
        const { data } = await supabase
          .from('movies')
          .select('*')
          .or(`title.ilike.%${options.userQuery}%,plot.ilike.%${options.userQuery}%`)
          .limit(limit)

        return data || []
      } else {
        // General popular candidates
        const { data } = await supabase
          .from('movies')
          .select('*')
          .not('rating', 'is', null)
          .order('rating', { ascending: false })
          .limit(limit)

        return data || []
      }
    } catch (error) {
      console.error('❌ Failed to get candidate movies:', error)
      return []
    }
  }

  /**
   * Perform semantic matching between user context and movies
   */
  private async performSemanticMatching(
    candidates: Movie[],
    userContext: UserContextVector,
    options: SmartRecommendationOptions
  ): Promise<EnhancedMovie[]> {
    const enhancedMovies: EnhancedMovie[] = []

    for (const movie of candidates) {
      try {
        // Get or generate movie embeddings
        let movieEmbedding = await this.getMovieEmbedding(movie)

        if (!movieEmbedding) {
          // Generate embedding if not exists
          const embeddingData = await embeddingService.generateMovieEmbeddings(movie)
          await embeddingService.saveMovieEmbeddings(embeddingData)
          movieEmbedding = embeddingData.combinedEmbedding
        }

        // Calculate semantic similarity
        const similarity = this.calculateCosineSimilarity(userContext.combined, movieEmbedding)

        // Generate recommendation reason
        const reason = this.generateRecommendationReason(movie, similarity, options)

        // Calculate confidence score
        const confidence = this.calculateConfidenceScore(similarity, userContext.confidence, movie)

        // Determine match categories
        const categories = this.determineMatchCategories(movie, options, similarity)

        // Create enhanced movie with proper typing
        const enhancedMovie: EnhancedMovie = {
          ...movie,
          semanticSimilarity: similarity,
          recommendationReason: reason,
          confidenceScore: confidence,
          matchCategories: categories,
        }

        enhancedMovies.push(enhancedMovie)
      } catch (error) {
        console.error(`❌ Failed to process movie ${movie.title}:`, error)
        // Include movie without enhancement
        const basicEnhancedMovie: EnhancedMovie = {
          ...movie,
          semanticSimilarity: 0,
          recommendationReason: 'Basic recommendation',
          confidenceScore: 0.3,
          matchCategories: ['basic'],
        }
        enhancedMovies.push(basicEnhancedMovie)
      }
    }

    return enhancedMovies
  }

  /**
   * Get movie embedding from database
   */
  private async getMovieEmbedding(movie: Movie): Promise<number[] | null> {
    try {
      const supabase = this.getSupabaseClient()
      const { data } = await supabase
        .from('movie_embeddings')
        .select('combined_embedding')
        .eq('movie_id', movie.id)
        .single()

      return data?.combined_embedding || null
    } catch {
      return null
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      const aVal = vecA[i] || 0
      const bVal = vecB[i] || 0
      dotProduct += aVal * bVal
      normA += aVal * aVal
      normB += bVal * bVal
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude > 0 ? dotProduct / magnitude : 0
  }

  /**
   * Generate human-readable recommendation reason
   */
  private generateRecommendationReason(
    movie: Movie,
    similarity: number,
    options: SmartRecommendationOptions
  ): string {
    const reasons: string[] = []

    if (similarity > 0.8) {
      reasons.push('Perfect match for your preferences')
    } else if (similarity > 0.6) {
      reasons.push('Great match for your taste')
    } else if (similarity > 0.4) {
      reasons.push('Good match for your interests')
    } else {
      reasons.push('Recommended for you')
    }

    if (options.preferredGenres && movie.genre) {
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
      const matchingGenres = movieGenres.filter(g =>
        options.preferredGenres!.some(pg => g.toLowerCase().includes(pg.toLowerCase()))
      )

      if (matchingGenres.length > 0) {
        reasons.push(`Matches your ${matchingGenres.join(', ')} preferences`)
      }
    }

    if (movie.rating && movie.rating > 8) {
      reasons.push('Highly rated')
    }

    return reasons.join(' • ')
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(
    similarity: number,
    userConfidence: number,
    movie: Movie
  ): number {
    let confidence = similarity * userConfidence

    // Boost confidence for popular/well-rated movies
    if (movie.rating && movie.rating > 8) {
      confidence *= 1.2
    }

    // Ensure confidence is between 0 and 1
    return Math.min(1, Math.max(0, confidence))
  }

  /**
   * Determine match categories
   */
  private determineMatchCategories(
    movie: Movie,
    options: SmartRecommendationOptions,
    similarity: number
  ): string[] {
    const categories: string[] = []

    if (similarity > 0.7) {
      categories.push('semantic-match')
    }

    if (options.preferredGenres && movie.genre) {
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
      const hasGenreMatch = movieGenres.some(g =>
        options.preferredGenres!.some(pg => g.toLowerCase().includes(pg.toLowerCase()))
      )

      if (hasGenreMatch) {
        categories.push('genre-match')
      }
    }

    if (movie.rating && movie.rating > 8) {
      categories.push('high-quality')
    }

    if (options.mood && movie.plot?.toLowerCase().includes(options.mood.toLowerCase())) {
      categories.push('mood-match')
    }

    return categories.length > 0 ? categories : ['general']
  }

  /**
   * Apply diversity ranking to avoid too similar recommendations
   */
  private async applyDiversityRanking(
    movies: EnhancedMovie[],
    options: SmartRecommendationOptions
  ): Promise<EnhancedMovie[]> {
    const diversityFactor = options.diversityFactor || 0.3
    const limit = options.limit || 10

    // Sort by confidence score first
    const sortedMovies = movies.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))

    // Apply diversity selection
    const selectedMovies: EnhancedMovie[] = []
    const usedGenres = new Set<string>()

    for (const movie of sortedMovies) {
      if (selectedMovies.length >= limit) break

      // Check genre diversity
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre || 'unknown']
      const hasNewGenre = movieGenres.some(g => !usedGenres.has(g))

      // Include if high confidence or adds diversity
      if (selectedMovies.length < limit * (1 - diversityFactor) || hasNewGenre) {
        selectedMovies.push(movie)
        movieGenres.forEach(g => usedGenres.add(g))
      }
    }

    return selectedMovies
  }

  /**
   * Generate insights about the recommendations
   */
  private generateInsights(
    recommendations: EnhancedMovie[]
  ): SmartRecommendationResult['insights'] {
    const semanticMatches = recommendations.filter(m => (m.semanticSimilarity || 0) > 0.6).length

    const memoryInfluences = recommendations.filter(m =>
      m.matchCategories?.includes('semantic-match')
    ).length

    const primaryReasons = recommendations
      .slice(0, 5)
      .map(m => m.recommendationReason)
      .filter((reason): reason is string => Boolean(reason))

    const diversityScore =
      new Set(recommendations.flatMap(m => m.genre || [])).size /
      Math.max(1, recommendations.length)

    return {
      primaryReasons,
      semanticMatches,
      memoryInfluences,
      diversityScore: Math.round(diversityScore * 100) / 100,
    }
  }

  /**
   * Save user interaction for future recommendations
   */
  async saveUserInteraction(
    userId: string,
    movieId: string,
    interactionType: 'view' | 'like' | 'dislike' | 'rate' | 'search',
    context?: UserInteractionContext
  ): Promise<void> {
    try {
      const interactionText = `User ${interactionType} movie ${movieId}`
      const confidence = this.getInteractionConfidence(interactionType)

      await embeddingService.saveUserMemory({
        userId,
        type: 'interaction',
        content: interactionText,
        metadata: {
          movieId,
          interactionType,
          timestamp: new Date().toISOString(),
          ...context,
        },
        confidence,
      })

      console.log(`💾 Saved user interaction: ${userId} ${interactionType} ${movieId}`)
    } catch (error) {
      console.error('❌ Failed to save user interaction:', error)
    }
  }

  /**
   * Get confidence score for different interaction types
   */
  private getInteractionConfidence(interactionType: string): number {
    const confidenceMap: Record<string, number> = {
      like: 0.9,
      rate: 0.8,
      view: 0.6,
      search: 0.7,
      dislike: 0.9, // High confidence for negative signals too
    }

    return confidenceMap[interactionType] || 0.5
  }
}

// Export singleton instance
export const smartRecommenderV2 = SmartRecommenderV2.getInstance()
