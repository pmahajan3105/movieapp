import { useState, useRef, useCallback } from 'react'
import type { PreferenceData } from '@/types/chat'

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

interface UseStreamingChatProps {
  onComplete?: (fullResponse: string) => void
  onPreferencesExtracted?: (preferences: PreferenceData) => void
  onSessionStart?: (sessionId: string) => void
}

export function useStreamingChat({
  onComplete,
  onPreferencesExtracted,
  onSessionStart,
}: UseStreamingChatProps = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startStreaming = useCallback(
    async (messageContent: string, sessionId?: string) => {
      // Cancel any existing streaming request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        setIsStreaming(true)
        setStreamingMessage('')
        setError(null)

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
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response stream available')
        }

        let fullResponse = ''

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
                return fullResponse
              }

              try {
                const event: StreamEvent = JSON.parse(eventData)

                switch (event.type) {
                  case 'start':
                    if (event.sessionId) {
                      onSessionStart?.(event.sessionId)
                    }
                    break

                  case 'content':
                    if (event.content) {
                      fullResponse += event.content
                      setStreamingMessage(prev => prev + event.content)
                    }
                    break

                  case 'complete':
                    // Use the accumulated fullResponse from streaming content
                    if (fullResponse) {
                      onComplete?.(fullResponse)
                    } else if (event.fullResponse) {
                      // Fallback to event.fullResponse if no content was streamed
                      onComplete?.(event.fullResponse)
                      fullResponse = event.fullResponse
                    }

                    if (event.preferencesExtracted && event.preferences) {
                      onPreferencesExtracted?.(event.preferences)
                    }

                    setStreamingMessage('')
                    setIsStreaming(false)
                    return fullResponse

                  case 'error':
                    throw new Error(event.error || 'Streaming error occurred')
                }
              } catch (parseError) {
                // No logger or unusedVar to log or use
              }
            }
          }
        }

        return fullResponse
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, ignore
          return null
        }

        const errorMessage = err instanceof Error ? err.message : 'Streaming error occurred'

        // If this is a streaming capability error, re-throw for fallback handling
        if (
          errorMessage.includes('does not support streaming') ||
          errorMessage.includes('streaming')
        ) {
          throw err
        }

        setError(errorMessage)
        throw err
      } finally {
        setIsStreaming(false)
        setStreamingMessage('')
        abortControllerRef.current = null
      }
    },
    [onComplete, onPreferencesExtracted, onSessionStart]
  )

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsStreaming(false)
    setStreamingMessage('')
  }, [])

  return {
    isStreaming,
    streamingMessage,
    error,
    startStreaming,
    stopStreaming,
  }
}
