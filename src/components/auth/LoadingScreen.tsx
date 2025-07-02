'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading your dashboard..." 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex flex-col justify-center">
      <div className="mx-auto text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            CineAI
          </span>
        </div>
        <div className="flex justify-center mb-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500"></div>
        </div>
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  )
}