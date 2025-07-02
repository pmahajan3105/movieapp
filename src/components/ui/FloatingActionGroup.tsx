'use client'

import React, { useState, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { cn } from '@/lib/utils'

interface FloatingActionGroupProps {
  className?: string
}

export const FloatingActionGroup: React.FC<FloatingActionGroupProps> = ({
  className
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChatMinimized, setIsChatMinimized] = useState(false)

  const handleChatToggle = useCallback(() => {
    setIsChatOpen(!isChatOpen)
    setIsChatMinimized(false)
  }, [isChatOpen])

  return (
    <>
      {/* Floating Action Group */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3',
          className
        )}
      >
        {/* Chat Floating Button */}
        {!isChatOpen && (
          <button
            onClick={handleChatToggle}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center hover:scale-105 group"
            title="Open Chat"
          >
            <MessageCircle className="h-7 w-7" />
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
                onClick={handleChatToggle}
                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200/50 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
              >
                {isChatMinimized ? '□' : '−'}
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isChatMinimized && (
            <div className="flex-1 h-[calc(100%-4rem)]">
              <ChatInterface 
                onClose={handleChatToggle}
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
          onClick={handleChatToggle}
        />
      )}
    </>
  )
}