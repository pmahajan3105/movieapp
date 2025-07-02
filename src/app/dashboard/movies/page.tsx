'use client'

import { useAuth } from '@/contexts/AuthContext'
import { TrendingMoviesGrid } from '@/components/movies/TrendingMoviesGrid'
import { TrendingUp } from 'lucide-react'
import { FilterPanel } from '@/components/search/FilterPanel'
import React, { useState } from 'react'
import type { SearchFilters } from '@/types/search'

export default function MoviesPage() {
  const { user, isLoading } = useAuth()

  const [filters, setFilters] = useState<SearchFilters>({})

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // RequireAuth wrapper will handle redirect
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
                Discover what&apos;s popular right now • Powered by TMDB
              </p>
            </div>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Panel */}
          <div className="lg:col-span-1">
            <FilterPanel filters={filters} onFiltersChange={setFilters} />
          </div>
          {/* Movies */}
          <div className="lg:col-span-3 bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl p-6">
            <TrendingMoviesGrid filters={filters} />
          </div>
        </div>
      </div>
    </div>
  )
}