/**
 * External Context Service
 * Phase 2: Enhance existing AI engines with current context
 * 
 * Integrates Brave Search and Wikipedia APIs to provide:
 * - Current movie buzz and audience reactions
 * - Cultural context and significance
 * - Recent discussions and reviews
 */

interface ExternalContextConfig {
  braveSearchApiKey?: string
  enableBraveSearch: boolean
  enableWikipedia: boolean
  cacheDurationMs: number
  requestTimeoutMs: number
}

interface MovieBuzz {
  recentReviews: Array<{
    source: string
    sentiment: 'positive' | 'negative' | 'mixed'
    summary: string
    date: string
  }>
  audienceReaction: string
  culturalDiscussion: string[]
  currentRelevance: number // 0-1 score
}

interface CulturalContext {
  culturalSignificance: string
  directorContext: string
  historicalMoment: string
  thematicRelevance: string[]
  wikipediaSummary: string
}

interface EnhancedContext {
  currentBuzz: MovieBuzz | null
  culturalContext: CulturalContext | null
  enhancedAt: Date
  source: 'fresh' | 'cached' | 'fallback'
  confidence: number
}

export class ExternalContextService {
  private config: ExternalContextConfig
  private cache = new Map<string, { data: EnhancedContext; cachedAt: Date }>()

  constructor(config: Partial<ExternalContextConfig> = {}) {
    this.config = {
      braveSearchApiKey: process.env.BRAVE_API_KEY,
      enableBraveSearch: !!process.env.BRAVE_API_KEY,
      enableWikipedia: true,
      cacheDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      requestTimeoutMs: 5000, // 5 second timeout
      ...config
    }
  }

  /**
   * Get enhanced context for a movie (with caching and fallbacks)
   */
  async getEnhancedContext(movie: {
    id: string
    title: string
    year: number
    director?: string
    release_date: string
  }): Promise<EnhancedContext> {
    const cacheKey = `context-${movie.id}`
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && !this.isCacheStale(cached.cachedAt)) {
      return { ...cached.data, source: 'cached' }
    }

    try {
      // Fetch fresh context with timeout
      const contextPromise = this.fetchFreshContext(movie)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Context fetch timeout')), this.config.requestTimeoutMs)
      )

      const context = await Promise.race([contextPromise, timeoutPromise])
      
      // Cache the result
      this.cache.set(cacheKey, { data: context, cachedAt: new Date() })
      
