'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

interface DashboardLoadingScreenProps {
  message?: string
}

export const DashboardLoadingScreen: React.FC<DashboardLoadingScreenProps> = ({ 
  message = "Loading your dashboard..." 
}) => {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="mx-auto text-center">
        <div className="mb-4 inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-2xl font-bold text-transparent">
            CineAI
          </span>
        </div>
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500"></div>
        </div>
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  )
} 