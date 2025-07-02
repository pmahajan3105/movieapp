'use client'

import React, { useState, useCallback } from 'react'
import { MessageCircle, Mic, MicOff, Plus, X } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useSimpleVoiceChat } from '@/hooks/useSimpleVoiceChat'
import { cn } from '@/lib/utils'

interface FloatingActionGroupProps {
  className?: string
}

export const FloatingActionGroup: React.FC<FloatingActionGroupProps> = ({
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const [transcript, setTranscript] = useState('')

  const { 
    isSupported: isVoiceSupported,
    isActive: isVoiceActive,
    isListening,
    isSpeaking,
    toggleVoiceChat 
  } = useSimpleVoiceChat({
    onTranscript: (text, isFinal) => {
      setTranscript(isFinal ? '' : text)
    },
    onError: (error) => {
      console.error('Voice error:', error)
    }
  })

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleChatToggle = useCallback(() => {
    setIsChatOpen(!isChatOpen)
    setIsChatMinimized(false)
    setIsExpanded(false)
  }, [isChatOpen])

  const handleVoiceToggle = useCallback(() => {
    toggleVoiceChat()
    setIsExpanded(false)
  }, [toggleVoiceChat])

  const handleChatMinimize = useCallback(() => {
    setIsChatMinimized(!isChatMinimized)
  }, [isChatMinimized])

  const handleChatClose = useCallback(() => {
    setIsChatOpen(false)
    setIsChatMinimized(false)
  }, [])


  return (
    <>
      {/* Floating Action Group */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3',
          className
        )}
      >
        {/* Voice Button (when expanded) */}
        {isExpanded && isVoiceSupported && (
          <div className="animate-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={handleVoiceToggle}
              className={cn(
                'h-12 w-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110 group relative',
                isVoiceActive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              )}
              title={isListening ? 'Stop Listening' : isSpeaking ? 'Stop Speaking' : 'Start Voice Chat'}
            >
              <div className="flex h-full w-full items-center justify-center">
                {isListening ? (
                  <MicOff className="h-5 w-5 text-white" />
                ) : (
                  <Mic className="h-5 w-5 text-white" />
                )}
              </div>

              {/* Status indicator */}
              {isVoiceActive && (
                <div className={cn(
                  'absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white',
                  isListening ? 'bg-green-400' : isSpeaking ? 'bg-blue-400' : 'bg-yellow-400'
                )} />
              )}

              {/* Pulse animation when active */}
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-green-400 opacity-75 animate-ping" />
              )}

              {/* Label */}
              <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden group-hover:block">
                <div className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg">
                  {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Voice Chat'}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 h-0 w-0 border-y-4 border-l-4 border-transparent border-l-gray-900" />
                </div>
              </div>
            </button>
            
            {/* Transcript display */}
            {transcript && (
              <div className="absolute right-14 bottom-0 max-w-xs p-2 bg-black/80 text-white text-xs rounded-lg">
                {transcript}
              </div>
            )}
          </div>
        )}

        {/* Chat Button (when expanded) */}
        {isExpanded && (
          <div className="animate-in slide-in-from-bottom-2 duration-200 delay-75">
            <button
              onClick={handleChatToggle}
              className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg transition-all duration-300 hover:scale-110 group relative"
              title="Open Chat"
            >
              <div className="flex h-full w-full items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>

              {/* Label */}
              <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden group-hover:block">
                <div className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg">
                  Text Chat
                  <div className="absolute left-full top-1/2 -translate-y-1/2 h-0 w-0 border-y-4 border-l-4 border-transparent border-l-gray-900" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Main FAB */}
        {!isChatOpen && (
          <button
            onClick={handleToggleExpand}
            className={cn(
              'h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group',
              isExpanded ? 'rotate-45 hover:rotate-45' : 'hover:scale-105'
            )}
            title={isExpanded ? 'Close menu' : 'Open AI Assistant'}
          >
            {isExpanded ? (
              <X className="h-7 w-7 transition-transform" />
            ) : (
              <Plus className="h-7 w-7 group-hover:scale-110 transition-transform" />
            )}
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            {/* Breathing animation when not expanded */}
            {!isExpanded && (
              <div className="absolute inset-0 rounded-full bg-purple-400/30 animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* Chat Widget */}
      {isChatOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 transition-all duration-300 ease-in-out',
            isChatMinimized 
              ? 'w-80 h-16' 
              : 'w-96 h-[32rem]',
            'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]'
          )}
          style={{
            maxWidth: 'calc(100vw - 1rem)',
            maxHeight: 'calc(100vh - 1rem)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-200/50 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-2xl">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800 flex-1">
              CineAI Assistant
            </h3>
            <div className="flex gap-1">
              <button
                onClick={handleChatMinimize}
                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200/50 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
              >
                {isChatMinimized ? '□' : '−'}
              </button>
              <button
                onClick={handleChatClose}
                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200/50 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isChatMinimized && (
            <div className="flex-1 h-[calc(100%-4rem)]">
              <ChatInterface 
                onClose={handleChatClose}
                className="h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Backdrop for mobile */}
      {isChatOpen && !isChatMinimized && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={handleChatClose}
        />
      )}

      {/* Backdrop for expanded state */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40 transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  )
}