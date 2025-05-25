'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { PreferenceSummary } from './PreferenceSummary'
import type { ChatMessage as ChatMessageType, PreferenceData } from '@/types/chat'
import { AlertCircle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInterfaceProps {
  onPreferencesExtracted?: (preferences: PreferenceData) => void
}

interface StreamEvent {
  type: 'start' | 'content' | 'complete' | 'error'
  content?: string
  sessionId?: string
  preferencesExtracted?: boolean
  preferences?: PreferenceData
  fullResponse?: string
  error?: string
  timestamp: string
}

export function ChatInterface({ onPreferencesExtracted }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>()
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [extractedPreferences, setExtractedPreferences] = useState<PreferenceData | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && shouldAutoScroll) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [shouldAutoScroll])

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
      setShouldAutoScroll(isAtBottom)
    }
  }, [])

  // Auto-scroll management for streaming
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Enhanced welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessageType = {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi there! I'm CineAI, your personal movie assistant powered by Groq for lightning-fast responses! 🎬\n\nI'd love to learn about your movie preferences so I can recommend films you'll absolutely love. This will only take a few minutes!\n\nTo get started, tell me about a movie you've watched recently that you really enjoyed, or maybe a genre you're always in the mood for?",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [])

  const handleRetry = async (lastUserMessage: string) => {
    if (retryCount >= 3) {
      setError('Too many retries. Please refresh the page and try again.')
      return
    }

    setRetryCount(prev => prev + 1)
    setError(null)
    await handleSendMessage(lastUserMessage)
  }

  const handleStreamingResponse = async (messageContent: string) => {
    // Cancel any existing streaming request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          sessionId,
          stream: true,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to send message`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      setIsStreaming(true)
      setStreamingMessage('')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6).trim()
            
            if (eventData === '[DONE]') {
              setIsStreaming(false)
              return
            }

            try {
              const event: StreamEvent = JSON.parse(eventData)

              switch (event.type) {
                case 'start':
                  if (event.sessionId && !sessionId) {
                    setSessionId(event.sessionId)
                  }
                  break

                case 'content':
                  if (event.content) {
                    setStreamingMessage(prev => prev + event.content)
                  }
                  break

                case 'complete':
                  // Add the complete AI message to chat history
                  if (event.fullResponse) {
                    const aiMessage: ChatMessageType = {
                      id: `ai-${Date.now()}`,
                      role: 'assistant',
                      content: event.fullResponse,
                      timestamp: new Date(),
                    }
                    setMessages(prev => [...prev, aiMessage])
                  }

                  // Handle preferences if extracted
                  if (event.preferencesExtracted && event.preferences) {
                    setIsComplete(true)
                    setExtractedPreferences(event.preferences)
                    onPreferencesExtracted?.(event.preferences)
                    
                    // Add completion message
                    const completionMessage: ChatMessageType = {
                      id: `completion-${Date.now()}`,
                      role: 'assistant',
                      content: "Perfect! I've learned about your movie preferences. Take a look at the summary below, and then you can explore your personalized recommendations!",
                      timestamp: new Date(),
                    }
                    setMessages(prev => [...prev, completionMessage])
                  }

                  // Clear streaming state
                  setStreamingMessage('')
                  setIsStreaming(false)
                  setRetryCount(0)
                  break

                case 'error':
                  throw new Error(event.error || 'Streaming error occurred')
              }
            } catch (parseError) {
              console.warn('Failed to parse stream event:', eventData, parseError)
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }

      setIsStreaming(false)
      setStreamingMessage('')
      
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)

      // Add error message to chat
      const errorChatMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try sending your message again.",
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, errorChatMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleSendMessage = async (messageContent: string) => {
    if (isComplete || isLoading || isStreaming) return

    setIsLoading(true)
    setError(null)

    // Add user message to UI immediately
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])

    // Use streaming for better UX
    await handleStreamingResponse(messageContent)
  }

  const resetConversation = () => {
    // Cancel any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setMessages([])
    setSessionId(undefined)
    setIsComplete(false)
    setError(null)
    setExtractedPreferences(null)
    setRetryCount(0)
    setStreamingMessage('')
    setIsStreaming(false)
    
    // Re-add welcome message
    const welcomeMessage: ChatMessageType = {
      id: 'welcome-reset',
      role: 'assistant',
      content: "Let's start fresh! Tell me about your movie preferences and I'll help you discover your next favorite film! 🎬",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="flex h-full flex-col bg-gray-50" style={{ contain: 'layout style' }}>
      {/* Enhanced Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <span className="text-lg text-purple-600">🎬</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">CineAI Assistant</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                {isComplete ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Preferences gathered! Ready for recommendations.
                  </>
                ) : isStreaming ? (
                  <>
                    <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500" />
                    Streaming response...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    Learning your movie preferences...
                  </>
                )}
              </p>
            </div>
          </div>
          
          {/* Reset button */}
          {(messages.length > 1 || isComplete) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetConversation}
              className="flex items-center gap-2"
              disabled={isLoading || isStreaming}
            >
              <RefreshCw className="h-3 w-3" />
              Start Over
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-6 py-4"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="space-y-4">
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Streaming message display */}
          {isStreaming && streamingMessage && (
            <ChatMessage
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingMessage,
                timestamp: new Date(),
              }}
              isStreaming={true}
            />
          )}

          {/* Typing indicator for initial loading */}
          {isLoading && !isStreaming && (
            <ChatMessage
              message={{
                id: 'typing',
                role: 'assistant',
                content: '',
                timestamp: new Date(),
              }}
              isTyping={true}
            />
          )}

          {/* Enhanced error display */}
          {error && (
            <div className="flex justify-center">
              <div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">Something went wrong</p>
                    <p className="text-xs text-red-700 mt-1">{error}</p>
                    {retryCount < 3 && messages.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const lastUserMessage = messages
                            .filter(m => m.role === 'user')
                            .slice(-1)[0]?.content
                          if (lastUserMessage) {
                            handleRetry(lastUserMessage)
                          }
                        }}
                        disabled={isLoading || isStreaming}
                      >
                        Try Again ({3 - retryCount} attempts left)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Summary */}
          {isComplete && extractedPreferences && (
            <div className="mt-6">
              <PreferenceSummary 
                preferences={extractedPreferences}
                onEdit={() => {
                  setIsComplete(false)
                  setExtractedPreferences(null)
                }}
              />
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading || isStreaming}
        placeholder={
          isComplete
            ? 'Preferences gathered! Check out your recommendations above.'
            : isLoading || isStreaming
            ? 'AI is responding...'
            : 'Tell me about your movie preferences...'
        }
      />
    </div>
  )
}
