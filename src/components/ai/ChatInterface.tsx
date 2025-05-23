'use client'

import { useState, useEffect, useRef } from 'react'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Send initial welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessageType = {
      id: 'welcome',
      role: 'assistant',
      content: "Hi there! I'm CineAI, your personal movie assistant. I'd love to learn about your movie preferences so I can recommend films you'll absolutely love!\n\nTo get started, tell me about a movie you've watched recently that you really enjoyed, or maybe a genre you're always in the mood for?",
      timestamp: new Date()
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
      timestamp: new Date()
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
          sessionId
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
          timestamp: new Date()
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
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600 text-lg">🎬</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              CineAI Assistant
            </h2>
            <p className="text-sm text-gray-500">
              {isComplete 
                ? "Preferences gathered! Ready for recommendations." 
                : "Learning your movie preferences..."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {/* Typing indicator */}
          {isLoading && (
            <ChatMessage
              message={{
                id: 'typing',
                role: 'assistant',
                content: '',
                timestamp: new Date()
              }}
              isTyping={true}
            />
          )}
          
          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-md">
                <div className="flex items-center space-x-2">
                  <div className="text-red-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 max-w-md">
                <div className="flex items-center space-x-2">
                  <div className="text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-green-800">
                    Perfect! I&apos;ve learned your preferences. You can now explore your personalized recommendations!
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
            ? "Conversation complete! Check out your recommendations." 
            : "Tell me about your movie preferences..."
        }
      />
    </div>
  )
} 