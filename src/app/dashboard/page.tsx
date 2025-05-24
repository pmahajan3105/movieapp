'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Film, Zap, TrendingUp, MessageCircle } from 'lucide-react'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Movie } from '@/types'
import { useRouter } from 'next/navigation'

interface SimplifiedDashboardState {
  recommendations: Movie[]
  topMovies: Movie[]
  selectedMovie: Movie | null
  isLoading: boolean
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [state, setState] = useState<SimplifiedDashboardState>({
    recommendations: [],
    topMovies: [],
    selectedMovie: null,
    isLoading: true,
  })

  useEffect(() => {
    // Load recommendations and movies
    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }))

        // Fetch recommendations
        const recsResponse = await fetch('/api/recommendations?limit=6')
        const recsData = await recsResponse.json()

        // Fetch top movies
        const moviesResponse = await fetch('/api/movies?limit=12')
        const moviesData = await moviesResponse.json()

        setState(prev => ({
          ...prev,
          recommendations: recsData.success ? recsData.data : [],
          topMovies: moviesData.success ? moviesData.data : [],
          isLoading: false,
        }))
      } catch (error) {
        console.error('Error loading data:', error)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    if (!loading) {
      loadData()
    }
  }, [loading])

  const handleRate = async (movieId: string, interested: boolean, rating?: number) => {
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movieId,
          interested,
          rating,
          user_id: user?.id || 'anonymous',
        }),
      })

      if (response.ok) {
        console.log('Rating saved successfully')
        // Optionally refresh recommendations
      }
    } catch (error) {
      console.error('Error saving rating:', error)
    }
  }

  if (loading || state.isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            Loading your personalized movie recommendations...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome back! 🎬</h1>
          <p className="text-gray-600">
            Discover your next favorite movie with AI-powered recommendations
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
              <Film className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.recommendations.length}</div>
              <p className="text-muted-foreground text-xs">Personalized picks for you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Movies</CardTitle>
              <TrendingUp className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.topMovies.length}</div>
              <p className="text-muted-foreground text-xs">Highest rated films</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
              <MessageCircle className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-muted-foreground text-xs">Ask for movie recommendations</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Section */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Chat with CineAI
              </CardTitle>
              <CardDescription>
                Tell me what kind of movies you&apos;re in the mood for!
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 overflow-hidden">
                <ChatInterface 
                  onPreferencesExtracted={(preferences) => {
                    console.log('Preferences learned:', preferences)
                    // Refresh recommendations when preferences are learned
                    setTimeout(() => {
                      window.location.reload()
                    }, 1000)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recommendations Section */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <Zap className="h-6 w-6 text-purple-500" />
                Recommended for You
              </h2>
              <p className="mt-1 text-gray-600">Based on popular movies and ratings</p>
            </div>
          </div>

          {state.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {state.recommendations.map(movie => (
                <MovieCard key={movie.id} movie={movie} onRate={handleRate} showRating={true} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Film className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No recommendations yet</h3>
                <p className="mb-4 text-gray-600">
                  Start by rating some movies or chatting with our AI!
                </p>
                <Button onClick={() => window.location.reload()}>Refresh Recommendations</Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Top Movies Section */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <TrendingUp className="h-6 w-6 text-blue-500" />
                Top Rated Movies
              </h2>
              <p className="mt-1 text-gray-600">Highest rated films in our database</p>
            </div>
          </div>

          {state.topMovies.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {state.topMovies.slice(0, 8).map(movie => (
                <MovieCard key={movie.id} movie={movie} onRate={handleRate} compact={true} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No movies found</h3>
                <p className="mb-4 text-gray-600">Make sure your database has movie data!</p>
                <Button onClick={() => window.location.reload()}>Refresh Movies</Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

// Simplified Movie Card Component
interface MovieCardProps {
  movie: Movie
  onRate: (movieId: string, interested: boolean, rating?: number) => void
  compact?: boolean
  showRating?: boolean
}

function MovieCard({ movie, onRate, compact = false, showRating = false }: MovieCardProps) {
  const [isLiked, setIsLiked] = useState<boolean | null>(null)
  const router = useRouter()

  const handleLike = () => {
    setIsLiked(true)
    onRate(movie.id, true)
  }

  const handleDislike = () => {
    setIsLiked(false)
    onRate(movie.id, false)
  }

  const handleCardClick = () => {
    router.push(`/dashboard/movie/${movie.id}`)
  }

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg cursor-pointer" onClick={handleCardClick}>
      <CardContent className="p-0">
        {/* Movie Poster */}
        <div className={`relative ${compact ? 'aspect-[3/4]' : 'aspect-[4/6]'}`}>
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="h-full w-full rounded-t-lg object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-t-lg bg-gradient-to-br from-gray-300 to-gray-500 group-hover:from-gray-400 group-hover:to-gray-600 transition-colors duration-300">
              <span className="text-xl font-bold text-white">{movie.title.charAt(0)}</span>
            </div>
          )}

          {/* Rating Badge */}
          {movie.rating && (
            <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              ⭐ {movie.rating.toFixed(1)}
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-t-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-white/90 text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                View Details
              </span>
            </div>
          </div>
        </div>

        {/* Movie Info */}
        <div className="p-4">
          <h3 className="mb-1 line-clamp-1 font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {movie.title}
          </h3>

          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <span>{movie.year}</span>
            {movie.runtime && (
              <>
                <span>•</span>
                <span>{movie.runtime}m</span>
              </>
            )}
          </div>

          {/* Genres */}
          <div className="mb-3 flex flex-wrap gap-1">
            {movie.genre?.slice(0, 2).map(genre => (
              <span
                key={genre}
                className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Plot (if not compact) */}
          {!compact && movie.plot && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-700">{movie.plot}</p>
          )}

          {/* Action Buttons */}
          {showRating && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant={isLiked === true ? 'default' : 'outline'}
                onClick={handleLike}
                className="flex-1"
              >
                👍 Like
              </Button>
              <Button
                size="sm"
                variant={isLiked === false ? 'destructive' : 'outline'}
                onClick={handleDislike}
                className="flex-1"
              >
                👎 Pass
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
