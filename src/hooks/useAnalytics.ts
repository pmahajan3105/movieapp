'use client'

import { useCallback } from 'react'
import { logger } from '@/lib/logger'

interface AnalyticsEvent {
  sessionId: string
  event:
    | 'conversation_started'
    | 'message_sent'
    | 'preferences_extracted'
    | 'conversation_completed'
  metadata?: {
    messageCount?: number
    responseTime?: number
    userSatisfaction?: number
    extractionAccuracy?: number
    preferenceCategories?: number
    conversationLength?: number
  }
}

export function useAnalytics() {
  const trackEvent = useCallback(async (eventData: AnalyticsEvent) => {
    try {
      const response = await fetch('/api/analytics/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        logger.warn('Analytics tracking failed', {
          status: response.status,
          statusText: response.statusText,
          event: eventData.event,
          sessionId: eventData.sessionId,
        })
      }
    } catch (error) {
      logger.warn('Analytics error', {
        error: error instanceof Error ? error.message : String(error),
        event: eventData.event,
        sessionId: eventData.sessionId,
      })
      // Fail silently - analytics shouldn't break the app
    }
  }, [])

  const trackConversationStart = useCallback(
    (sessionId: string) => {
      trackEvent({
        sessionId,
        event: 'conversation_started',
        metadata: {
          messageCount: 0,
        },
      })
    },
    [trackEvent]
  )

  const trackMessageSent = useCallback(
    (sessionId: string, messageCount: number, responseTime?: number) => {
      trackEvent({
        sessionId,
        event: 'message_sent',
        metadata: {
          messageCount,
          responseTime,
        },
      })
    },
    [trackEvent]
  )

  const trackPreferencesExtracted = useCallback(
    (sessionId: string, preferenceCategories: number) => {
      trackEvent({
        sessionId,
        event: 'preferences_extracted',
        metadata: {
          preferenceCategories,
        },
      })
    },
    [trackEvent]
  )

  const trackConversationCompleted = useCallback(
    (sessionId: string, conversationLength: number, userSatisfaction?: number) => {
      trackEvent({
        sessionId,
        event: 'conversation_completed',
        metadata: {
          conversationLength,
          userSatisfaction,
        },
      })
    },
    [trackEvent]
  )

  return {
    trackEvent,
    trackConversationStart,
    trackMessageSent,
    trackPreferencesExtracted,
    trackConversationCompleted,
  }
}