      return { ...context, source: 'fresh' }
    } catch (error) {
      console.warn(`Failed to fetch fresh context for ${movie.title}:`, error instanceof Error ? error.message : String(error))
      
      // Return stale cache if available
      if (cached) {
        return { ...cached.data, source: 'cached' }
      }
      
      // Return fallback context
      return this.getFallbackContext(movie)
    }
  }

  /**
   * Get current movie buzz using Brave Search API
   */
  private async getCurrentMovieBuzz(movieTitle: string, year: number): Promise<MovieBuzz | null> {
    if (!this.config.enableBraveSearch || !this.config.braveSearchApiKey) {
      return null
    }

    try {
      const query = `"${movieTitle}" ${year} movie review audience reaction`
      
      const searchParams = new URLSearchParams({
        q: query,
        count: '5',
        freshness: 'pm', // past month
        search_lang: 'en',
        country: 'US'
      })
      
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.config.braveSearchApiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseBraveSearchResults(data.web?.results || [])
    } catch (error) {
      console.warn('Brave Search API failed:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  /**
   * Get cultural context using Wikipedia API
   */
  private async getCulturalContext(movieTitle: string, director?: string): Promise<CulturalContext | null> {
    if (!this.config.enableWikipedia) {
      return null
    }

    try {
      const [movieContext, directorContext] = await Promise.allSettled([
        this.fetchWikipediaSummary(movieTitle),
        director ? this.fetchWikipediaSummary(director) : Promise.resolve(null)
      ])

      const movieSummary = movieContext.status === 'fulfilled' ? movieContext.value : null
      const directorSummary = directorContext.status === 'fulfilled' ? directorContext.value : null

      if (!movieSummary && !directorSummary) {
        return null
      }

      return {
        culturalSignificance: this.extractCulturalSignificance(movieSummary),
        directorContext: this.extractDirectorContext(directorSummary),
        historicalMoment: this.extractHistoricalMoment(movieSummary),
        thematicRelevance: this.extractThematicRelevance(movieSummary),
        wikipediaSummary: movieSummary?.extract || ''
      }
    } catch (error) {
      console.warn('Wikipedia API failed:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  /**
   * Fetch Wikipedia summary for a topic
   */
  private async fetchWikipediaSummary(topic: string): Promise<any> {
    const encodedTopic = encodeURIComponent(topic)
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTopic}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CineAI/1.0 (personal project)'
      }
    })

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Parse Brave Search results into movie buzz
   */
  private parseBraveSearchResults(results: any[]): MovieBuzz {
    const recentReviews = results.slice(0, 3).map(result => ({
      source: new URL(result.url).hostname,
      sentiment: this.inferSentiment(result.description) as 'positive' | 'negative' | 'mixed',
      summary: result.description,
      date: result.age || 'recent'
    }))

    const audienceReaction = this.extractAudienceReaction(results)
    const culturalDiscussion = this.extractCulturalTopics(results)
    const currentRelevance = this.calculateRelevance(results)

    return {
      recentReviews,
      audienceReaction,
      culturalDiscussion,
      currentRelevance
    }
  }

  /**
   * Extract audience reaction consensus from search results
   */
  private extractAudienceReaction(results: any[]): string {
    const descriptions = results.map(r => r.description).join(' ')
    
    if (descriptions.includes('critics praise') || descriptions.includes('widely acclaimed')) {
      return 'critically acclaimed'
    } else if (descriptions.includes('audience loved') || descriptions.includes('fan favorite')) {
      return 'audience favorite'
    } else if (descriptions.includes('mixed reviews') || descriptions.includes('divisive')) {
      return 'mixed reception'
    } else if (descriptions.includes('disappointing') || descriptions.includes('criticized')) {
      return 'mixed to negative'
    }
    
    return 'moderate reception'
  }

  /**
   * Extract cultural discussion topics from search results
   */
  private extractCulturalTopics(results: any[]): string[] {
    const topics: string[] = []
    const descriptions = results.map(r => r.description).join(' ').toLowerCase()
    
    if (descriptions.includes('representation') || descriptions.includes('diversity')) {
      topics.push('representation')
    }
    if (descriptions.includes('social') || descriptions.includes('political')) {
      topics.push('social commentary')
    }
    if (descriptions.includes('technical') || descriptions.includes('effects')) {
      topics.push('technical achievement')
    }
    if (descriptions.includes('feminist') || descriptions.includes('gender')) {
      topics.push('gender themes')
    }
    if (descriptions.includes('environmental') || descriptions.includes('climate')) {
      topics.push('environmental themes')
    }
    
    return topics
  }

  /**
   * Calculate current relevance score based on search result freshness and volume
   */
  private calculateRelevance(results: any[]): number {
    if (results.length === 0) return 0.1
    
    const recentResults = results.filter(r => 
      r.age && (r.age.includes('day') || r.age.includes('week'))
    ).length
    
    const relevanceScore = Math.min(1.0, (recentResults / results.length) + 0.3)
    return relevanceScore
  }

  /**
   * Infer sentiment from text description
   */
  private inferSentiment(text: string): string {
    const positive = ['excellent', 'amazing', 'brilliant', 'masterpiece', 'outstanding', 'loved', 'praised']
    const negative = ['terrible', 'awful', 'disappointing', 'failed', 'boring', 'criticized']
    
    const lowerText = text.toLowerCase()
    const positiveCount = positive.filter(word => lowerText.includes(word)).length
    const negativeCount = negative.filter(word => lowerText.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'mixed'
  }

  /**
   * Extract cultural significance from Wikipedia content
   */
  private extractCulturalSignificance(wikiData: any): string {
    if (!wikiData?.extract) return ''
    
    const extract = wikiData.extract
    if (extract.includes('cultural impact') || extract.includes('influenced')) {
      return 'significant cultural impact'
    } else if (extract.includes('acclaimed') || extract.includes('award')) {
      return 'critically acclaimed'
    } else if (extract.includes('controversial') || extract.includes('debate')) {
      return 'culturally significant and debated'
    }
    
    return 'notable cultural work'
  }

  /**
   * Extract director context from Wikipedia
   */
  private extractDirectorContext(wikiData: any): string {
    if (!wikiData?.extract) return ''
    
    const extract = wikiData.extract
    if (extract.includes('Academy Award') || extract.includes('Oscar')) {
      return 'Academy Award winner/nominee'
    } else if (extract.includes('auteur') || extract.includes('distinctive style')) {
      return 'distinctive auteur filmmaker'
    } else if (extract.includes('blockbuster') || extract.includes('commercial')) {
      return 'commercial filmmaker'
    }
    
    return 'established filmmaker'
  }

  /**
   * Extract historical moment context
   */
  private extractHistoricalMoment(wikiData: any): string {
    if (!wikiData?.extract) return ''
    
    const extract = wikiData.extract
    const year = new Date().getFullYear()
    
    if (extract.includes('pandemic') && year >= 2020) {
      return 'pandemic era filmmaking'
    } else if (extract.includes('streaming') && year >= 2020) {
      return 'streaming era release'
    } else if (extract.includes('franchise') || extract.includes('sequel')) {
      return 'franchise/sequel era'
    }
    
    return 'contemporary cinema'
  }

  /**
   * Extract thematic relevance keywords
   */
  private extractThematicRelevance(wikiData: any): string[] {
    if (!wikiData?.extract) return []
    
    const themes: string[] = []
    const extract = wikiData.extract.toLowerCase()
    
    const themeMap = {
      'identity': ['identity', 'self-discovery', 'coming of age'],
      'family': ['family', 'relationships', 'parenthood'],
      'technology': ['technology', 'artificial intelligence', 'future'],
      'society': ['society', 'class', 'inequality', 'politics'],
      'environment': ['environment', 'nature', 'climate'],
      'war': ['war', 'conflict', 'military', 'violence'],
      'love': ['love', 'romance', 'relationship'],
      'power': ['power', 'corruption', 'authority', 'control']
    }
    
    for (const [theme, keywords] of Object.entries(themeMap)) {
      if (keywords.some(keyword => extract.includes(keyword))) {
        themes.push(theme)
      }
    }
    
    return themes
  }

  /**
   * Fetch fresh context from all available sources
   */
  private async fetchFreshContext(movie: {
    title: string
    year: number
    director?: string
  }): Promise<EnhancedContext> {
    const [buzzResult, culturalResult] = await Promise.allSettled([
      this.getCurrentMovieBuzz(movie.title, movie.year),
      this.getCulturalContext(movie.title, movie.director)
    ])

    const currentBuzz = buzzResult.status === 'fulfilled' ? buzzResult.value : null
    const culturalContext = culturalResult.status === 'fulfilled' ? culturalResult.value : null

    // Calculate confidence based on available data
    let confidence = 0.5 // Base confidence
    if (currentBuzz) confidence += 0.3
    if (culturalContext) confidence += 0.2

    return {
      currentBuzz,
      culturalContext,
      enhancedAt: new Date(),
      source: 'fresh',
      confidence: Math.min(confidence, 1.0)
    }
  }

  /**
   * Get fallback context when external APIs fail
   */
  private getFallbackContext(movie: { title: string; year: number }): EnhancedContext {
    return {
      currentBuzz: null,
      culturalContext: null,
      enhancedAt: new Date(),
      source: 'fallback',
      confidence: 0.3
    }
  }

  /**
   * Check if cached data is stale
   */
  private isCacheStale(cachedAt: Date): boolean {
    const age = Date.now() - cachedAt.getTime()
    return age > this.config.cacheDurationMs
  }

  /**
   * Determine if we should fetch current buzz for this movie
   * (only for recent/trending movies to conserve API quota)
   */
  shouldGetCurrentBuzz(movie: { release_date: string }): boolean {
    const releaseDate = new Date(movie.release_date)
    const monthsOld = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    return monthsOld < 12 // Only for movies less than 1 year old
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.cachedAt.getTime() > this.config.cacheDurationMs) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
let externalContextService: ExternalContextService | null = null

export function getExternalContextService(): ExternalContextService {
  if (!externalContextService) {
    externalContextService = new ExternalContextService()
  }
  return externalContextService
}

export type { ExternalContextConfig, MovieBuzz, CulturalContext, EnhancedContext }