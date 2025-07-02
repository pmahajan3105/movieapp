'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

import { useAuth } from '@/contexts/AuthContext'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'

import type { Movie } from '@/types'
import { Sparkles } from 'lucide-react'
// Removed ChatInterface - now using FloatingChatWidget instead

const BehavioralInsightsPanel = dynamic(
  () =>
    import('@/components/dashboard/BehavioralInsightsPanel').then(m => ({
      default: m.BehavioralInsightsPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-base-200 flex h-64 animate-pulse items-center justify-center rounded-lg">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    ),
  }
)

// Removed VoiceConversationWidget - now using FloatingVoiceButton instead

const HyperPersonalizedSection = dynamic(
  () =>
    import('@/components/dashboard/HyperPersonalizedSection').then(m => ({
      default: m.HyperPersonalizedSection,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-base-200 flex h-48 animate-pulse items-center justify-center rounded-lg">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    ),
  }
)

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [movieModalOpen, setMovieModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration issues by ensuring we're mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMovieView = async (movieId: string, movieData?: any) => {
    // If we already have movie data, use it directly
    if (movieData) {
      setSelectedMovie(movieData)
      setMovieModalOpen(true)
      return
    }

    // Otherwise fetch movie details and open modal
    try {
      // First try the details endpoint
      let response = await fetch(`/api/movies/details/${movieId}`)

      if (!response.ok) {
        // Fallback to the general movies endpoint
        response = await fetch(`/api/movies/${movieId}`)
      }

      if (response.ok) {
        const responseData = await response.json()
        // Movie data received successfully

        // Handle different response formats
        const movie = responseData.movie || responseData.data || responseData

        if (movie) {
          setSelectedMovie(movie)
          setMovieModalOpen(true)
        } else {
          // No movie data in response
        }
      } else {
        // Failed to fetch movie details
      }
    } catch {
      // Error fetching movie details
    }
  }

  const handleMovieSave = async (movieId: string) => {
    // Add to watchlist
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      })
      if (response.ok) {
        // Show success feedback
        // Movie added to watchlist successfully
      }
    } catch {
      // Failed to add to watchlist
    }
  }

  const handleMovieRate = async (movieId: string, rating: number) => {
    // Rate movie
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, rating }),
      })
      if (response.ok) {
        // Movie rated successfully
      }
    } catch {
      // Failed to rate movie
    }
  }

  // Preferences handling moved to FloatingChatWidget

  // Show loading while mounting or authenticating
  if (!mounted || isLoading) {
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
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated after mounting, redirect to login
  if (mounted && !user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-6">
            <div className="mb-4 inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-4xl font-bold text-transparent">
                Welcome to CineAI!
              </h1>
            </div>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Your personal AI movie companion with intelligent recommendations and conversation
            </p>
          </div>
        </div>

        {/* F-1 Hyper-Personalized Section - Main Feature */}
        <div className="mb-12">
          <div className="rounded-3xl border border-slate-200/50 bg-white/60 p-6 shadow-xl backdrop-blur-sm">
            <HyperPersonalizedSection
              onMovieView={handleMovieView}
              onMovieSave={handleMovieSave}
              onMovieRate={handleMovieRate}
            />
          </div>
        </div>

        {/* Behavioral Insights Panel */}
        <div className="mb-12">
          <div className="rounded-3xl border border-slate-200/50 bg-white/60 p-6 shadow-xl backdrop-blur-sm">
            <BehavioralInsightsPanel />
          </div>
        </div>

        {/* Movie Details Modal */}
        <MovieDetailsModal
          movie={selectedMovie}
          open={movieModalOpen}
          onClose={() => {
            setMovieModalOpen(false)
            setSelectedMovie(null)
          }}
          onAddToWatchlist={handleMovieSave}
        />
      </div>
    </div>
  )
}
