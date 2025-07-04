import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env'
import { logger } from '../logger'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import { RecommendationExplanation } from '@/types/explanation'
import type { Movie } from '@/types'


export class ExplanationService {
  private supabase = createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!)

  /**
   * Return an explanation for user+movie, cached in DB if already generated.
   */
  async getExplanation(userId: string, movieId: string, movieMeta: any): Promise<RecommendationExplanation> {
    // 1. cache check
    const { data } = await this.supabase
      .from('recommendation_explanations')
      .select('*')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (data) {
      const memHit = await this.calculateMemoryHit(userId, movieMeta)
      return {
        primary_reason: data.primary_reason,
        explanation_type: data.explanation_type,
        confidence_score: data.confidence_score,
        discovery_factor: data.discovery_level,
        optimal_viewing_time: data.optimal_viewing_time || undefined,
        supporting_movies: (data.supporting_data?.supporting_movies as string[]) || [],
        memory_hit: memHit,
      }
    }

    // 2. generate with Claude (placeholder call)
    const generated = await this.generateWithClaude(userId, movieMeta)
    generated.memory_hit = await this.calculateMemoryHit(userId, movieMeta)

    // 3. store
    await this.supabase.from('recommendation_explanations').insert({
      user_id: userId,
      movie_id: movieId,
      explanation_type: generated.explanation_type,
      primary_reason: generated.primary_reason,
      confidence_score: generated.confidence_score,
      discovery_level: generated.discovery_factor,
      optimal_viewing_time: generated.optimal_viewing_time,
      supporting_movies: generated.supporting_movies,
      supporting_data: { supporting_movies: generated.supporting_movies },
    })

    return generated
  }

  private async generateWithClaude(userId: string, movie: any): Promise<RecommendationExplanation> {
    // Get user's rating history for context
    const userContext = await this.getUserContext(userId)

    // Build personalized prompt for Claude
    const genreNames = (movie.genre_ids || []).join(', ')
    const contextualPrompt = userContext ? 
      `\nUser's preference context:\n${userContext}\n` : 
      '\nNew user - focus on movie quality and broad appeal.\n'
    
    const prompt = `Generate a JSON explanation (keys snake_case) for why the following movie was recommended to a user. Return ONLY valid JSON with the following schema:\n{
  "primary_reason": string,                     // one sentence personalised reason
  "explanation_type": "similarity|pattern|mood|discovery|temporal",
  "confidence_score": number,                  // 0-100
  "discovery_factor": "safe|stretch|adventure",
  "optimal_viewing_time": string | null,       // optional suggestion
  "supporting_movies": string[]               // up to 3 movie titles that justify the pick
}\nMovie context:\n- id: ${movie.id}\n- title: ${movie.title}\n- release_year: ${movie.release_date?.split('-')[0] || 'N/A'}\n- genres: ${genreNames}\n${contextualPrompt}`;

    try {
      const claudePromise = anthropic.messages.create({
        model: claudeConfig.model,
        max_tokens: 400,
        temperature: claudeConfig.temperature,
        messages: [
          { role: 'user', content: prompt },
        ],
      })

      // 10s timeout for better reliability
      const response = await Promise.race([
        claudePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Claude timeout')), 10000)),
      ]) as any

      const textResponse = (response as any).content?.[0]?.text?.trim() || '{}'
      let parsed: any = {}
      try {
        parsed = JSON.parse(textResponse)
      } catch {
        logger.warn('Claude explanation JSON parse failed, falling back', { textResponse })
      }

      // Map to RecommendationExplanation interface with sensible fallbacks
      return {
        primary_reason: parsed.primary_reason || 'Recommended based on your viewing habits',
        explanation_type: parsed.explanation_type || 'similarity',
        confidence_score: parsed.confidence_score ?? 70,
        discovery_factor: parsed.discovery_factor || 'safe',
        optimal_viewing_time: parsed.optimal_viewing_time || undefined,
        supporting_movies: parsed.supporting_movies || [],
      }
    } catch (error) {
      logger.error('Claude generation error', { error: error instanceof Error ? error.message : String(error) })
      // Fallback explanation if Claude fails
      return {
        primary_reason: `Because you often enjoy ${genreNames || 'this genre'} movies and this matches your taste`,
        explanation_type: 'similarity',
        confidence_score: 60,
        discovery_factor: 'safe',
        supporting_movies: [],
      }
    }
  }

  async generateExplanation(
    userId: string,
    movie: any,
  ): Promise<RecommendationExplanation> {
    // Check if explanation already exists (cached)
    const cached = await this.getExplanation(userId, movie.id, movie)
    if (cached) return cached

    // Generate new explanation using Claude
    const explanation = await this.generateWithClaude(userId, movie)
    
    // Store in database
    await this.supabase.from('recommendation_explanations').insert({
      user_id: userId,
      movie_id: movie.id,
      explanation_type: explanation.explanation_type,
      primary_reason: explanation.primary_reason,
      confidence_score: explanation.confidence_score,
      discovery_level: explanation.discovery_factor,
      optimal_viewing_time: explanation.optimal_viewing_time,
      supporting_data: { supporting_movies: explanation.supporting_movies }
    })
    
    return explanation
  }

  /**
   * Generate explanations for multiple movies in a single batch operation
   * More efficient than individual calls for large lists
   */
  async generateExplanationsForMovies(
    userId: string,
    movies: any[]
  ): Promise<Map<string, RecommendationExplanation>> {
    const results = new Map<string, RecommendationExplanation>()
    
    // Check which movies already have cached explanations
    const uncachedMovies: any[] = []
    
    for (const movie of movies) {
      const cached = await this.getExplanation(userId, movie.id, movie)
      if (cached) {
        results.set(movie.id, cached)
      } else {
        uncachedMovies.push(movie)
      }
    }
    
    if (uncachedMovies.length === 0) {
      return results
    }
    
    // Batch generate explanations for uncached movies
    const batchExplanations = await this.batchGenerateWithClaude(userId, uncachedMovies)
    
    // Store and add to results
    for (const [movieId, explanation] of batchExplanations.entries()) {
      await this.supabase.from('recommendation_explanations').insert({
        user_id: userId,
        movie_id: movieId,
        explanation_type: explanation.explanation_type,
        primary_reason: explanation.primary_reason,
        confidence_score: explanation.confidence_score,
        discovery_level: explanation.discovery_factor,
        optimal_viewing_time: explanation.optimal_viewing_time,
        supporting_data: { supporting_movies: explanation.supporting_movies }
      })
      results.set(movieId, explanation)
    }
    
    return results
  }

  private async batchGenerateWithClaude(
    userId: string,
    movies: any[]
  ): Promise<Map<string, RecommendationExplanation>> {
    const results = new Map<string, RecommendationExplanation>()
    
    // Get user context for personalized batch explanations
    const userContext = await this.getUserContext(userId)
    
    // Build batch prompt for multiple movies
    const batchPrompt = this.buildBatchExplanationPrompt(movies, userContext)
    
    try {
      const response = await Promise.race([
        anthropic.messages.create({
          model: claudeConfig.model,
          max_tokens: 800, // Increased for batch processing
          temperature: claudeConfig.temperature,
          messages: [
            { role: 'user', content: batchPrompt },
          ],
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Claude timeout')), 15000)
        )
      ]) as any
      
      const textResponse = response.content?.[0]?.text?.trim() || '{}'
      const parsed = this.parseBatchResponse(textResponse)
      
      // Map parsed results back to movie IDs
      for (const movie of movies) {
        const explanation = parsed[movie.id] || this.createFallbackExplanation(movie)
        results.set(movie.id, explanation)
      }
      
    } catch (error) {
      logger.warn('Batch explanation generation failed, using fallbacks', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        movieCount: movies.length 
      })
      
      // Fallback to individual explanations for all movies
      for (const movie of movies) {
        results.set(movie.id, this.createFallbackExplanation(movie))
      }
    }
    
    return results
  }

  private buildBatchExplanationPrompt(movies: any[], userContext: string | null): string {
    const movieList = movies.map(movie => {
      const genreNames = (movie.genre_ids || []).map((id: number) => this.getGenreName(id)).join(', ')
      return `- "${movie.title}" (${movie.release_date?.split('-')[0] || 'Unknown'}) | Genres: ${genreNames} | Rating: ${movie.vote_average || 'N/A'}/10 | ID: ${movie.id}`
    }).join('\n')
    
    const contextualPrompt = userContext ? 
      `\nUser's preference context:\n${userContext}\n` : 
      '\nNew user - focus on movie quality and broad appeal.\n'
    
    return `Generate personalized movie recommendation explanations for these ${movies.length} movies. Return ONLY valid JSON with movie IDs as keys:

Movies to explain:
${movieList}
${contextualPrompt}
Return format:
{
  "movie_id_1": {
    "primary_reason": "One sentence personal reason",
    "explanation_type": "similarity|pattern|mood|discovery|temporal",
    "confidence_score": 0-100,
    "discovery_factor": "safe|stretch|adventure",
    "optimal_viewing_time": "optional suggestion"
  },
  "movie_id_2": { ... }
}

Keep each explanation concise but personal. Focus on why each movie would appeal to this user specifically.`
  }

  private parseBatchResponse(response: string): Record<string, RecommendationExplanation> {
    try {
      const parsed = JSON.parse(response)
      const result: Record<string, RecommendationExplanation> = {}
      
      for (const [movieId, data] of Object.entries(parsed)) {
        const explanationData = data as any
        result[movieId] = {
          primary_reason: explanationData.primary_reason || 'Recommended based on your preferences',
          explanation_type: explanationData.explanation_type || 'pattern',
          confidence_score: explanationData.confidence_score || 75,
          discovery_factor: explanationData.discovery_factor || 'safe',
          optimal_viewing_time: explanationData.optimal_viewing_time,
          supporting_movies: []
        }
      }
      
      return result
    } catch {
      logger.warn('Failed to parse batch explanation response', { response })
      return {}
    }
  }

  private createFallbackExplanation(movie: any): RecommendationExplanation {
    const genreNames = (movie.genre_ids || []).map((id: number) => this.getGenreName(id)).join(', ')
    
    return {
      primary_reason: `Recommended ${movie.title} as a ${genreNames} movie that matches your viewing preferences.`,
      explanation_type: 'pattern',
      confidence_score: 70,
      discovery_factor: 'safe',
      optimal_viewing_time: undefined,
      supporting_movies: []
    }
  }

  private getGenreName(genreId: number): string {
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
   * Attempt to generate a quick memory-hit string based on actor/director/genre matches.
   */
  private async calculateMemoryHit(userId: string, movie: Movie): Promise<string | undefined> {
    try {
      const supabase = this.supabase
      const { data, error } = await supabase
        .from('conversational_memory')
        .select('memory_type, memory_key')
        .eq('user_id', userId)
        .in('memory_type', ['genre_preference', 'actor_preference', 'director_preference'])
        .gt('preference_strength', 0)

      if (error) {
        logger.warn('Memory-hit query failed', { userId, error: error.message })
        return undefined
      }

      const genres = (movie.genre || []) as string[]
      const actors = (movie.cast || movie.actors || []) as string[]
      const directors = (movie.director || []) as string[]

      for (const row of data || []) {
        const key = String(row.memory_key).toLowerCase()
        if (
          (row.memory_type === 'genre_preference' && genres.map(g => g.toLowerCase()).includes(key)) ||
          (row.memory_type === 'actor_preference' && actors.map(a => a.toLowerCase()).includes(key)) ||
          (row.memory_type === 'director_preference' && directors.map(d => d.toLowerCase()).includes(key))
        ) {
          // Build user-friendly sentence
          if (row.memory_type === 'genre_preference') return `You've said you love ${key} movies.`
          if (row.memory_type === 'actor_preference') return `You're a fan of ${row.memory_key}.`
          if (row.memory_type === 'director_preference') return `You've enjoyed films by ${row.memory_key}.`
        }
      }
    } catch (err) {
      logger.warn('Memory-hit computation failed', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    return undefined
  }

  /**
   * Get user context for personalized explanations
   */
  private async getUserContext(userId: string): Promise<string | null> {
    try {
      // Get user's rating history
      const { data: ratings } = await this.supabase
        .from('ratings')
        .select(`
          rating,
          interested,
          movies:movie_id (
            title,
            genre,
            director,
            year
          )
        `)
        .eq('user_id', userId)
        .eq('interested', true)
        .gte('rating', 3)
        .order('rating', { ascending: false })
        .limit(10)

      if (!ratings || ratings.length === 0) {
        return null
      }

      // Analyze preferences
      const genrePrefs = new Map<string, number>()
      const likedMovies: string[] = []
      
      ratings.forEach((r: any) => {
        if (r.movies && !Array.isArray(r.movies)) {
          likedMovies.push(r.movies.title)
          r.movies.genre?.forEach((genre: string) => {
            genrePrefs.set(genre, (genrePrefs.get(genre) || 0) + r.rating)
          })
        }
      })

      const topGenres = Array.from(genrePrefs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre)

      // Build context summary
      const context = [
        `- Rated ${ratings.length} movies positively`,
        `- Prefers: ${topGenres.join(', ')} genres`,
        `- Recently enjoyed: ${likedMovies.slice(0, 3).join(', ')}`
      ].join('\n')

      return context

    } catch (error) {
      logger.warn('Failed to get user context for explanations', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      })
      return null
    }
  }

  /**
   * Alias for generateExplanationsForMovies for backward compatibility
   */
  async getBatchExplanations(
    userId: string,
    movies: any[]
  ): Promise<Map<string, RecommendationExplanation>> {
    return this.generateExplanationsForMovies(userId, movies)
  }

  /**
   * Static method for backward compatibility with tests
   */
  static async getBatchExplanations(
    userId: string,
    movies: any[]
  ): Promise<RecommendationExplanation[]> {
    const service = new ExplanationService()
    const result = await service.generateExplanationsForMovies(userId, movies)
    // Convert Map to array for backward compatibility
    return Array.from(result.entries()).map(([movieId, explanation]) => ({
      ...explanation,
      movie_id: movieId
    }))
  }
} 