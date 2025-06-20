import { useState, useCallback } from 'react'
import type { ChatMessage } from '@/types/chat'

export function useChatSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string>()

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  const addUserMessage = useCallback(
    (content: string) => {
      const message: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      }
      addMessage(message)
      return message
    },
    [addMessage]
  )

  const addAssistantMessage = useCallback(
    (content: string, id?: string) => {
      const message: ChatMessage = {
        id: id || `ai-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
      }
      addMessage(message)
      return message
    },
    [addMessage]
  )

  const addErrorMessage = useCallback(() => {
    const message: ChatMessage = {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: "I'm sorry, I encountered an error. Please try sending your message again.",
      timestamp: new Date(),
    }
    addMessage(message)
    return message
  }, [addMessage])

  const initializeWithWelcome = useCallback(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi there! I'm CineAI, your personal movie assistant powered by Claude! 🎬\n\nI'd love to learn about your movie preferences so I can recommend films you'll absolutely love. This will only take a few minutes!\n\nTo get started, tell me about a movie you've watched recently that you really enjoyed, or maybe a genre you're always in the mood for?",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [])

  const resetSession = useCallback(() => {
    setMessages([])
    setSessionId(undefined)

    // Re-add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome-reset',
      role: 'assistant',
      content:
        "Let's start fresh! Tell me about your movie preferences and I'll help you discover your next favorite film! 🎬",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [])

  const getLastUserMessage = useCallback(() => {
    return messages.filter(m => m.role === 'user').slice(-1)[0]?.content
  }, [messages])

  return {
    messages,
    sessionId,
    setSessionId,
    addMessage,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    initializeWithWelcome,
    resetSession,
    getLastUserMessage,
  }
}
