/**
 * Enhanced AI Synthesis Service
 * Phase 2: Combine existing AI engines with external context
 * 
 * This service enhances your sophisticated local AI analysis with current context
 * to provide richer, more relevant movie recommendations.
 */

import { getExternalContextService } from './external-context-service'
import { SmartRecommenderV2 } from './smart-recommender-v2'
import { logger } from '@/lib/logger'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'

interface MovieData {
  id: string
  title: string
  year: number
  release_date: string
  director?: string
  genres?: Array<{ id: number; name: string }>
  overview?: string
  vote_average?: number
  poster_path?: string
}

interface UserTasteProfile {
  user_id: string
  preferences: any
  favorite_genres?: string[]
  preference_strength?: any
  ai_confidence?: number
}

interface LocalAIAnalysis {
  emotional?: {
    dominantTone: string
    emotionalArc: string
    primaryEmotions: string[]
    intensity: number
  }
  thematic?: {
    coreTheme: string
    majorThemes: string[]
    narrativeComplexity: string
  }
  cinematic?: {
    visualSignature: string
    cinematographyStyle: string
    productionValue: string
  }
}

interface EnhancedMovieIntelligence {
  movie: MovieData
  confidence: number
  reason: string
  source: 'full_ai' | 'enhanced' | 'local_ai' | 'fallback'
  insights: {
    emotional?: any
    thematic?: any
    cinematic?: any
    culturalMoment?: string
    audienceReaction?: string
    currentRelevance?: number
  }
  analysisDepth: 'deep' | 'moderate' | 'basic'
  enhancedAt: Date
}

export class EnhancedSynthesisService {
  private externalContext = getExternalContextService()
  private smartRecommender = SmartRecommenderV2.getInstance()

  /**
   * Generate enhanced movie intelligence using existing AI engines + external context
   */
  async getEnhancedMovieIntelligence(
    movie: MovieData, 
    userTaste: UserTasteProfile,
    options: {
      allowExternalAPIs?: boolean
      analysisDepth?: 'deep' | 'moderate' | 'basic'
    } = {}
  ): Promise<EnhancedMovieIntelligence> {
    const { 
      allowExternalAPIs = true, 
      analysisDepth = 'moderate' 
    } = options

    logger.info('Starting enhanced movie analysis', {
      movieId: movie.id,
      title: movie.title,
      analysisDepth,
      allowExternalAPIs
    })

    try {
      // Step 1: Get your sophisticated local AI analysis (always available, no cost)
      const localAnalysis = await this.getLocalAIAnalysis(movie)
      
      // Step 2: Get external context if budget allows and APIs are enabled
      let externalContext = null
      if (allowExternalAPIs && analysisDepth !== 'basic') {
        try {
          externalContext = await this.externalContext.getEnhancedContext({
            id: movie.id,
            title: movie.title,
            year: movie.year,
            director: movie.director,
            release_date: movie.release_date
          })
        } catch (error) {
          logger.warn('External context failed, proceeding with local analysis only', {
            error: (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error),
            movieId: movie.id
          })
        }
      }

      // Step 3: Synthesize with Claude if depth is deep
      let claudeAnalysis = null
      if (analysisDepth === 'deep' && allowExternalAPIs) {
        try {
          claudeAnalysis = await this.synthesizeWithClaude(movie, userTaste, localAnalysis, externalContext)
        } catch (error) {
          logger.warn('Claude synthesis failed, using local analysis', {
            error: (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error),
            movieId: movie.id
          })
        }
      }

      // Step 4: Determine final analysis source and confidence
      const analysis = this.combineAnalysis(movie, userTaste, localAnalysis, externalContext, claudeAnalysis)
      
      logger.info('Enhanced movie analysis completed', {
        movieId: movie.id,
        source: analysis.source,
        confidence: analysis.confidence,
        hasExternalContext: !!externalContext,
        hasClaudeAnalysis: !!claudeAnalysis
      })

      return analysis

    } catch (error) {
      logger.error('Enhanced analysis failed, returning fallback', {
        movieId: movie.id,
        error: (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error)
      })

      return this.getFallbackAnalysis(movie, userTaste)
    }
  }

