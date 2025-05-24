'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatMessage as ChatMessageType, ChatApiResponse, PreferenceData } from '@/types/chat'

interface ChatInterfaceProps {
  onPreferencesExtracted?: (preferences: PreferenceData) => void
}

export function ChatInterface({ onPreferencesExtracted }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>()
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
      setShouldAutoScroll(isAtBottom)
    }
  }, [])

  // Only auto-scroll when we should
  useEffect(() => {
    scrollToBottom()
  }, [messages, shouldAutoScroll, scrollToBottom])

  // Auto-scroll when new messages are added (but only if user is at bottom)
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        // Always scroll for AI responses
        setShouldAutoScroll(true)
        setTimeout(scrollToBottom, 100)
      }
    }
  }, [messages, scrollToBottom])

  // Send initial welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessageType = {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi there! I'm CineAI, your personal movie assistant. I'd love to learn about your movie preferences so I can recommend films you'll absolutely love!\n\nTo get started, tell me about a movie you've watched recently that you really enjoyed, or maybe a genre you're always in the mood for?",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [])

  const handleSendMessage = async (messageContent: string) => {
    if (isComplete) return

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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          sessionId,
        }),
      })

      const data: ChatApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Update session ID if new
      if (!sessionId) {
        setSessionId(data.sessionId)
      }

      // Add AI response
      if (data.message) {
        const aiMessage: ChatMessageType = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }

        setMessages(prev => [...prev, aiMessage])
      }

      // Handle preferences extraction
      if (data.preferencesExtracted && data.preferences) {
        setIsComplete(true)
        onPreferencesExtracted?.(data.preferences)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')

      // Add error message to chat
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try sending your message again.",
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-gray-50" style={{ contain: 'layout style' }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
            <span className="text-lg text-purple-600">🎬</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">CineAI Assistant</h2>
            <p className="text-sm text-gray-500">
              {isComplete
                ? 'Preferences gathered! Ready for recommendations.'
                : 'Learning your movie preferences...'}
            </p>
          </div>
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

          {/* Typing indicator */}
          {isLoading && (
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

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="text-red-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Completion message */}
          {isComplete && (
            <div className="flex justify-center">
              <div className="max-w-md rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="text-green-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-green-800">
                    Perfect! I&apos;ve learned your preferences. You can now explore your
                    personalized recommendations!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading || isComplete}
        placeholder={
          isComplete
            ? 'Conversation complete! Check out your recommendations.'
            : 'Tell me about your movie preferences...'
        }
      />
    </div>
  )
}
