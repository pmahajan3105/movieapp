'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Film, Zap, TrendingUp, MessageCircle } from 'lucide-react'
import { ChatBar } from '@/components/chat'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Movie } from '@/types'

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
    isLoading: true
  })
  const [isChatLoading, setIsChatLoading] = useState(false)

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
          isLoading: false
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
          user_id: user?.id || 'anonymous'
        })
      })
      
      if (response.ok) {
        console.log('Rating saved successfully')
        // Optionally refresh recommendations
      }
    } catch (error) {
      console.error('Error saving rating:', error)
    }
  }

  const handleChatMessage = async (message: string) => {
    setIsChatLoading(true)
    console.log('Chat message:', message)
    // TODO: Implement AI chat API call
    
    // Simulate API delay for now
    setTimeout(() => {
      setIsChatLoading(false)
    }, 2000)
  }

  if (loading || state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 🎬
          </h1>
          <p className="text-gray-600">
            Discover your next favorite movie with AI-powered recommendations
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.recommendations.length}</div>
              <p className="text-xs text-muted-foreground">
                Personalized picks for you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Movies</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.topMovies.length}</div>
              <p className="text-xs text-muted-foreground">
                Highest rated films
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-xs text-muted-foreground">
                Ask for movie recommendations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Section */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Chat with CineAI
              </CardTitle>
              <CardDescription>
                Tell me what kind of movies you&apos;re in the mood for!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChatBar
                onSendMessage={handleChatMessage}
                isLoading={isChatLoading}
                placeholder="What kind of movie are you looking for today?"
              />
            </CardContent>
          </Card>
        </section>

        {/* Recommendations Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-500" />
                Recommended for You
              </h2>
              <p className="text-gray-600 mt-1">
                Based on popular movies and ratings
              </p>
            </div>
          </div>

          {state.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.recommendations.map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onRate={handleRate}
                  showRating={true}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
                <p className="text-gray-600 mb-4">Start by rating some movies or chatting with our AI!</p>
                <Button onClick={() => window.location.reload()}>
                  Refresh Recommendations
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Top Movies Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                Top Rated Movies
              </h2>
              <p className="text-gray-600 mt-1">
                Highest rated films in our database
              </p>
            </div>
          </div>

          {state.topMovies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {state.topMovies.slice(0, 8).map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onRate={handleRate}
                  compact={true}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No movies found</h3>
                <p className="text-gray-600 mb-4">Make sure your database has movie data!</p>
                <Button onClick={() => window.location.reload()}>
                  Refresh Movies
                </Button>
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

  const handleLike = () => {
    setIsLiked(true)
    onRate(movie.id, true)
  }

  const handleDislike = () => {
    setIsLiked(false)
    onRate(movie.id, false)
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0">
        {/* Movie Poster */}
        <div className={`relative ${compact ? 'aspect-[3/4]' : 'aspect-[4/6]'}`}>
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center rounded-t-lg">
              <span className="text-white text-xl font-bold">
                {movie.title.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Rating Badge */}
          {movie.rating && (
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              ⭐ {movie.rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Movie Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
            {movie.title}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>{movie.year}</span>
            {movie.runtime && (
              <>
                <span>•</span>
                <span>{movie.runtime}m</span>
              </>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-1 mb-3">
            {movie.genre?.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Plot (if not compact) */}
          {!compact && movie.plot && (
            <p className="text-gray-700 text-sm mb-3 line-clamp-2">
              {movie.plot}
            </p>
          )}

          {/* Action Buttons */}
          {showRating && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isLiked === true ? "default" : "outline"}
                onClick={handleLike}
                className="flex-1"
              >
                👍 Like
              </Button>
              <Button
                size="sm"
                variant={isLiked === false ? "destructive" : "outline"}
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