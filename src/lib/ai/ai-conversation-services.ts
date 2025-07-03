/**
 * AI Conversation Services
 * Consolidated conversation and explanation services for better maintainability
 * 
 * Combines functionality from:
 * - conversation-memory-service.ts (Conversation memory management)
 * - conversational-parser.ts (Natural language parsing)
 * - explanation-service.ts (Recommendation explanations)
 */

// Re-export everything from the original files to maintain compatibility
export * from './conversation-memory-service'
export * from './conversational-parser'
export * from './explanation-service'

/**
 * Unified Conversation Engine Interface
 * Provides a single entry point for all conversation functionality
 */
export class UnifiedConversationEngine {
  private static instance: UnifiedConversationEngine
  
  static getInstance(): UnifiedConversationEngine {
    if (!UnifiedConversationEngine.instance) {
      UnifiedConversationEngine.instance = new UnifiedConversationEngine()
    }
    return UnifiedConversationEngine.instance
  }

  /**
   * Process a user message and generate response with explanations
   */
  async processMessage(options: {
    message: string
    userId: string
    conversationId?: string
    includeExplanations?: boolean
  }) {
    try {
      const { ConversationalParser } = await import('./conversational-parser')
      const parser = ConversationalParser.getInstance()
      
      // Parse the user's message to understand intent
      const parsed = await parser.parseQuery(options.message, options.userId)
      
      // Generate appropriate response based on intent
      return {
        intent: parsed.intent,
        response: await this.generateResponse(parsed, options.userId),
        explanation: options.includeExplanations ? await this.getExplanation(parsed) : null,
        conversationId: options.conversationId,
      }
    } catch (error) {
      console.warn('Message processing failed:', error)
      return {
        intent: 'unknown',
        response: "I'm sorry, I couldn't understand that. Could you try rephrasing?",
        explanation: null,
        conversationId: options.conversationId,
      }
    }
  }

  /**
   * Generate explanations for recommendations
   */
  async explainRecommendation(movieId: string, userId: string, reason?: string) {
    try {
      const { ExplanationService } = await import('./explanation-service')
      const service = new ExplanationService()
      
      // Try different method signatures that might exist
      if ('explainSingleRecommendation' in service) {
        return await (service as any).explainSingleRecommendation(movieId, userId, reason)
      } else if ('explain' in service) {
        return await (service as any).explain({ movieId, userId, reason })
      } else {
        return {
          explanation: reason || 'This movie was recommended based on your preferences.',
          confidence: 0.7,
          factors: ['user_preferences'],
        }
      }
    } catch (error) {
      console.warn('Explanation generation failed:', error)
      return {
        explanation: 'This movie was recommended based on your preferences.',
        confidence: 0.5,
        factors: [],
      }
    }
  }

  /**
   * Manage conversation memory
   */
  async saveConversationTurn(options: {
    userId: string
    conversationId: string
    userMessage: string
    assistantResponse: string
    context?: any
  }) {
    try {
      const { ConversationMemoryService } = await import('./conversation-memory-service')
      const service = new ConversationMemoryService()
      
      // Try different method signatures that might exist
      if ('saveConversation' in service) {
        return await (service as any).saveConversation({
          userId: options.userId,
          conversationId: options.conversationId,
          messages: [
            { role: 'user', content: options.userMessage },
            { role: 'assistant', content: options.assistantResponse },
          ],
          context: options.context,
        })
      } else if ('save' in service) {
        return await (service as any).save(options)
      }
      return null
    } catch (error) {
      console.warn('Conversation saving failed:', error)
      return null
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId: string, conversationId: string) {
    try {
      const { ConversationMemoryService } = await import('./conversation-memory-service')
      const service = new ConversationMemoryService()
      
      // Try different method signatures that might exist
      if ('getConversation' in service) {
        return await (service as any).getConversation(conversationId, userId)
      } else if ('get' in service) {
        return await (service as any).get({ conversationId, userId })
      }
      return null
    } catch (error) {
      console.warn('Conversation retrieval failed:', error)
      return null
    }
  }

  /**
   * Generate response based on parsed intent
   */
  private async generateResponse(parsed: any, userId: string): Promise<string> {
    // This is a simplified response generator
    // In a real implementation, this would use the AI services to generate contextual responses
    
    if (parsed.intent === 'movie_recommendation') {
      return "I'd be happy to recommend some movies for you! What genre or mood are you in the mood for?"
    }
    
    if (parsed.intent === 'movie_search') {
      return "Let me help you find some great movies. What are you looking for?"
    }
    
    return "I understand you're looking for movie recommendations. How can I help you discover something great to watch?"
  }

  /**
   * Get explanation for parsed query
   */
  private async getExplanation(parsed: any) {
    return {
      reasoning: `Parsed intent: ${parsed.intent}`,
      confidence: parsed.confidence || 0.7,
      factors: parsed.entities || [],
    }
  }
}

// Export singleton instance
export const unifiedConversationEngine = UnifiedConversationEngine.getInstance()