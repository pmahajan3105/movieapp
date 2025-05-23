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
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-blue-600 text-white rounded-br-none' 
          : 'bg-gray-100 text-gray-900 rounded-bl-none'
      }`}>
        {/* Message content */}
        <div className="text-sm">
          {isTyping ? (
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        {!isTyping && (
          <div className={`text-xs mt-1 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? 'ml-2 order-last' : 'mr-2'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-purple-100 text-purple-600'
        }`}>
          {isUser ? 'You' : '🎬'}
        </div>
      </div>
    </div>
  )
}

export const ChatMessage = memo(ChatMessageComponent) 