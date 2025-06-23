import { useCallback } from 'react'
import type { ChatMessage } from '@/types/chat'
import { logger } from '@/lib/logger'

interface EnhancedRecommendation {
  title: string
  year: number
  rating: number
  genres?: string[]
  reason?: string
  summary?: string
}

interface EnhancedRecommendationsResponse {
  success: boolean
  recommendations: EnhancedRecommendation[]
  intelligence_summary?: string
}

export function useEnhancedRecommendations() {
  const updateRealTimeLearning = useCallback(
    async (message: string, recommendationCount: number) => {
      await fetch('/api/ai/recommendations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'conversation_interaction',
          data: {
            message,
            recommendations_provided: recommendationCount,
            timestamp: new Date().toISOString(),
          },
        }),
      })
    },
    []
  )

  const getEnhancedRecommendations = useCallback(
    async (messageContent: string): Promise<ChatMessage | null> => {
      try {
        const response = await fetch('/api/ai/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            conversationContext: `User has set preferences and is asking for specific recommendations`,
            includeReasons: true,
            maxRecommendations: 6,
          }),
        })

        if (!response.ok) {
          throw new Error(`Enhanced recommendations failed: ${response.status}`)
        }

        const data: EnhancedRecommendationsResponse = await response.json()

        if (data.success && data.recommendations?.length > 0) {
          const recommendationsMessage: ChatMessage = {
            id: `recommendations-${Date.now()}`,
            role: 'assistant',
            content: `🎬 **Here are some great movies for you:**

${data.recommendations
  .slice(0, 6)
  .map(
    (movie, index) => `
**${index + 1}. ${movie.title}** (${movie.year})
⭐ ${movie.rating}/10 | 🎭 ${movie.genres?.join(', ') || 'Multiple genres'}
📝 ${movie.reason || movie.summary || 'Perfect match for you!'}
`
  )
  .join('\n')}

${data.intelligence_summary ? `\n**🧠 Insight:** ${data.intelligence_summary}` : ''}

Want more recommendations? Just ask! I can suggest movies by genre, mood, or any specific criteria you have in mind. 🍿`,
            timestamp: new Date(),
          }

          // Trigger real-time learning update in the background
          updateRealTimeLearning(messageContent, data.recommendations.length).catch(error => {
            logger.warn('Real-time learning update failed', { error: error.message })
          })

          return recommendationsMessage
        } else {
          // Fallback if no recommendations
          return {
            id: `fallback-${Date.now()}`,
            role: 'assistant',
            content:
              "I'm having trouble finding specific recommendations right now. Please try asking differently or visit the Recommendations tab for your personalized movie suggestions!",
            timestamp: new Date(),
          }
        }
      } catch (error) {
        logger.error('Enhanced conversation error', {
          error: error instanceof Error ? error.message : String(error),
        })

        return {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'I encountered an issue getting recommendations. Please try again or visit the Recommendations tab for your personalized suggestions.',
          timestamp: new Date(),
        }
      }
    },
    [updateRealTimeLearning]
  )

  const isRecommendationRequest = useCallback((message: string) => {
    const lowerMessage = message.toLowerCase()
    return (
      lowerMessage.includes('recommend') ||
      lowerMessage.includes('suggest') ||
      lowerMessage.includes('movie') ||
      lowerMessage.includes('film') ||
      lowerMessage.includes('watch') ||
      lowerMessage.includes('find')
    )
  }, [])

  return {
    getEnhancedRecommendations,
    isRecommendationRequest,
  }
}
