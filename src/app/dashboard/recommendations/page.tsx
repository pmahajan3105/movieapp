'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { RecommendationCard } from '@/components/movies/RecommendationCard'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  RefreshCw, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Lightbulb,
  Brain,
  Star,
  Zap
} from 'lucide-react'
import type { EnhancedRecommendation, Movie } from '@/types'
import { toast } from 'react-hot-toast'

export default function RecommendationsPage() {
  const { user, loading } = useAuth()
  const [recommendations, setRecommendations] = useState<EnhancedRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!loading) {
      fetchRecommendations()
      fetchWatchlistIds()
    }
  }, [loading])

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: 12,
          userId: user?.id
        }),
      })

      const data = await response.json()

      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations)
        console.log('🎯 Enhanced recommendations loaded:', data.recommendations.length)
      } else {
        throw new Error(data.error || 'Failed to fetch recommendations')
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWatchlistIds = async () => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/watchlist')
      const data = await response.json()
      
      if (data.success && data.data) {
        const ids = new Set<string>(data.data.map((item: { movie_id: string }) => item.movie_id))
        setWatchlistIds(ids)
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRecommendations()
    setRefreshing(false)
    toast.success('Fresh recommendations loaded! 🎬')
  }

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie)
  }

  const handleAddToWatchlist = async (movieId: string) => {
    if (!user?.id) {
      toast.error('Please sign in to add movies to your watchlist')
      return
    }

    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movieId }),
      })

      const data = await response.json()

      if (data.success) {
        setWatchlistIds(prev => new Set(prev).add(movieId))
        toast.success('Added to your watchlist! 📝')
      } else {
        throw new Error(data.error || 'Failed to add to watchlist')
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      toast.error('Failed to add to watchlist')
    }
  }

  const getStatsData = () => {
    const confidenceSum = recommendations.reduce((sum, rec) => sum + rec.confidence, 0)
    const avgConfidence = recommendations.length > 0 ? confidenceSum / recommendations.length : 0
    
    const highConfidence = recommendations.filter(rec => rec.confidence >= 0.8).length
    const genreMatches = recommendations.filter(rec => 
      rec.explanation?.preferenceMatches?.genres && 
      rec.explanation.preferenceMatches.genres.length > 0
    ).length
    
    return {
      avgConfidence: Math.round(avgConfidence * 100),
      highConfidence,
      genreMatches,
      totalRecs: recommendations.length
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-base-100 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
          <p className="mt-4 text-center text-sm text-base-content/70">Loading your personalized recommendations...</p>
        </div>
      </div>
    )
  }

  const stats = getStatsData()

  return (
    <div className="min-h-screen bg-base-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                AI-Powered Recommendations
              </h1>
              <p className="mt-2 text-base-content/70">
                Personalized movie suggestions with detailed explanations
              </p>
            </div>
            
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-primary"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {recommendations.length > 0 && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Avg Match Score</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.avgConfidence}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Star className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">High Confidence</p>
                    <p className="text-2xl font-bold text-green-800">{stats.highConfidence}/{stats.totalRecs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Genre Matches</p>
                    <p className="text-2xl font-bold text-purple-800">{stats.genreMatches}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-600 font-medium">AI Powered</p>
                    <p className="text-2xl font-bold text-orange-800">
                      <Zap className="h-6 w-6 inline" />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
              <p className="text-base-content/70">Generating your personalized recommendations...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="bg-error/10 border-error">
            <CardContent className="p-6 text-center">
              <p className="text-error font-medium mb-4">Failed to load recommendations</p>
              <p className="text-base-content/70 mb-4">{error}</p>
              <Button onClick={fetchRecommendations} className="btn btn-error btn-outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : recommendations.length === 0 ? (
          <Card className="bg-warning/10 border-warning">
            <CardContent className="p-6 text-center">
              <Sparkles className="h-12 w-12 text-warning mx-auto mb-4" />
              <p className="text-warning font-medium mb-2">No recommendations yet</p>
              <p className="text-base-content/70 mb-4">
                Start by chatting with our AI to learn your movie preferences!
              </p>
              <Button 
                onClick={() => window.location.href = '/dashboard'} 
                className="btn btn-primary"
              >
                Chat with AI
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Introduction Card */}
            <Card className="mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Why These Recommendations?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base-content/80">
                  Each recommendation below includes detailed explanations showing why it matches your taste. 
                  Look for <strong>preference matches</strong>, <strong>quality signals</strong>, and 
                  <strong>contextual fit</strong> to understand our AI's reasoning.
                </p>
              </CardContent>
            </Card>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.movie.id}
                  recommendation={recommendation}
                  onMovieClick={handleMovieClick}
                  onAddToWatchlist={handleAddToWatchlist}
                  isInWatchlist={watchlistIds.has(recommendation.movie.id)}
                  showExplanation={true}
                  className="h-fit"
                />
              ))}
            </div>
          </>
        )}

        {/* Movie Details Modal */}
        {selectedMovie && (
          <MovieDetailsModal
            movie={selectedMovie}
            open={!!selectedMovie}
            onClose={() => setSelectedMovie(null)}
            onAddToWatchlist={handleAddToWatchlist}
            onRemoveFromWatchlist={async () => {}} // TODO: Implement if needed
            isInWatchlist={watchlistIds.has(selectedMovie.id)}
          />
        )}
      </div>
    </div>
  )
} 