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

export function ChatInterface() {
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

  // Enhanced recommendations
  const { getEnhancedRecommendations, isRecommendationRequest } = useEnhancedRecommendations()

  // Streaming chat
  const { isStreaming, streamingMessage, error, startStreaming } = useStreamingChat({
    onComplete: async fullResponse => {
      addAssistantMessage(fullResponse)
    },
    onPreferencesExtracted: handlePreferencesExtracted,
    onSessionStart: newSessionId => {
      console.log('🎬 New chat session started:', newSessionId)
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
    } catch (error) {
      console.error('❌ Failed to send message:', error)
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
        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-base-200 text-base-content/60 border-b p-2 text-xs">
            Session: {sessionId || 'None'} | Preferences: {preferencesComplete ? '✅' : '❌'} |
            Messages: {messages.length}
          </div>
        )}

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
