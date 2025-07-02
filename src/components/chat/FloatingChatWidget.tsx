'use client'

import React, { useState, useCallback } from 'react'
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react'
import { ChatInterface } from './ChatInterface'
import { cn } from '@/lib/utils'

interface FloatingChatWidgetProps {
  className?: string
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen)
    setIsMinimized(false)
  }, [isOpen])

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized)
  }, [isMinimized])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
  }, [])

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50',
            className
          )}
        >
          <button
            onClick={handleToggle}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
          >
            <MessageCircle className="h-7 w-7 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 transition-all duration-300 ease-in-out',
            isMinimized 
              ? 'w-80 h-16' 
              : 'w-96 h-[32rem]',
            'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
            className
          )}
          style={{
            // Ensure it doesn't go off screen on mobile
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
                onClick={handleMinimize}
                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200/50 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200/50 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex-1 h-[calc(100%-4rem)]">
              <ChatInterface 
                onClose={handleClose}
                className="h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Backdrop for mobile */}
      {isOpen && !isMinimized && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={handleClose}
        />
      )}
    </>
  )
}