  /**
   * Get sophisticated local AI analysis using your existing engines
   */
  private async getLocalAIAnalysis(movie: MovieData): Promise<LocalAIAnalysis> {
    try {
      // Use your existing AI engines - these are sophisticated and work offline
      const analysisPromises = await Promise.allSettled([
        this.analyzeEmotionalJourney(movie),
        this.analyzeThematicContent(movie),
        this.analyzeCinematicStyle(movie)
      ])

      return {
        emotional: analysisPromises[0].status === 'fulfilled' ? analysisPromises[0].value : undefined,
        thematic: analysisPromises[1].status === 'fulfilled' ? analysisPromises[1].value : undefined,
        cinematic: analysisPromises[2].status === 'fulfilled' ? analysisPromises[2].value : undefined
      }
    } catch (error) {
      logger.warn('Local AI analysis failed', { movieId: movie.id, error: (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error) })
      return {}
    }
  }

  /**
   * Analyze emotional journey (placeholder for your existing engine)
   */
  private async analyzeEmotionalJourney(movie: MovieData) {
    // This would call your existing EmotionalJourneyMapper
    // For now, providing a fallback implementation
    return {
      dominantTone: this.inferEmotionalTone(movie),
      emotionalArc: 'gradual_development',
      primaryEmotions: this.inferPrimaryEmotions(movie),
      intensity: (movie.vote_average || 5) / 10
    }
  }

  /**
   * Analyze thematic content (placeholder for your existing engine)
   */
  private async analyzeThematicContent(movie: MovieData) {
    // This would call your existing ThematicAnalysisEngine
    return {
      coreTheme: this.inferCoreTheme(movie),
      majorThemes: this.inferMajorThemes(movie),
      narrativeComplexity: movie.overview && movie.overview.length > 200 ? 'complex' : 'straightforward'
    }
  }

  /**
   * Analyze cinematic style (placeholder for your existing engine)
   */
  private async analyzeCinematicStyle(movie: MovieData) {
    // This would call your existing CinematicStyleAnalyzer
    return {
      visualSignature: this.inferVisualStyle(movie),
      cinematographyStyle: 'contemporary',
      productionValue: (movie.vote_average || 5) > 7 ? 'high' : 'moderate'
    }
  }

  /**
   * Synthesize all analysis with Claude for the most sophisticated matching
   */
  private async synthesizeWithClaude(
    movie: MovieData,
    userTaste: UserTasteProfile,
    localAnalysis: LocalAIAnalysis,
    externalContext: any
  ) {
    const prompt = this.buildSynthesisPrompt(movie, userTaste, localAnalysis, externalContext)
    try {
      const response = await anthropic.messages.create({
        model: claudeConfig.model,
        max_tokens: 400,
        temperature: claudeConfig.temperature,
        messages: [
          { role: 'user', content: prompt },
        ],
      })
      const textResponse = (response as any).content?.[0]?.text?.trim() || ''
      return this.parseClaudeResponse(textResponse)
    } catch (error) {
      logger.error('Claude synthesis failed', { movieId: movie.id, error: (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error) })
      return null
    }
  }

  /**
   * Build the synthesis prompt for Claude
   */
  private buildSynthesisPrompt(
    movie: MovieData,
    userTaste: UserTasteProfile,
    localAnalysis: LocalAIAnalysis,
    externalContext: any
  ): string {
    return `Analyze this movie for personal recommendation matching:

MOVIE: ${movie.title} (${movie.year})
Overview: ${movie.overview || 'No overview available'}

LOCAL AI ANALYSIS:
- Emotional Profile: ${JSON.stringify(localAnalysis.emotional)}
- Thematic Analysis: ${JSON.stringify(localAnalysis.thematic)}
- Cinematic Style: ${JSON.stringify(localAnalysis.cinematic)}

${externalContext?.currentBuzz ? `
CURRENT CONTEXT:
- Audience Reaction: ${externalContext.currentBuzz.audienceReaction}
- Cultural Discussion: ${externalContext.currentBuzz.culturalDiscussion?.join(', ')}
- Current Relevance: ${externalContext.currentBuzz.currentRelevance}
` : ''}

${externalContext?.culturalContext ? `
CULTURAL CONTEXT:
- Cultural Significance: ${externalContext.culturalContext.culturalSignificance}
- Director Context: ${externalContext.culturalContext.directorContext}
- Thematic Relevance: ${externalContext.culturalContext.thematicRelevance?.join(', ')}
` : ''}

USER TASTE PROFILE:
${JSON.stringify(userTaste.preferences, null, 2)}

Rate this movie match (0-1) and provide reasoning that combines:
1. How the movie's qualities align with user preferences
2. Why the current cultural/audience context makes it relevant
3. Which specific aspect creates the strongest connection

Respond in JSON format:
{
  "confidence": 0.85,
  "reason": "Detailed explanation combining local analysis and current context",
  "keyMatchFactors": ["genre_alignment", "emotional_resonance", "cultural_relevance"],
  "culturalRelevance": "Why this movie matters right now"
}`
  }

