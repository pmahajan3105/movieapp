'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

interface DashboardHeaderProps {
  title?: string
  subtitle?: string
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title = "Welcome to CineAI!",
  subtitle = "Your personal AI movie companion with intelligent recommendations and conversation"
}) => {
  return (
    <div className="mb-12 text-center">
      <div className="mb-6">
        <div className="mb-4 inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-4xl font-bold text-transparent">
            {title}
          </h1>
        </div>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          {subtitle}
        </p>
      </div>
    </div>
  )
} 