'use client'

import React from 'react'
import { StreamingChatView } from './StreamingChatView'
import { ChatErrorBoundary } from './ChatErrorBoundary'
import {
  useStreamingChat,
  useChatSession,
  usePreferenceExtraction,
  useEnhancedRecommendations,
} from './hooks'
import type { PreferenceData } from '@/types/chat'
import { useAuth } from '@/contexts/AuthContext'

interface ChatInterfaceProps {
  sessionId?: string
  onClose?: () => void
  onPreferencesExtracted?: (preferences: PreferenceData) => void
  className?: string
}

export function ChatInterface({ onPreferencesExtracted }: ChatInterfaceProps = {}) {
  const { isLocalMode } = useAuth()
  
  // Session management
  const {
    messages,
    sessionId,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    resetSession,
  } = useChatSession()

  // Preference extraction
  const {
    isComplete: preferencesComplete,
    extractedPreferences,
    handlePreferencesExtracted,
  } = usePreferenceExtraction()

  // Call the parent callback when preferences are extracted
  React.useEffect(() => {
    if (extractedPreferences && onPreferencesExtracted) {
      onPreferencesExtracted(extractedPreferences)
    }
  }, [extractedPreferences, onPreferencesExtracted])
  
  // Note: Removed local mode check - chat will work with API keys
  // even in local mode (single user mode)

  // Enhanced recommendations
  const { getEnhancedRecommendations, isRecommendationRequest } = useEnhancedRecommendations()

  // Streaming chat
  const { isStreaming, streamingMessage, error, startStreaming } = useStreamingChat({
    onComplete: async fullResponse => {
      addAssistantMessage(fullResponse)
    },
    onPreferencesExtracted: handlePreferencesExtracted,
    onSessionStart: () => {
      // Session tracking handled internally
    },
  })

  const handleSendMessage = async (message: string) => {
    // Add user message
    addUserMessage(message)

    try {
      // Check if this is a recommendation request and preferences are complete
      if (preferencesComplete && isRecommendationRequest(message)) {
        const recommendationMessage = await getEnhancedRecommendations(message)
        if (recommendationMessage) {
          addAssistantMessage(recommendationMessage.content, recommendationMessage.id)
          return
        }
      }

      // Send through streaming chat for preference extraction or general conversation
      await startStreaming(message, sessionId)
    } catch {
      // Error logging handled by streaming chat hook
      addErrorMessage()
    }
  }

  const handleReset = () => {
    resetSession()
  }

  // Show error if streaming failed
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-error mb-4">⚠️ Chat Error</div>
          <p className="text-base-content/70 mb-4">
            Failed to connect to the chat service. Please try again.
          </p>
          <button onClick={handleReset} className="btn btn-primary btn-sm">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <ChatErrorBoundary onReset={handleReset}>
      <div className="flex h-full flex-col">

        {/* Preference Status */}
        {extractedPreferences && (
          <div className="bg-success/10 border-success/20 border-b p-4">
            <div className="flex items-center space-x-2">
              <span className="text-success">✅</span>
              <span className="text-sm">
                Preferences saved! Now I can give you personalized recommendations.
              </span>
            </div>
          </div>
        )}

        {/* Main Chat View */}
        <StreamingChatView
          messages={messages}
          streamingMessage={streamingMessage}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          className="flex-1"
        />
      </div>
    </ChatErrorBoundary>
  )
}