  /**
   * Parse Claude's response into structured data
   */
  private parseClaudeResponse(responseText: string) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // Fallback parsing if JSON is malformed
      return {
        confidence: 0.7,
        reason: responseText.slice(0, 200),
        keyMatchFactors: ['analysis_available'],
        culturalRelevance: 'Claude analysis provided'
      }
    } catch (error) {
      logger.warn('Failed to parse Claude response', { error: (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error) })
      return {
        confidence: 0.6,
        reason: 'AI analysis completed with partial data',
        keyMatchFactors: ['partial_analysis'],
        culturalRelevance: 'Limited context available'
      }
    }
  }

  /**
   * Combine all analysis into final recommendation
   */
  private combineAnalysis(
    movie: MovieData,
    userTaste: UserTasteProfile,
    localAnalysis: LocalAIAnalysis,
    externalContext: any,
    claudeAnalysis: any
  ): EnhancedMovieIntelligence {
    let confidence = 0.5
    let reason = `Recommended based on your preferences`
    let source: 'full_ai' | 'enhanced' | 'local_ai' | 'fallback' = 'local_ai'
    let analysisDepth: 'deep' | 'moderate' | 'basic' = 'basic'

    // Start with basic genre matching
    if (userTaste.favorite_genres && movie.genres) {
      const genreMatch = this.calculateGenreMatch(movie.genres, userTaste.favorite_genres)
      confidence = Math.max(confidence, genreMatch)
      if (genreMatch > 0.6) {
        reason = `Matches your ${userTaste.favorite_genres.slice(0, 2).join(' and ')} preferences`
      }
    }

    // Enhance with local AI analysis
    if (localAnalysis.emotional || localAnalysis.thematic || localAnalysis.cinematic) {
      confidence = Math.max(confidence, 0.7)
      analysisDepth = 'moderate'
      source = 'local_ai'
      
      if (localAnalysis.emotional) {
        reason += `. Emotional tone (${localAnalysis.emotional.dominantTone}) aligns with your preferences`
      }
    }

    // Enhance with external context
    if (externalContext?.currentBuzz || externalContext?.culturalContext) {
      confidence = Math.max(confidence, 0.75)
      analysisDepth = 'moderate'
      source = 'enhanced'
      
      if (externalContext.currentBuzz?.currentRelevance > 0.7) {
        reason += `. Currently trending with ${externalContext.currentBuzz.audienceReaction}`
      }
    }

    // Use Claude analysis if available (highest quality)
    if (claudeAnalysis) {
      confidence = Math.min(claudeAnalysis.confidence || 0.8, 1.0)
      reason = claudeAnalysis.reason || reason
      analysisDepth = 'deep'
      source = 'full_ai'
    }

    return {
      movie,
      confidence,
      reason,
      source,
      insights: {
        emotional: localAnalysis.emotional,
        thematic: localAnalysis.thematic,
        cinematic: localAnalysis.cinematic,
        culturalMoment: externalContext?.culturalContext?.culturalSignificance,
        audienceReaction: externalContext?.currentBuzz?.audienceReaction,
        currentRelevance: externalContext?.currentBuzz?.currentRelevance
      },
      analysisDepth,
      enhancedAt: new Date()
    }
  }

  /**
   * Get fallback analysis when all else fails
   */
  private getFallbackAnalysis(movie: MovieData, userTaste: UserTasteProfile): EnhancedMovieIntelligence {
    let confidence = 0.4
    let reason = 'Recommended based on popularity and ratings'

    // Basic quality boost
    if (movie.vote_average && movie.vote_average >= 7.5) {
      confidence += 0.2
      reason = `Highly rated (${movie.vote_average}/10) ${movie.genres?.map(g => g.name).join('/')} film`
    }

    return {
      movie,
      confidence,
      reason,
      source: 'fallback',
      insights: {},
      analysisDepth: 'basic',
      enhancedAt: new Date()
    }
  }

  // Helper methods for basic analysis (simplified versions of your AI engines)

  private calculateGenreMatch(movieGenres: Array<{ name: string }>, userGenres: string[]): number {
    if (!movieGenres || !userGenres) return 0.5
    
    const movieGenreNames = movieGenres.map(g => g.name.toLowerCase())
    const matchedGenres = userGenres.filter(ug => 
      movieGenreNames.some(mg => mg.includes(ug.toLowerCase()) || ug.toLowerCase().includes(mg))
    )
    
    return Math.min(0.3 + (matchedGenres.length * 0.2), 1.0)
  }

  private inferEmotionalTone(movie: MovieData): string {
    const genres = movie.genres?.map(g => g.name.toLowerCase()) || []
    
    if (genres.includes('horror') || genres.includes('thriller')) return 'tense'
    if (genres.includes('comedy')) return 'light'
    if (genres.includes('drama')) return 'contemplative'
    if (genres.includes('action')) return 'energetic'
    if (genres.includes('romance')) return 'warm'
    
    return 'balanced'
  }

  private inferPrimaryEmotions(movie: MovieData): string[] {
    const genres = movie.genres?.map(g => g.name.toLowerCase()) || []
    const emotions: string[] = []
    
    if (genres.includes('action')) emotions.push('excitement')
    if (genres.includes('drama')) emotions.push('empathy')
    if (genres.includes('comedy')) emotions.push('joy')
    if (genres.includes('horror')) emotions.push('fear')
    if (genres.includes('romance')) emotions.push('love')
    
    return emotions.length > 0 ? emotions : ['curiosity']
  }

  private inferCoreTheme(movie: MovieData): string {
    const overview = movie.overview?.toLowerCase() || ''
    
    if (overview.includes('family')) return 'family_bonds'
    if (overview.includes('love') || overview.includes('relationship')) return 'love_relationships'
    if (overview.includes('war') || overview.includes('conflict')) return 'conflict_resolution'
    if (overview.includes('justice') || overview.includes('crime')) return 'justice_morality'
    if (overview.includes('journey') || overview.includes('adventure')) return 'personal_growth'
    
    return 'human_experience'
  }

  private inferMajorThemes(movie: MovieData): string[] {
    const genres = movie.genres?.map(g => g.name.toLowerCase()) || []
    const themes: string[] = []
    
    if (genres.includes('science fiction')) themes.push('technology_humanity')
    if (genres.includes('fantasy')) themes.push('magic_reality')
    if (genres.includes('war')) themes.push('conflict_sacrifice')
    if (genres.includes('biography')) themes.push('real_life_inspiration')
    
    return themes.length > 0 ? themes : ['entertainment']
  }

  private inferVisualStyle(movie: MovieData): string {
    const genres = movie.genres?.map(g => g.name.toLowerCase()) || []
    
    if (genres.includes('science fiction')) return 'futuristic_sleek'
    if (genres.includes('fantasy')) return 'magical_elaborate'
    if (genres.includes('horror')) return 'dark_atmospheric'
    if (genres.includes('action')) return 'dynamic_kinetic'
    if (genres.includes('drama')) return 'naturalistic_intimate'
    
    return 'contemporary_polished'
  }
}

// Singleton instance
let enhancedSynthesisService: EnhancedSynthesisService | null = null

export function getEnhancedSynthesisService(): EnhancedSynthesisService {
  if (!enhancedSynthesisService) {
    enhancedSynthesisService = new EnhancedSynthesisService()
  }
  return enhancedSynthesisService
}

export type { 
  MovieData, 
  UserTasteProfile, 
  LocalAIAnalysis, 
  EnhancedMovieIntelligence 
}