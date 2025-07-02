/**
 * Smart Recommender V2 - Vector-Enhanced AI Recommendations
 * Uses semantic embeddings for intelligent movie discovery
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { Movie } from '@/types'
import { analyzeTemporalGenreAffinity, TemporalPreferencesLite } from './behavioral-analysis'
import { embeddingService } from './embedding-service'

// Extended Movie type with recommendation properties
interface EnhancedMovie extends Movie {
  semanticSimilarity?: number
  recommendationReason?: string
  confidenceScore?: number
  matchCategories?: string[]
  preferenceMatch?: boolean
}

// Weight configuration interface
interface RecommenderWeights {
  version: string
  lastUpdated: string
  description: string
  weights: {
    semantic: { base: number; description: string }
    rating: { base: number; description: string }
    popularity: { base: number; description: string }
    recency: { base: number; description: string }
    preference: { genreMatch: number; description: string }
  }
  boosts: {
    trendingMultiplier: number
    preferenceGenreBoost: number
    recentReleaseBoost: number
    highRatingThreshold: number
    highRatingBoost: number
  }
  meta: {
    dynamicWeightsEnabled: boolean
    lastFittingDate: string | null
    fittingDataPoints: number
    notes: string
  }
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
    behavioralFactors?: any
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

// Add new interface for behavioral options
export interface EnhancedRecommendationOptions extends SmartRecommendationOptions {
  includeBehavioral?: boolean // enable temporal/behavioral boost
  preferenceInsights?: {
    insights: {
      top_genres?: Array<{ genre_id: string; count: number }>
      total_interactions?: number
    } | null
    confidence_score?: number
  } | null
}

export class SmartRecommenderV2 {
  private static instance: SmartRecommenderV2
  private weightsCache: RecommenderWeights | null = null
  private weightsCacheExpiry: number = 0
  private readonly WEIGHTS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  
  // Performance caches
  private vectorCache = new Map<string, number[]>()
  private similarityCache = new Map<string, number>()
  private userContextCache = new Map<string, any>()
  private readonly VECTOR_CACHE_TTL = 10 * 60 * 1000 // 10 minutes
  private readonly SIMILARITY_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly USER_CONTEXT_TTL = 15 * 60 * 1000 // 15 minutes

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
   * Load and cache recommender weights from config file
   */
  private async loadWeights(): Promise<RecommenderWeights> {
    const now = Date.now()
    
    // Return cached weights if still valid
    if (this.weightsCache && now < this.weightsCacheExpiry) {
      return this.weightsCache
    }

    try {
      // In production/serverless, weights might be in environment or database
      // For now, load from file system
      const configPath = path.join(process.cwd(), 'config', 'recommender-weights.json')
      
      let weightsData: RecommenderWeights
      
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf-8')
        weightsData = JSON.parse(rawData)
        logger.info('Loaded recommender weights from config file', { version: weightsData.version })
      } else {
        // Fallback to default weights if config file doesn't exist
        weightsData = this.getDefaultWeights()
        logger.warn('Config file not found, using default weights', { configPath })
      }

      // Cache the weights
      this.weightsCache = weightsData
      this.weightsCacheExpiry = now + this.WEIGHTS_CACHE_TTL
      
      return weightsData
    } catch (error) {
      logger.error('Failed to load recommender weights', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      
      // Return default weights on error
      const defaultWeights = this.getDefaultWeights()
      this.weightsCache = defaultWeights
      this.weightsCacheExpiry = now + this.WEIGHTS_CACHE_TTL
      return defaultWeights
    }
  }

  /**
   * Get default weights (fallback)
   */
  private getDefaultWeights(): RecommenderWeights {
    return {
      version: "1.0-default",
      lastUpdated: new Date().toISOString(),
      description: "Default weights (fallback)",
      weights: {
        semantic: { base: 0.4, description: "Base semantic similarity score from embeddings" },
        rating: { base: 0.25, description: "IMDb/TMDB rating influence" },
        popularity: { base: 0.15, description: "Movie popularity/vote count influence" },
        recency: { base: 0.1, description: "Release year recency boost" },
        preference: { genreMatch: 0.1, description: "User preference genre matching boost" }
      },
      boosts: {
        trendingMultiplier: 1.2,
        preferenceGenreBoost: 0.1,
        recentReleaseBoost: 0.05,
        highRatingThreshold: 7.5,
        highRatingBoost: 0.1
      },
      meta: {
        dynamicWeightsEnabled: false,
        lastFittingDate: null,
        fittingDataPoints: 0,
        notes: "Default fallback weights"
      }
    }
  }

  /**
   * Generate vector-enhanced recommendations
   */
  async getSmartRecommendations(
    options: SmartRecommendationOptions
  ): Promise<SmartRecommendationResult> {
    logger.info('Generating vector-enhanced recommendations for user', {
      userId: options.userId,
      userQuery: options.userQuery,
      preferredGenres: options.preferredGenres,
      limit: options.limit,
    })

    // Initialize candidates variable
    let candidates: Movie[] = []

    try {
      // Step 1: Build user context vector
      const userContext = await this.buildUserContextVector(options)

      // Step 2: Get candidate movies (either from query or general pool)
      candidates = await this.getCandidateMovies(options)

      // Step 3: Perform semantic matching
      const semanticMatches = await this.performSemanticMatching(candidates, userContext, options)

      // NEW Step 3b: Talent boost (actor/director)
      const talentPrefs = await this.getTalentPreferences(options.userId)
      const talentBoostedMatches = this.applyTalentBoost(semanticMatches, talentPrefs)

      // NEW Step 3c: storyline similarity
      const userStoryline = await this.getUserStorylineProfile(options.userId)
      if (userStoryline) {
        talentBoostedMatches.forEach(m => {
          if ((m as any).storyline_embedding && Array.isArray((m as any).storyline_embedding)) {
            const sim = this.calculateCosine((m as any).storyline_embedding as number[], userStoryline)
            m.confidenceScore = (m.confidenceScore || 0.5) + sim * 0.2 // incorporate weight lightly
            m.matchCategories = [...(m.matchCategories || []), 'storyline-match']
          }
        })
      }

      // NEW Step 3d: review sentiment & social buzz adjustments
      const userSentiment = await this.getUserSentimentBias(options.userId)
      talentBoostedMatches.forEach(m => {
        // Sentiment alignment boost (±0.05)
        const rs = (m as any).review_sentiment as { critics?: number; audience?: number }
        if (rs && typeof rs.critics === 'number') {
          const alignment = 1 - Math.abs((rs.critics ?? 0.5) - userSentiment) // 0..1
          const boost = (alignment - 0.5) * 0.1 // -0.05..+0.05
          m.confidenceScore = Math.min(1, Math.max(0, (m.confidenceScore || 0.5) + boost))
          if (Math.abs(boost) > 0.02) {
            m.matchCategories = [...(m.matchCategories || []), 'review-match']
          }
        }

        // Social buzz cap – if movie very popular, limit total confidence contribution
        const buzz = (m as any).social_buzz_score as number | undefined
        if (buzz && buzz > 0.8) {
          m.confidenceScore = Math.min(0.85, m.confidenceScore || 0.85)
        }
      })

      // Step 4: Apply diversity and ranking
      const finalRecommendations = await this.applyDiversityRanking(talentBoostedMatches, options)

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
      logger.error('Smart recommendations failed', {
        userId: options.userId,
        error: error instanceof Error ? error.message : String(error),
        candidatesCount: candidates.length,
      })

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
   * Get candidate movies for recommendations
   * Option 1: Smart Hybrid - Live TMDB trending + smart caching
   */
  private async getCandidateMovies(options: SmartRecommendationOptions): Promise<Movie[]> {
    const supabase = this.getSupabaseClient()
    const limit = Math.min(100, (options.limit || 10) * 5) // Get more candidates for filtering

    try {
      if (options.userQuery) {
        // Search-based candidates - use existing search logic
        const { data } = await supabase
          .from('movies')
          .select('*')
          .or(`title.ilike.%${options.userQuery}%,plot.ilike.%${options.userQuery}%`)
          .limit(limit)

        return data || []
      } else {
        // NEW: Smart Hybrid approach for general recommendations
        return await this.getSmartHybridCandidates(limit)
      }
    } catch (error) {
      logger.dbError(
        'get-candidate-movies',
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: options.userId,
          userQuery: options.userQuery,
          limit,
        }
      )
      return []
    }
  }

  /**
   * Smart Hybrid: Fresh TMDB trending + smart caching
   */
  private async getSmartHybridCandidates(limit: number): Promise<Movie[]> {
    // Step 1: Try cached trending movies first (24-hour cache)
    let trendingMovies = await this.getCachedTrendingMovies()
    
    if (!trendingMovies || trendingMovies.length < 20) {
      // Step 2: Fetch fresh TMDB trending data
      trendingMovies = await this.fetchLiveTMDBTrending()
      
      if (trendingMovies.length > 0) {
        // Step 3: Cache the results with embeddings
        await this.cacheTrendingMoviesWithEmbeddings(trendingMovies)
      }
    }
    
    // Step 4: Blend with high-quality local movies
    const localTopRated = await this.getLocalTopRated(Math.floor(limit * 0.3)) // 30% local
    
    // Step 5: Combine and deduplicate
    const combinedMovies = this.blendMovieSources(trendingMovies, localTopRated)
    
    return combinedMovies.slice(0, limit)
  }

  /**
   * Get cached trending movies (24-hour TTL)
   */
  private async getCachedTrendingMovies(): Promise<Movie[]> {
    const supabase = this.getSupabaseClient()
    
    try {
      const { data } = await supabase
        .from('trending_movies_cache')
        .select('movies_data, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (data) {
        const cacheAge = Date.now() - new Date(data.created_at).getTime()
        const twentyFourHours = 24 * 60 * 60 * 1000
        
        if (cacheAge < twentyFourHours) {
          logger.info('Using cached trending movies', { cacheAgeHours: cacheAge / (60 * 60 * 1000) })
          return data.movies_data || []
        }
      }
    } catch (error) {
      logger.warn('Failed to get cached trending movies', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    
    return []
  }

  /**
   * Fetch live TMDB trending movies
   */
  private async fetchLiveTMDBTrending(): Promise<Movie[]> {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      logger.warn('TMDB API key not configured, falling back to local movies')
      return []
    }

    try {
      const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&page=1`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }
      
      const data = await response.json()
      const trendingMovies = data.results.slice(0, 50).map((movie: any) => this.transformTMDBToMovie(movie))
      
      logger.info('Fetched live TMDB trending movies', { count: trendingMovies.length })
      return trendingMovies
    } catch (error) {
      logger.error('Failed to fetch TMDB trending movies', {
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  /**
   * Transform TMDB movie data to our Movie type
   */
  private transformTMDBToMovie(tmdbMovie: any): Movie {
    return {
      id: tmdbMovie.id.toString(),
      title: tmdbMovie.title,
      plot: tmdbMovie.overview,
      genre: tmdbMovie.genre_ids?.map((id: number) => this.getGenreNameFromId(id)).filter(Boolean) || [],
      rating: tmdbMovie.vote_average,
      poster_url: tmdbMovie.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        : undefined,
      backdrop_url: tmdbMovie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${tmdbMovie.backdrop_path}`
        : undefined,
      release_date: tmdbMovie.release_date,
      vote_count: tmdbMovie.vote_count,
      genre_ids: tmdbMovie.genre_ids,
    }
  }

  /**
   * Get genre name from TMDB genre ID
   */
  private getGenreNameFromId(genreId: number): string {
    const genreMap: { [id: number]: string } = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
      80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
      14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
      9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    }
    return genreMap[genreId] || 'Unknown'
  }

  /**
   * Cache trending movies with embeddings
   */
  private async cacheTrendingMoviesWithEmbeddings(movies: Movie[]): Promise<void> {
    const supabase = this.getSupabaseClient()
    
    try {
      // Store in trending cache
      await supabase
        .from('trending_movies_cache')
        .insert({
          movies_data: movies,
          source: 'tmdb_trending',
          cached_at: new Date().toISOString()
        })
      
      // Generate embeddings in background (don't wait)
      this.generateEmbeddingsForMovies(movies).catch(error => {
        logger.warn('Background embedding generation failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      })
      
      logger.info('Cached trending movies', { count: movies.length })
    } catch (error) {
      logger.error('Failed to cache trending movies', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Generate embeddings for movies in background
   */
  private async generateEmbeddingsForMovies(movies: Movie[]): Promise<void> {
    const embeddingService = (await import('./embedding-service')).embeddingService
    
    for (const movie of movies) {
      try {
        // Check if embedding already exists
        const existing = await this.getMovieEmbedding(movie)
        if (!existing) {
          const embeddingData = await embeddingService.generateMovieEmbeddings(movie)
          await embeddingService.saveMovieEmbeddings(embeddingData)
        }
      } catch (error) {
        logger.warn(`Failed to generate embedding for movie ${movie.title}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  /**
   * Get high-quality local movies
   */
  private async getLocalTopRated(limit: number): Promise<Movie[]> {
    const supabase = this.getSupabaseClient()
    
    try {
      const { data } = await supabase
        .from('movies')
        .select('*')
        .not('rating', 'is', null)
        .gte('rating', 7.5) // High quality threshold
        .order('rating', { ascending: false })
        .limit(limit)

      return data || []
    } catch (error) {
      logger.warn('Failed to get local top-rated movies', {
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  /**
   * Blend trending and local movies intelligently
   */
  private blendMovieSources(trendingMovies: Movie[], localMovies: Movie[]): Movie[] {
    const seen = new Set<string>()
    const blended: Movie[] = []
    
    // Add trending movies first (70% of results)
    for (const movie of trendingMovies) {
      if (!seen.has(movie.id)) {
        seen.add(movie.id)
        blended.push({
          ...movie,
          // Mark as trending for potential boost
          matchCategories: ['trending']
        } as any)
      }
    }
    
    // Fill remaining with local high-quality movies
    for (const movie of localMovies) {
      if (!seen.has(movie.id)) {
        seen.add(movie.id)
        blended.push({
          ...movie,
          matchCategories: ['curated']
        } as any)
      }
    }
    
    return blended
  }

  /**
   * Perform semantic matching between user context and movies
   */
  private async performSemanticMatching(
    candidates: Movie[],
    userContext: UserContextVector,
    options: SmartRecommendationOptions
  ): Promise<EnhancedMovie[]> {
    // Process all movies in parallel for better performance
    const enhancedMoviesPromises = candidates.map(async movie => {
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
        const confidence = await this.calculateConfidenceScore(similarity, userContext.confidence, movie)

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

        return enhancedMovie
      } catch (error) {
        logger.error(`Failed to process movie ${movie.title}`, {
          movieId: movie.id,
          movieTitle: movie.title,
          error: error instanceof Error ? error.message : String(error),
        })
        // Include movie without enhancement
        const basicEnhancedMovie: EnhancedMovie = {
          ...movie,
          semanticSimilarity: 0,
          recommendationReason: 'Basic recommendation',
          confidenceScore: 0.3,
          matchCategories: ['basic'],
        }
        return basicEnhancedMovie
      }
    })

    // Wait for all movies to be processed
    const enhancedMovies = await Promise.all(enhancedMoviesPromises)
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
   * Calculate cosine similarity between two vectors with memoization
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    // Generate cache key for memoization
    const keyA = this.hashVector(vecA)
    const keyB = this.hashVector(vecB)
    const cacheKey = `${keyA}-${keyB}`
    
    // Check cache first
    const cached = this.getCachedSimilarity(cacheKey)
    if (cached !== null) {
      return cached
    }

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
    const similarity = magnitude > 0 ? dotProduct / magnitude : 0
    
    // Cache the result
    this.setCachedSimilarity(cacheKey, similarity)
    
    return similarity
  }

  /**
   * Generate a fast hash for vector caching
   */
  private hashVector(vector: number[]): string {
    // Simple hash for performance - first/last few elements + length
    const sample = [
      vector.length,
      ...vector.slice(0, 3),
      ...vector.slice(-2)
    ].map(n => Math.round((n || 0) * 1000))
    
    return sample.join('|')
  }

  /**
   * Get cached similarity with TTL check
   */
  private getCachedSimilarity(key: string): number | null {
    const cached = this.similarityCache.get(key)
    if (cached !== undefined) {
      return cached
    }
    return null
  }

  /**
   * Set cached similarity with automatic cleanup
   */
  private setCachedSimilarity(key: string, similarity: number): void {
    // Limit cache size to prevent memory leaks
    if (this.similarityCache.size > 1000) {
      // Remove oldest entries (simple FIFO)
      const keysToDelete = Array.from(this.similarityCache.keys()).slice(0, 200)
      keysToDelete.forEach(k => this.similarityCache.delete(k))
    }
    
    this.similarityCache.set(key, similarity)
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
  private async calculateConfidenceScore(
    similarity: number,
    userConfidence: number,
    movie: Movie
  ): Promise<number> {
    const weights = await this.loadWeights()
    
    let confidence = similarity * userConfidence

    // Boost confidence for popular/well-rated movies
    if (movie.rating && movie.rating > weights.boosts.highRatingThreshold) {
      confidence *= (1 + weights.boosts.highRatingBoost)
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
      const verb =
        interactionType === 'like'
          ? 'liked'
          : interactionType === 'dislike'
            ? 'disliked'
            : interactionType

      const interactionText = `User ${verb} movie ${movieId}`
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

      logger.info(`Saved user interaction`, {
        userId,
        movieId,
        interactionType,
        confidence,
        context: context ? Object.keys(context) : [],
      })
    } catch (error) {
      logger.error('Failed to save user interaction', {
        userId,
        movieId,
        interactionType,
        error: error instanceof Error ? error.message : String(error),
      })
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

  /**
   * Vector recommendations + optional temporal behavioral boost
   */
  async getEnhancedRecommendations(
    options: EnhancedRecommendationOptions
  ): Promise<SmartRecommendationResult> {
    // 1. Get base vector recommendations first
    const base = await this.getSmartRecommendations(options)

    // Early-exit if behavioral logic not requested
    if (!options.includeBehavioral) {
      return base
    }

    // 2. Fetch lightweight temporal preferences (hourly+weekly genre affinity)
    let temporalPrefs: TemporalPreferencesLite | null = null
    try {
      temporalPrefs = await analyzeTemporalGenreAffinity(options.userId)
    } catch (err) {
      logger.warn('Behavioral affinity analysis failed – falling back to base recs', {
        userId: options.userId,
        error: err instanceof Error ? err.message : String(err),
      })
      return base
    }

    const boostedMovies = this.applyTemporalBoost(base.movies, temporalPrefs)

    // 3. Apply preference insights boost if available
    const finalMovies = options.preferenceInsights?.insights
      ? this.applyPreferenceInsightsBoost(boostedMovies, options.preferenceInsights.insights)
      : boostedMovies

    return {
      ...base,
      movies: finalMovies,
      insights: {
        ...base.insights,
        behavioralFactors: {
          timeOfDay: temporalPrefs?.timeOfDay || {},
          dayOfWeek: temporalPrefs?.dayOfWeek || {},
          preferenceInsights: options.preferenceInsights?.insights || null,
        },
      },
    }
  }

  /**
   * Apply a simple boost (≤0.25) based on genre-time match – now ENV-configurable
   */
  private applyTemporalBoost(
    movies: EnhancedMovie[],
    prefs: TemporalPreferencesLite
  ): EnhancedMovie[] {
    // Allow runtime tuning via ENV (defaults keep previous behaviour)
    const HOUR_WEIGHT = Number.parseFloat(process.env.BEHAVIORAL_HOUR_WEIGHT || '0.1')
    const DAY_WEIGHT = Number.parseFloat(process.env.BEHAVIORAL_DAY_WEIGHT || '0.15')

    const hour = new Date().getHours()
    const dow = new Date().getDay()

    const hourPref = prefs.timeOfDay[hour]
    const dayPref = prefs.dayOfWeek[dow]

    return movies
      .map(m => {
        let boost = 0

        if (hourPref && Array.isArray(m.genre_ids)) {
          const { preferredGenres, confidence } = hourPref
          const matches = m.genre_ids.filter(id => preferredGenres.includes(String(id)))
          if (matches.length > 0) {
            // up to 3 × weight × confidence
            boost += HOUR_WEIGHT * confidence * matches.length
          }
        }

        if (dayPref && Array.isArray(m.genre_ids)) {
          const { preferredGenres } = dayPref
          const matches = m.genre_ids.filter(id => preferredGenres.includes(String(id)))
          if (matches.length > 0) {
            boost += DAY_WEIGHT
          }
        }

        return {
          ...m,
          confidenceScore: Math.min(1, (m.confidenceScore || 0.5) + boost),
        }
      })
      .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
  }

  private async getTalentPreferences(userId: string): Promise<{ actors: string[]; directors: string[] }> {
    try {
      const supabase = this.getSupabaseClient()
      const { data, error } = await supabase
        .from('conversational_memory')
        .select('memory_type, memory_key')
        .eq('user_id', userId)
        .in('memory_type', ['actor_preference', 'director_preference'])
        .gt('preference_strength', 0)

      if (error) {
        logger.warn('Failed to fetch talent preferences', { userId, error: error.message })
        return { actors: [], directors: [] }
      }

      const actors: string[] = []
      const directors: string[] = []
      for (const row of data || []) {
        if (row.memory_type === 'actor_preference' && row.memory_key) {
          actors.push(String(row.memory_key).toLowerCase())
        }
        if (row.memory_type === 'director_preference' && row.memory_key) {
          directors.push(String(row.memory_key).toLowerCase())
        }
      }
      return { actors, directors }
    } catch (err) {
      logger.warn('Talent preference query failed', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
      return { actors: [], directors: [] }
    }
  }

  /**
   * Apply actor/director preference boost (≤0.3)
   */
  private applyTalentBoost(
    movies: EnhancedMovie[],
    prefs: { actors: string[]; directors: string[] }
  ): EnhancedMovie[] {
    if (prefs.actors.length === 0 && prefs.directors.length === 0) return movies

    return movies
      .map(m => {
        let boost = 0
        const cast = (m.cast || m.actors || []) as string[]
        const directors = (m.director || []) as string[]

        // Director match – single boost
        if (directors.some(d => prefs.directors.includes(d.toLowerCase()))) {
          boost += 0.15
          m.matchCategories = [...(m.matchCategories || []), 'director-match']
        }

        // Actor matches – up to 3 matches (0.3)
        const actorMatches = cast.filter(a => prefs.actors.includes(a.toLowerCase()))
        if (actorMatches.length > 0) {
          boost += Math.min(0.3, 0.1 * actorMatches.length)
          m.matchCategories = [...(m.matchCategories || []), 'actor-match']
        }

        return {
          ...m,
          confidenceScore: Math.min(1, (m.confidenceScore || 0.5) + boost),
        }
      })
      .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
  }

  /**
   * Compute average storyline embedding of movies the user liked (rating >=4 or like interaction)
   */
  private async getUserStorylineProfile(userId: string): Promise<number[] | null> {
    try {
      const supabase = this.getSupabaseClient()
      const { data } = await supabase.rpc('get_user_storyline_profile', { p_user_id: userId })
      // Assume RPC returns { embedding: number[] } or null
      if (data && data.embedding) return data.embedding as number[]
    } catch (err) {
      logger.warn('Failed to fetch storyline profile', { userId, error: String(err) })
    }
    return null
  }

  private calculateCosine(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
      return 0
    }
    
    const dot = vecA.reduce((sum, a, i) => sum + a * (vecB[i] ?? 0), 0)
    const magA = Math.sqrt(vecA.reduce((s, a) => s + a * a, 0))
    const magB = Math.sqrt(vecB.reduce((s, b) => s + b * b, 0))
    if (magA === 0 || magB === 0) return 0
    return dot / (magA * magB)
  }

  private async getUserSentimentBias(userId: string): Promise<number> {
    try {
      const supabase = this.getSupabaseClient()
      const { data, error } = await supabase.rpc('get_user_sentiment_bias', { p_user_id: userId })
      if (error) throw error
      if (data !== null && !isNaN(Number(data))) {
        return Number(data)
      }
    } catch (err) {
      logger.warn('Sentiment bias RPC failed', { userId, error: String(err) })
    }
    return 0.5 // neutral default
  }

  private applyPreferenceInsightsBoost(
    movies: EnhancedMovie[],
    insights: {
      top_genres?: Array<{ genre_id: string; count: number }>
      total_interactions?: number
    } | null
  ): EnhancedMovie[] {
    if (!insights || !insights.top_genres || insights.top_genres.length === 0) {
      return movies
    }

    const genreBoost = 0.1

    return movies.map(m => {
      let boost = 0

      if (m.genre) {
        const movieGenres = Array.isArray(m.genre) ? m.genre : [m.genre]
        const genreMatches = movieGenres.filter(g =>
          insights.top_genres?.some(genre => g.toLowerCase().includes(genre.genre_id.toLowerCase()))
        )
        if (genreMatches.length > 0) {
          boost += genreBoost * genreMatches.length
          m.preferenceMatch = true // Mark as preference match
        }
      }

      return {
        ...m,
        confidenceScore: Math.min(1, (m.confidenceScore || 0.5) + boost),
      }
    })
  }
}

// Export singleton instance
export const smartRecommenderV2 = SmartRecommenderV2.getInstance()
