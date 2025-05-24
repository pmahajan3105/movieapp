'use client'

import { memo } from 'react'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatMessageProps {
  message: ChatMessageType
  isTyping?: boolean
}

function ChatMessageComponent({ message, isTyping = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  // Don't render system messages
  if (isSystem) return null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
          isUser
            ? 'rounded-br-none bg-blue-600 text-white'
            : 'rounded-bl-none bg-gray-100 text-gray-900'
        }`}
      >
        {/* Message content */}
        <div className="text-sm">
          {isTyping ? (
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        {!isTyping && (
          <div className={`mt-1 text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? 'order-last ml-2' : 'mr-2'}`}>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
            isUser ? 'bg-blue-600 text-white' : 'bg-purple-100 text-purple-600'
          }`}
        >
          {isUser ? 'You' : '🎬'}
        </div>
      </div>
    </div>
  )
}

export const ChatMessage = memo(ChatMessageComponent)
