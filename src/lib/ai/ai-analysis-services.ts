/**
 * AI Analysis Services
 * Consolidated analysis services for better maintainability
 * 
 * Combines functionality from:
 * - thematic-analysis-engine.ts (Thematic content analysis)
 * - emotional-journey-mapper.ts (Emotional arc analysis)
 * - cinematic-style-analyzer.ts (Visual style analysis)
 */

// Re-export everything from the original files to maintain compatibility
export * from './thematic-analysis-engine'
export * from './emotional-journey-mapper' 
export * from './cinematic-style-analyzer'

/**
 * Unified Analysis Engine Interface
 * Provides a single entry point for all movie analysis functionality
 */
export class UnifiedAnalysisEngine {
  private static instance: UnifiedAnalysisEngine
  
  static getInstance(): UnifiedAnalysisEngine {
    if (!UnifiedAnalysisEngine.instance) {
      UnifiedAnalysisEngine.instance = new UnifiedAnalysisEngine()
    }
    return UnifiedAnalysisEngine.instance
  }

  /**
   * Analyze movie themes, emotions, and cinematic style
   */
  async analyzeMovie(movie: {
    id: string
    title: string
    plot?: string
    genre?: string[]
    director?: string[]
    year?: number
  }) {
    const results = {
      thematic: null as any,
      emotional: null as any,
      cinematic: null as any,
    }

    try {
      // Dynamically import services to avoid loading issues with @ts-nocheck files
      const [thematic, emotional, cinematic] = await Promise.allSettled([
        this.analyzeThemes(movie),
        this.analyzeEmotions(movie),
        this.analyzeCinematicStyle(movie),
      ])

      if (thematic.status === 'fulfilled') results.thematic = thematic.value
      if (emotional.status === 'fulfilled') results.emotional = emotional.value  
      if (cinematic.status === 'fulfilled') results.cinematic = cinematic.value

      return results
    } catch (error) {
      console.warn('Movie analysis failed:', error)
      return results
    }
  }

  /**
   * Analyze thematic content
   */
  private async analyzeThemes(movie: any) {
    try {
      // Safe import with fallback
      const { ThematicAnalysisEngine } = await import('./thematic-analysis-engine')
      const engine = ThematicAnalysisEngine.getInstance()
      return await engine.analyzeMovie(movie)
    } catch (error) {
      console.warn('Thematic analysis unavailable:', error)
      return null
    }
  }

  /**
   * Analyze emotional journey
   */
  private async analyzeEmotions(movie: any) {
    try {
      const { EmotionalJourneyMapper } = await import('./emotional-journey-mapper')
      const mapper = EmotionalJourneyMapper.getInstance()
      // Use the correct method name if available
      if ('analyzeEmotionalJourney' in mapper) {
        return await (mapper as any).analyzeEmotionalJourney(movie)
      }
      return await (mapper as any).analyze?.(movie) || null
    } catch (error) {
      console.warn('Emotional analysis unavailable:', error)
      return null
    }
  }

  /**
   * Analyze cinematic style
   */
  private async analyzeCinematicStyle(movie: any) {
    try {
      const { CinematicStyleAnalyzer } = await import('./cinematic-style-analyzer')
      const analyzer = CinematicStyleAnalyzer.getInstance()
      // Use the correct method name if available
      if ('analyzeCinematicStyle' in analyzer) {
        return await (analyzer as any).analyzeCinematicStyle(movie)
      }
      return await (analyzer as any).analyze?.(movie) || null
    } catch (error) {
      console.warn('Cinematic analysis unavailable:', error)
      return null
    }
  }
}

// Export singleton instance
export const unifiedAnalysisEngine = UnifiedAnalysisEngine.getInstance()