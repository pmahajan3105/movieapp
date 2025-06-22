/**
 * Vector Embedding Service
 * Handles creation and management of semantic embeddings for movies and user memories
 */

import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env'
import type { Movie } from '@/types'

// Database row types for RPC results
interface MovieSearchRow {
  movie_id: string
  title: string
  similarity: number
}

interface MemorySearchRow {
  id: string
  memory_type: string
  content: string
  metadata: Record<string, any>
  confidence: number
  similarity: number
  created_at: string
}

export interface EmbeddingResponse {
  embedding: number[]
  text: string
  model: string
  usage?: {
    tokens: number
  }
}

export interface MovieEmbeddingData {
  movieId: string
  title: string
  plotEmbedding: number[]
  metadataEmbedding: number[]
  combinedEmbedding: number[]
  contentText: string
  metadataText: string
}

export interface UserMemory {
  userId: string
  type: 'preference' | 'interaction' | 'behavior' | 'rating' | 'search'
  content: string
  metadata: Record<string, any>
  confidence: number
}

export class EmbeddingService {
  private static instance: EmbeddingService

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }

  /**
   * Get Supabase client with service role for database operations
   */
  private getSupabaseClient() {
    const url = getSupabaseUrl()
    const key = getSupabaseServiceRoleKey()

    if (!url || !key) {
      throw new Error('Supabase configuration is missing')
    }

    return createClient(url, key)
  }

  /**
   * Generate embedding using the best available model
   * Currently using a simple approach - in production you'd use OpenAI, Anthropic, or local models
   */
  async generateEmbedding(
    text: string,
    type: 'movie' | 'memory' = 'movie'
  ): Promise<EmbeddingResponse> {
    try {
      console.log(`🧠 Generating ${type} embedding for text: ${text.substring(0, 100)}...`)

      // For now, we'll create a simple semantic embedding using text analysis
      // In production, you'd use OpenAI's text-embedding-ada-002 or similar
      const embedding = await this.createSemanticEmbedding(text)

      return {
        embedding,
        text,
        model: 'semantic-analyzer-v1',
        usage: {
          tokens: text.split(' ').length,
        },
      }
    } catch (error) {
      console.error('❌ Embedding generation failed:', error)
      // Fallback to a basic embedding
      return {
        embedding: this.createBasicEmbedding(text),
        text,
        model: 'basic-fallback',
        usage: {
          tokens: text.split(' ').length,
        },
      }
    }
  }

  /**
   * Create semantic embedding using AI-based text analysis
   * This is a simplified version - in production use proper embedding models
   */
  private async createSemanticEmbedding(text: string): Promise<number[]> {
    // Extract semantic features
    const features = this.extractSemanticFeatures(text)

    // Normalize to 1536 dimensions (standard embedding size)
    const embedding = new Array(1536).fill(0)

    // Map features to embedding dimensions
    features.forEach((feature, index) => {
      if (index < embedding.length) {
        embedding[index] = feature
      }
    })

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => (magnitude > 0 ? val / magnitude : 0))
  }

  /**
   * Extract semantic features from text
   */
  private extractSemanticFeatures(text: string): number[] {
    const features: number[] = []
    const lowerText = text.toLowerCase()

    // Genre-based features
    const genres = [
      'action',
      'comedy',
      'drama',
      'horror',
      'sci-fi',
      'romance',
      'thriller',
      'fantasy',
      'adventure',
      'mystery',
    ]
    genres.forEach(genre => {
      features.push(lowerText.includes(genre) ? 1.0 : 0.0)
    })

    // Mood features
    const moods = [
      'dark',
      'light',
      'serious',
      'funny',
      'intense',
      'calm',
      'exciting',
      'emotional',
      'mysterious',
      'uplifting',
    ]
    moods.forEach(mood => {
      features.push(lowerText.includes(mood) ? 0.8 : 0.0)
    })

    // Temporal features
    const decades = [
      '1980s',
      '1990s',
      '2000s',
      '2010s',
      '2020s',
      'classic',
      'modern',
      'contemporary',
    ]
    decades.forEach(decade => {
      features.push(lowerText.includes(decade) ? 0.6 : 0.0)
    })

    // Quality indicators
    const qualityWords = [
      'award',
      'oscar',
      'acclaimed',
      'masterpiece',
      'brilliant',
      'excellent',
      'outstanding',
      'superb',
    ]
    const qualityScore = qualityWords.reduce(
      (score, word) => score + (lowerText.includes(word) ? 0.1 : 0),
      0
    )
    features.push(Math.min(qualityScore, 1.0))

    // Text length and complexity
    features.push(Math.min(text.length / 1000, 1.0)) // Normalized length
    features.push(Math.min(text.split(' ').length / 100, 1.0)) // Word count

    // Add random noise for remaining dimensions to reach desired length
    while (features.length < 100) {
      features.push(Math.random() * 0.1 - 0.05) // Small random values
    }

    return features
  }

  /**
   * Fallback embedding for when semantic analysis fails
   */
  private createBasicEmbedding(text: string): number[] {
    const hash = this.simpleHash(text)
    const embedding = new Array(1536).fill(0)

    // Create deterministic but pseudo-random embedding based on text hash
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1
    }

    return embedding
  }

  /**
   * Simple hash function for deterministic embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }

  /**
   * Generate embeddings for a movie
   */
  async generateMovieEmbeddings(movie: Movie): Promise<MovieEmbeddingData> {
    // Create content text for plot embedding
    const contentText = [movie.plot || '', movie.title || '', `Year: ${movie.year || 'Unknown'}`]
      .filter(Boolean)
      .join('. ')

    // Create metadata text for genre/cast embedding
    const metadataText = [
      `Genres: ${Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || 'Unknown'}`,
      `Director: ${movie.director || 'Unknown'}`,
      `Cast: ${movie.actors || 'Unknown'}`,
      `Rating: ${movie.rating || 'Unknown'}`,
    ].join('. ')

    // Generate individual embeddings
    const [plotResponse, metadataResponse] = await Promise.all([
      this.generateEmbedding(contentText, 'movie'),
      this.generateEmbedding(metadataText, 'movie'),
    ])

    // Create combined embedding (average of plot and metadata)
    const combinedEmbedding = plotResponse.embedding.map(
      (val, idx) => (val + (metadataResponse.embedding?.[idx] || 0)) / 2
    )

    return {
      movieId: movie.id,
      title: movie.title || 'Unknown Title',
      plotEmbedding: plotResponse.embedding,
      metadataEmbedding: metadataResponse.embedding,
      combinedEmbedding,
      contentText,
      metadataText,
    }
  }

  /**
   * Save movie embeddings to database
   */
  async saveMovieEmbeddings(embeddingData: MovieEmbeddingData): Promise<boolean> {
    try {
      const supabase = this.getSupabaseClient()

      const { error } = await supabase.from('movie_embeddings').upsert({
        movie_id: embeddingData.movieId,
        title: embeddingData.title,
        plot_embedding: embeddingData.plotEmbedding,
        metadata_embedding: embeddingData.metadataEmbedding,
        combined_embedding: embeddingData.combinedEmbedding,
        content_text: embeddingData.contentText,
        metadata_text: embeddingData.metadataText,
      })

      if (error) {
        console.error('❌ Failed to save movie embeddings:', error)
        return false
      }

      console.log(`✅ Saved embeddings for movie: ${embeddingData.title}`)
      return true
    } catch (error) {
      console.error('❌ Error saving movie embeddings:', error)
      return false
    }
  }

  /**
   * Generate and save user memory
   */
  async saveUserMemory(memory: UserMemory): Promise<boolean> {
    try {
      const embeddingResponse = await this.generateEmbedding(memory.content, 'memory')
      const supabase = this.getSupabaseClient()

      const { error } = await supabase.from('user_memories').insert({
        user_id: memory.userId,
        memory_type: memory.type,
        content: memory.content,
        embedding: embeddingResponse.embedding,
        metadata: memory.metadata,
        confidence: memory.confidence,
      })

      if (error) {
        console.error('❌ Failed to save user memory:', error)
        return false
      }

      console.log(`✅ Saved user memory: ${memory.type} - ${memory.content.substring(0, 50)}...`)
      return true
    } catch (error) {
      console.error('❌ Error saving user memory:', error)
      return false
    }
  }

  /**
   * Search for similar movies using semantic embedding
   */
  async searchSimilarMovies(
    queryText: string,
    threshold: number = 0.8,
    limit: number = 10
  ): Promise<Array<{ movieId: string; title: string; similarity: number }>> {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText, 'movie')
      const supabase = this.getSupabaseClient()

      const { data, error } = await supabase.rpc('search_movies_semantic', {
        query_embedding: queryEmbedding.embedding,
        match_threshold: threshold,
        match_count: limit,
      })

      if (error) {
        console.error('❌ Semantic search failed:', error)
        return []
      }

      if (!data) {
        return []
      }

      return data.map((row: MovieSearchRow) => ({
        movieId: row.movie_id,
        title: row.title,
        similarity: row.similarity,
      }))
    } catch (error) {
      console.error('❌ Error in semantic search:', error)
      return []
    }
  }

  /**
   * Search user memories for context
   */
  async searchUserMemories(
    userId: string,
    queryText: string,
    memoryTypes: string[] = ['preference', 'interaction', 'behavior'],
    threshold: number = 0.7,
    limit: number = 5
  ): Promise<
    Array<{
      id: string
      type: string
      content: string
      metadata: Record<string, any>
      confidence: number
      similarity: number
      createdAt: string
    }>
  > {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText, 'memory')
      const supabase = this.getSupabaseClient()

      const { data, error } = await supabase.rpc('search_user_memories', {
        user_id_param: userId,
        query_embedding: queryEmbedding.embedding,
        memory_types: memoryTypes,
        match_threshold: threshold,
        match_count: limit,
      })

      if (error) {
        console.error('❌ Memory search failed:', error)
        return []
      }

      return data.map((row: MemorySearchRow) => ({
        id: row.id,
        type: row.memory_type,
        content: row.content,
        metadata: row.metadata,
        confidence: row.confidence,
        similarity: row.similarity,
        createdAt: row.created_at,
      }))
    } catch (error) {
      console.error('❌ Error in memory search:', error)
      return []
    }
  }

  /**
   * Processes a list of movies in batches to generate and save their embeddings.
   * Includes a delay between batches to prevent rate-limiting on the embedding service.
   * @param movies - An array of movie objects to process.
   * @param batchSize - The number of movies to process in each batch.
   * @returns A promise that resolves to the number of movies successfully processed.
   */
  async batchProcessMovies(movies: Movie[], batchSize: number = 5): Promise<number> {
    let processed = 0

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize)

      const promises = batch.map(async movie => {
        try {
          const embeddingData = await this.generateMovieEmbeddings(movie)
          const saved = await this.saveMovieEmbeddings(embeddingData)
          return saved ? 1 : 0
        } catch (error) {
          console.error(`❌ Failed to process movie ${movie.title}:`, error)
          return 0
        }
      })

      const results = await Promise.all(promises)
      processed += results.reduce((sum: number, result: number) => sum + result, 0)

      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ Processed ${processed}/${movies.length} movies`)
    return processed
  }
}

export const embeddingService = EmbeddingService.getInstance()
