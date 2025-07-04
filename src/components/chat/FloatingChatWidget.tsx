'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { MessageCircle, X, Minimize2, Maximize2, Sparkles } from 'lucide-react'
import { ChatInterface } from './ChatInterface'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserActivityData } from '@/lib/user-activity-fetcher'
import { assessUserOnboardingStatus } from '@/lib/user-onboarding-utils'

interface FloatingChatWidgetProps {
  className?: string
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  className
}) => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [showPulse, setShowPulse] = useState(false)

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

  // Check if user is new and show enhanced chat prompts
  useEffect(() => {
    if (user?.id) {
      fetchUserActivityData(user.id).then(activityData => {
        const onboardingStatus = assessUserOnboardingStatus(
          activityData.aiProfile,
          activityData.interactions
        )
        
        const isUserNew = onboardingStatus.interactionLevel === 'new' || 
                         onboardingStatus.interactionLevel === 'minimal'
        
        setIsNewUser(isUserNew)
        
        // Show pulse animation for new users
        if (isUserNew && !onboardingStatus.hasChatHistory) {
          setShowPulse(true)
          
          // Stop pulse after some time
          const timeout = setTimeout(() => {
            setShowPulse(false)
          }, 15000) // 15 seconds
          
          return () => clearTimeout(timeout)
        }
        return undefined;
      }).catch(error => {
        console.error('Failed to fetch user activity data:', error)
      })
    }
  }, [user])

  // Stop pulse when chat is opened
  useEffect(() => {
    if (isOpen) {
      setShowPulse(false)
    }
  }, [isOpen])

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
          {/* Pulse animation ring for new users */}
          {showPulse && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-ping opacity-30"></div>
          )}
          
          {/* New user notification badge */}
          {isNewUser && !showPulse && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          )}
          
          <button
            onClick={handleToggle}
            data-floating-chat-widget
            className={cn(
              "h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center group relative",
              showPulse && "animate-pulse scale-110"
            )}
          >
            <MessageCircle className="h-7 w-7 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          
          {/* New user tooltip */}
          {isNewUser && (
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Ask me for movie recommendations! 🎬
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
            </div>
          )}
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
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                CineAI Assistant
                {isNewUser && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-orange-700 text-xs rounded-full border border-orange-200">
                    <Sparkles className="w-3 h-3" />
                    New User
                  </div>
                )}
              </h3>
              {isNewUser && (
                <p className="text-xs text-slate-600 mt-1">
                  Ask me anything about movies! 🎬
                </p>
              )}
            </div>
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