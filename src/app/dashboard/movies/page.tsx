'use client'

import { useAuth } from '@/contexts/AuthContext'
import { TrendingMoviesGrid } from '@/components/movies/TrendingMoviesGrid'
import PreferencesSetup from '@/components/PreferencesSetup'
import { TrendingUp } from 'lucide-react'

export default function MoviesPage() {
  const { user } = useAuth()

  if (!user) {
    return <PreferencesSetup />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                Trending Movies
              </h1>
              <p className="text-slate-600 text-lg">
                Discover what's popular right now • Powered by TMDB
              </p>
            </div>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl p-6">
          <TrendingMoviesGrid />
        </div>
      </div>
    </div>
  )
}