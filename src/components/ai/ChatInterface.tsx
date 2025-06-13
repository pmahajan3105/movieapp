'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { PreferenceConfirmation } from '@/components/chat/PreferenceConfirmation'
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

  // Auto-scroll management
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Enhanced welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessageType = {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi there! I'm CineAI, your personal movie assistant powered by Claude! 🎬\n\nI'd love to learn about your movie preferences so I can recommend films you'll absolutely love. This will only take a few minutes!\n\nTo get started, tell me about a movie you've watched recently that you really enjoyed, or maybe a genre you're always in the mood for?",
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
        const errorText = await response.text()
        console.error('🚨 Streaming API error:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
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
                      content:
                        "Perfect! I've learned about your movie preferences. Take a look at the summary below, and then you can explore your personalized recommendations!",
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

      // If this is a streaming capability error, don't show error UI - let fallback handle it
      if (
        errorMessage.includes('does not support streaming') ||
        errorMessage.includes('streaming')
      ) {
        // Streaming not supported, falling back to non-streaming
        throw err // Re-throw to trigger fallback
      }

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
    if (isLoading || isStreaming) return

    // If preferences are complete and user is asking for recommendations, handle with enhanced system
    if (
      isComplete &&
      (messageContent.toLowerCase().includes('recommend') ||
        messageContent.toLowerCase().includes('suggest') ||
        messageContent.toLowerCase().includes('movie') ||
        messageContent.toLowerCase().includes('film') ||
        messageContent.toLowerCase().includes('watch') ||
        messageContent.toLowerCase().includes('find'))
    ) {
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

      try {
        const enhancedResponse = await fetch('/api/ai/recommendations', {
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

        if (!enhancedResponse.ok) {
          throw new Error(`Enhanced recommendations failed: ${enhancedResponse.status}`)
        }

        const enhancedData = await enhancedResponse.json()

        if (enhancedData.success && enhancedData.recommendations?.length > 0) {
          const recommendationsMessage: ChatMessageType = {
            id: `recommendations-${Date.now()}`,
            role: 'assistant',
            content: `🎬 **Here are some great movies for you:**

${enhancedData.recommendations
  .slice(0, 6)
  .map(
    (
      movie: {
        title: string
        year: number
        rating: number
        genres?: string[]
        reason?: string
        summary?: string
      },
      index: number
    ) => `
**${index + 1}. ${movie.title}** (${movie.year})
⭐ ${movie.rating}/10 | 🎭 ${movie.genres?.join(', ') || 'Multiple genres'}
📝 ${movie.reason || movie.summary || 'Perfect match for you!'}
`
  )
  .join('\n')}

${enhancedData.intelligence_summary ? `\n**🧠 Insight:** ${enhancedData.intelligence_summary}` : ''}

Want more recommendations? Just ask! I can suggest movies by genre, mood, or any specific criteria you have in mind. 🍿`,
            timestamp: new Date(),
          }

          setMessages(prev => [...prev, recommendationsMessage])

          // Trigger real-time learning update
          try {
            await fetch('/api/ai/recommendations', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'conversation_interaction',
                data: {
                  message: messageContent,
                  recommendations_provided: enhancedData.recommendations.length,
                  timestamp: new Date().toISOString(),
                },
              }),
            })
          } catch (learningError) {
            console.warn('⚠️ Real-time learning update failed:', learningError)
          }
        } else {
          // Fallback if no recommendations
          const fallbackMessage: ChatMessageType = {
            id: `fallback-${Date.now()}`,
            role: 'assistant',
            content:
              "I'm having trouble finding specific recommendations right now. Please try asking differently or visit the Recommendations tab for your personalized movie suggestions!",
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, fallbackMessage])
        }
      } catch (error) {
        console.error('❌ Enhanced conversation error:', error)

        const errorMessage: ChatMessageType = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'I encountered an issue getting recommendations. Please try again or visit the Recommendations tab for your personalized suggestions.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Prevent non-recommendation messages after completion
    if (isComplete) {
      console.log('Chat completed, ignoring non-recommendation message')
      return
    }

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

    try {
      // Try streaming first, fallback to non-streaming if it fails
      await handleStreamingResponse(messageContent)
    } catch {
      // Streaming failed, falling back to non-streaming

      try {
        // Fallback to non-streaming API call
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            sessionId,
            stream: false, // Force non-streaming
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to get response')
        }

        // Update session ID if provided
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId)
        }

        // Add AI response to chat
        const aiMessage: ChatMessageType = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])

        // Handle preferences if extracted
        if (data.preferencesExtracted && data.preferences) {
          setIsComplete(true)
          setExtractedPreferences(data.preferences)
          onPreferencesExtracted?.(data.preferences)

          // Add completion message
          const completionMessage: ChatMessageType = {
            id: `completion-${Date.now()}`,
            role: 'assistant',
            content:
              "Perfect! I've learned about your movie preferences. Take a look at the summary below, and then you can explore your personalized recommendations!",
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, completionMessage])

          // Generate enhanced recommendations immediately after preferences are extracted
          try {
            console.log('🎬 Generating enhanced recommendations...')
            setIsLoading(true)

            const enhancedResponse = await fetch('/api/ai/recommendations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: 'Generate personalized movie recommendations based on my preferences',
                conversationContext: `User just set their preferences: ${JSON.stringify(data.preferences)}`,
                includeReasons: true,
                maxRecommendations: 8,
              }),
            })

            if (!enhancedResponse.ok) {
              throw new Error(`Enhanced recommendations failed: ${enhancedResponse.status}`)
            }

            const enhancedData = await enhancedResponse.json()
            console.log(
              '✅ Enhanced recommendations received:',
              enhancedData.recommendations?.length
            )

            if (enhancedData.success && enhancedData.recommendations?.length > 0) {
              // Add enhanced recommendations message to chat
              const recommendationsMessage: ChatMessageType = {
                id: `recommendations-${Date.now()}`,
                role: 'assistant',
                content: `🎯 **Your Personalized Movie Recommendations**

Based on your preferences, here are movies perfectly tailored for you:

${enhancedData.recommendations
  .slice(0, 6)
  .map(
    (
      movie: {
        title: string
        year: number
        rating: number
        genres?: string[]
        reason?: string
        summary?: string
      },
      index: number
    ) => `
**${index + 1}. ${movie.title}** (${movie.year})
⭐ ${movie.rating}/10 | 🎭 ${movie.genres?.join(', ') || 'Multiple genres'}
📝 ${movie.reason || movie.summary || 'Great match for your taste!'}
`
  )
  .join('\n')}

${enhancedData.intelligence_summary ? `\n**🧠 Your Movie Intelligence:**\n${enhancedData.intelligence_summary}` : ''}

These recommendations are based on advanced behavioral analysis of your viewing patterns and preferences. The more you interact with the app (rate movies, add to watchlist), the smarter these recommendations become! 🚀`,
                timestamp: new Date(),
              }

              setMessages(prev => [...prev, recommendationsMessage])

              // Also trigger any real-time learning updates
              if (enhancedData.recommendations.length > 0) {
                try {
                  await fetch('/api/ai/recommendations', {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action: 'preferences_set',
                      data: {
                        preferences: data.preferences,
                        timestamp: new Date().toISOString(),
                      },
                    }),
                  })
                  console.log('✅ Real-time learning updated for preference setting')
                } catch (learningError) {
                  console.warn('⚠️ Real-time learning update failed:', learningError)
                }
              }
            }
          } catch (enhancedError) {
            console.error('❌ Enhanced recommendations error:', enhancedError)

            // Add fallback message if enhanced recommendations fail
            const fallbackMessage: ChatMessageType = {
              id: `fallback-${Date.now()}`,
              role: 'assistant',
              content:
                "I've saved your preferences! Visit the Recommendations tab to see your personalized movie suggestions, or continue chatting to get specific recommendations.",
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, fallbackMessage])
          } finally {
            setIsLoading(false)
          }
        }

        setRetryCount(0) // Reset retry count on success
      } catch (fallbackError) {
        console.error('❌ Both streaming and non-streaming failed:', fallbackError)

        const errorMessage =
          fallbackError instanceof Error ? fallbackError.message : 'Something went wrong'
        setError(errorMessage)

        // Add error message to chat
        const errorChatMessage: ChatMessageType = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I encountered an error. Please try sending your message again.",
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorChatMessage])
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
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
      content:
        "Let's start fresh! Tell me about your movie preferences and I'll help you discover your next favorite film! 🎬",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }

  // Auto-scroll management for streaming
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="bg-base-100 flex h-full flex-col" style={{ contain: 'layout style' }}>
      {/* Enhanced Header */}
      <div className="border-base-300 bg-base-200 flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
              <span className="text-primary text-lg">🎬</span>
            </div>
            <div>
              <h2 className="text-base-content text-lg font-semibold">CineAI Assistant</h2>
              <p className="text-base-content/70 flex items-center gap-1 text-sm">
                {isComplete ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Ready! Ask for personalized recommendations.
                  </>
                ) : isLoading || isStreaming ? (
                  <>
                    <span className="bg-primary inline-block h-3 w-3 animate-pulse rounded-full" />
                    {isStreaming ? 'Streaming response...' : 'Thinking...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="text-primary h-3 w-3" />
                    Learning your movie preferences...
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Reset button */}
          {(messages.length > 1 || isComplete) && (
            <button
              className="btn btn-outline btn-sm"
              onClick={resetConversation}
              disabled={isLoading || isStreaming}
            >
              <RefreshCw className="h-3 w-3" />
              Start Over
            </button>
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
          {messages.map(message => {
            console.log('🔄 Rendering message:', message)
            return <ChatMessage key={message.id} message={message} />
          })}

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

          {/* Typing indicator for loading */}
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
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Something went wrong</p>
                    <p className="mt-1 text-xs text-red-700">{error}</p>
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

          {/* Preference Confirmation */}
          {isComplete && extractedPreferences && (
            <div className="mt-6">
              <PreferenceConfirmation
                preferences={extractedPreferences}
                onConfirm={confirmedPreferences => {
                  // Save confirmed preferences and redirect to recommendations
                  onPreferencesExtracted?.(confirmedPreferences)
                  console.log('Preferences confirmed:', confirmedPreferences)
                }}
                onEdit={() => {
                  setIsComplete(false)
                  setExtractedPreferences(null)
                }}
                isLoading={isLoading}
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
            ? 'Ask for more recommendations! Try "suggest comedy movies" or "recommend action films"...'
            : isLoading || isStreaming
              ? 'AI is responding...'
              : 'Tell me about your movie preferences...'
        }
      />
    </div>
  )
}
