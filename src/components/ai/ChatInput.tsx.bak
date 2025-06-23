'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Share your movie preferences...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmedMessage = message.trim()
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage)
      setMessage('')
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFocus = () => {
    // Prevent page scroll when input gains focus
    if (inputRef.current) {
      const scrollY = window.scrollY
      setTimeout(() => {
        window.scrollTo(0, scrollY)
      }, 0)
    }
  }

  return (
    <div className="flex items-center space-x-2 border-t border-base-300 bg-base-200 p-4 flex-shrink-0">
      <div className="flex-1">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="input input-bordered w-full"
          maxLength={1000}
          onFocus={handleFocus}
        />
      </div>

      <button 
        onClick={handleSend} 
        disabled={disabled || !message.trim()} 
        className="btn btn-primary px-6"
      >
        {disabled ? (
          <div className="flex items-center space-x-2">
            <span className="loading loading-spinner loading-sm"></span>
            <span>Sending...</span>
          </div>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
