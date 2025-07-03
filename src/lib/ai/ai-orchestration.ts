/**
 * AI Orchestration
 * Workflow coordination and unified service management
 * 
 * Combines functionality from:
 * - advanced-workflow-orchestrator.ts
 * - unified-ai-service.ts
 * - client-safe-unified-service.ts
 */

// Re-export everything from the original files to maintain compatibility
// Note: Some exports may conflict, using selective re-exports
export * from './advanced-workflow-orchestrator'
// Selective re-export to avoid conflicts
export { ClientSafeUnifiedAIService } from './client-safe-unified-service'

import { unifiedRecommendationEngine } from './ai-recommendation-engine'
import { unifiedAnalysisEngine } from './ai-analysis-services'
import { unifiedConversationEngine } from './ai-conversation-services'

/**
 * Master AI Orchestrator
 * Coordinates all AI services and provides unified workflows
 */
export class AIOrchestrator {
  private static instance: AIOrchestrator
  
  static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator()
    }
    return AIOrchestrator.instance
  }

  /**
   * Complete movie discovery workflow
   * Combines recommendations, analysis, and conversation
   */
  async discoverMovies(options: {
    userId: string
    query?: string
    preferences?: any
    limit?: number
    includeAnalysis?: boolean
    includeExplanations?: boolean
  }) {
    try {
      // Get recommendations
      const recommendations = await unifiedRecommendationEngine.getRecommendations({
        userId: options.userId,
        limit: options.limit || 12,
      })

      // Analyze top recommendations if requested
      let analysis = null
      if (options.includeAnalysis && recommendations.movies?.length > 0) {
        const topMovie = recommendations.movies[0]
        if (topMovie) {
          analysis = await unifiedAnalysisEngine.analyzeMovie({
            id: topMovie.id,
            title: topMovie.title,
            plot: topMovie.plot || undefined,
            genre: topMovie.genre || undefined,
            director: topMovie.director || undefined,
            year: topMovie.year || undefined,
          })
        }
      }

      // Generate explanations if requested
      let explanations = null
      if (options.includeExplanations && recommendations.movies?.length > 0) {
        explanations = await Promise.all(
          recommendations.movies.slice(0, 3).map(movie =>
            unifiedConversationEngine.explainRecommendation(movie.id, options.userId)
          )
        )
      }

      return {
        recommendations,
        analysis,
        explanations,
        workflow: 'complete_discovery',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.warn('Movie discovery workflow failed:', error)
      return {
        recommendations: { movies: [], recommendations: [], insights: {} },
        analysis: null,
        explanations: null,
        workflow: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Conversational movie chat workflow
   */
  async chatAboutMovies(options: {
    message: string
    userId: string
    conversationId?: string
    includeRecommendations?: boolean
  }) {
    try {
      // Process the conversation
      const conversation = await unifiedConversationEngine.processMessage({
        message: options.message,
        userId: options.userId,
        conversationId: options.conversationId,
        includeExplanations: true,
      })

      // Get recommendations if this seems like a recommendation request
      let recommendations = null
      if (options.includeRecommendations || conversation.intent === 'movie_recommendation') {
        recommendations = await unifiedRecommendationEngine.getRecommendations({
          userId: options.userId,
          limit: 6, // Smaller limit for chat context
        })
      }

      // Save conversation turn
      if (conversation.conversationId) {
        await unifiedConversationEngine.saveConversationTurn({
          userId: options.userId,
          conversationId: conversation.conversationId,
          userMessage: options.message,
          assistantResponse: conversation.response,
          context: { recommendations, intent: conversation.intent },
        })
      }

      return {
        conversation,
        recommendations,
        workflow: 'conversational_chat',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.warn('Chat workflow failed:', error)
      return {
        conversation: {
          intent: 'error',
          response: "I'm having trouble processing your message right now. Please try again.",
          explanation: null,
          conversationId: options.conversationId,
        },
        recommendations: null,
        workflow: 'error_fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get comprehensive user insights
   */
  async getUserInsights(userId: string) {
    try {
      const [behaviorProfile, temporalPreferences] = await Promise.all([
        unifiedRecommendationEngine.analyzeUserBehavior(userId),
        unifiedRecommendationEngine.getTemporalPreferences(userId),
      ])

      return {
        behaviorProfile,
        temporalPreferences,
        workflow: 'user_insights',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.warn('User insights failed:', error)
      return {
        behaviorProfile: null,
        temporalPreferences: null,
        workflow: 'insights_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// Export singleton instance
export const aiOrchestrator = AIOrchestrator.getInstance()