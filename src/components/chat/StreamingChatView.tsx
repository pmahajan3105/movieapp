'use client'

import React from 'react'
import type { ChatMessage } from '@/types/chat'
import { Send, Loader2 } from 'lucide-react'

interface StreamingChatViewProps {
  messages: ChatMessage[]
  streamingMessage?: string
  isStreaming: boolean
  onSendMessage: (message: string) => void
  className?: string
}

export function StreamingChatView({
  messages,
  streamingMessage,
  isStreaming,
  onSendMessage,
  className = '',
}: StreamingChatViewProps) {
  const [inputValue, setInputValue] = React.useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = React.useCallback(() => {
    if (messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        })
      })
    }
  }, [])

  // Scroll to bottom when messages change or streaming updates
  React.useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isStreaming) {
      onSendMessage(inputValue.trim())
      setInputValue('')
      // Scroll to bottom after sending message (small delay to ensure message is rendered)
      setTimeout(scrollToBottom, 100)
    }
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-base-content/60 text-center">
              <h3 className="mb-2 text-lg font-medium">Welcome to CineAI! 🎬</h3>
              <p>Start a conversation to get personalized movie recommendations</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div
                key={message.id}
                className={`chat ${message.role === 'user' ? 'chat-end' : 'chat-start'}`}
              >
                <div
                  className={`chat-bubble ${
                    message.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-neutral'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                <div className="chat-footer text-xs opacity-50">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {isStreaming && streamingMessage && (
              <div className="chat chat-start">
                <div className="chat-bubble chat-bubble-neutral">
                  <div className="flex items-start space-x-2">
                    <Loader2 className="mt-1 h-4 w-4 flex-shrink-0 animate-spin" />
                    <div className="whitespace-pre-wrap">{streamingMessage}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isStreaming && !streamingMessage && (
              <div className="chat chat-start">
                <div className="chat-bubble chat-bubble-neutral">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll target - invisible element at the bottom */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-base-300 border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask for movie recommendations..."
            className="input input-bordered flex-1"
            disabled={isStreaming}
          />
          <button
            type="submit"
            className="btn btn-primary btn-square"
            disabled={isStreaming || !inputValue.trim()}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
