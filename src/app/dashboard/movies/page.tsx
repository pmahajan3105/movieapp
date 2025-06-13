'use client'

import React, { useState, useMemo, memo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Film, Zap, ChevronDown, Brain, Sparkles, Target, RefreshCw } from 'lucide-react'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Movie, RecommendationExplanation } from '@/types'
import Image from 'next/image'
import { useMoviesWatchlist } from '@/hooks/useMoviesWatchlist'
import { useMovies } from '@/hooks/useMovies'
import { useAIRecommendations } from '@/hooks/useAIRecommendations'
import { useQueryClient } from '@tanstack/react-query'

// Optimized Movie Card with AI Explanation
const OptimizedMovieCard = memo(
  ({
    movie,
    aiExplanation,
    onMovieClick,
    onAddToWatchlist,
    isInWatchlist,
  }: {
    movie: Movie
    aiExplanation?: string | RecommendationExplanation
    onMovieClick: (movie: Movie) => void
    onAddToWatchlist: (movieId: string) => void
    isInWatchlist: boolean
  }) => {
    const handleImageError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      e.currentTarget.src = '/placeholder-movie.jpg'
    }, [])

    return (
      <Card className="group hover:border-primary/30 relative h-full overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
        <div className="aspect-[2/3] overflow-hidden">
          <Image
            src={movie.poster_url || '/placeholder-movie.jpg'}
            alt={movie.title}
            width={300}
            height={450}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
            loading="lazy"
          />
        </div>

        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {movie.year || 'N/A'}
            </Badge>
            {movie.rating && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-yellow-500">★</span>
                <span className="text-xs text-gray-600">{movie.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <h3
            className="hover:text-primary mb-2 line-clamp-2 cursor-pointer text-sm font-semibold"
            onClick={() => onMovieClick(movie)}
          >
            {movie.title}
          </h3>

          {movie.genre && movie.genre.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {movie.genre.slice(0, 2).map(genre => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {movie.genre.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{movie.genre.length - 2}
                </Badge>
              )}
            </div>
          )}

          {aiExplanation && (
            <div className="from-primary/10 to-secondary/10 border-primary/20 mb-3 rounded-lg border bg-gradient-to-r p-3">
              <div className="mb-1 flex items-center gap-1">
                <Brain className="text-primary h-3 w-3" />
                <span className="text-primary text-xs font-medium">Why recommended:</span>
              </div>
              {typeof aiExplanation === 'string' ? (
                <p className="line-clamp-3 text-xs text-gray-700">{aiExplanation}</p>
              ) : (
                <div className="space-y-1">
                  {aiExplanation.primaryReasons && aiExplanation.primaryReasons.length > 0 && (
                    <p className="line-clamp-2 text-xs text-gray-700">
                      <span className="font-medium">Main reasons:</span>{' '}
                      {aiExplanation.primaryReasons.join(', ')}
                    </p>
                  )}
                  {aiExplanation.preferenceMatches && (
                    <div className="text-xs text-gray-600">
                      {aiExplanation.preferenceMatches.genres &&
                        aiExplanation.preferenceMatches.genres.length > 0 && (
                          <p className="line-clamp-1">
                            <span className="font-medium">Matches genres:</span>{' '}
                            {aiExplanation.preferenceMatches.genres.join(', ')}
                          </p>
                        )}
                      {aiExplanation.preferenceMatches.directors &&
                        aiExplanation.preferenceMatches.directors.length > 0 && (
                          <p className="line-clamp-1">
                            <span className="font-medium">Matches directors:</span>{' '}
                            {aiExplanation.preferenceMatches.directors.join(', ')}
                          </p>
                        )}
                    </div>
                  )}
                  {aiExplanation.contextMatch && (
                    <div className="text-xs text-gray-600">
                      {aiExplanation.contextMatch.mood && (
                        <p className="line-clamp-1">
                          <span className="font-medium">Mood:</span>{' '}
                          {aiExplanation.contextMatch.mood}
                        </p>
                      )}
                      {aiExplanation.contextMatch.runtime && (
                        <p className="line-clamp-1">
                          <span className="font-medium">Runtime:</span>{' '}
                          {aiExplanation.contextMatch.runtime}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMovieClick(movie)}
              className="flex-1 text-xs"
            >
              View Details
            </Button>
            <Button
              variant={isInWatchlist ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAddToWatchlist(movie.id)}
              className="text-xs"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
)
OptimizedMovieCard.displayName = 'OptimizedMovieCard'

// Main Page Component
export default function UnifiedMoviesPage() {
  const { user, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [showingRecommendations, setShowingRecommendations] = useState(false)

  // Use our custom hooks
  const { watchlistIds, toggleWatchlist } = useMoviesWatchlist()

  const {
    data: moviesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: moviesLoading,
    isRefetching: isRefetchingMovies,
  } = useMovies(user?.id)

  const {
    data: aiRecommendations,
    isLoading: recsLoading,
    isRefetching: isRefetchingRecs,
  } = useAIRecommendations(user?.id, { enabled: showingRecommendations })

  // Derived state
  const movies = useMemo(() => moviesData?.pages.flatMap(page => page.data) ?? [], [moviesData])
  const userHasPreferences = useMemo(
    () => moviesData?.pages[0]?.mem0Enhanced ?? false,
    [moviesData]
  )

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['movies', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['aiRecommendations', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['movies-watchlist'] })
  }

  // Loading states
  const isRefreshing = isRefetchingMovies || isRefetchingRecs
  const isLoading =
    authLoading ||
    (showingRecommendations
      ? recsLoading && !aiRecommendations
      : moviesLoading && movies.length === 0)

  if (authLoading) {
    return (
      <div className="bg-base-100 flex min-h-screen flex-col justify-center py-12">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-base-content/70">Loading your personalized movies...</p>
        </div>
      </div>
    )
  }

  const displayedMovies = showingRecommendations
    ? (aiRecommendations || []).map(r => ({ ...r.movie, aiExplanation: r.explanation }))
    : movies

  return (
    <div className="bg-base-100 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-base-content flex items-center gap-2 text-3xl font-bold">
                <Film className="text-primary h-8 w-8" />
                Smart Movies
                {showingRecommendations && (
                  <Badge className="from-primary to-secondary bg-gradient-to-r text-white">
                    <Brain className="mr-1 h-3 w-3" />
                    AI Powered
                  </Badge>
                )}
              </h1>
              <p className="text-base-content/70 mt-1">
                {showingRecommendations
                  ? 'Personalized recommendations with detailed explanations'
                  : 'Discover movies tailored to your preferences'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showingRecommendations ? 'default' : 'outline'}
                onClick={() => setShowingRecommendations(prev => !prev)}
                disabled={recsLoading}
                className="flex items-center gap-2"
              >
                {recsLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    {showingRecommendations ? (
                      <Target className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {showingRecommendations ? 'AI Picks' : 'Get AI Recommendations'}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Status Info */}
          {(displayedMovies.length > 0 || !isLoading) && (
            <div className="text-base-content/70 flex items-center justify-between text-sm">
              <span>
                {showingRecommendations
                  ? `Showing ${aiRecommendations?.length || 0} AI recommendations`
                  : `Showing ${movies.length} movies`}
              </span>
              {userHasPreferences && !showingRecommendations && (
                <Badge variant="outline" className="text-xs">
                  <Brain className="mr-1 h-3 w-3" />
                  Personalized
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Movies Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={`loading-skeleton-${i}`} className="h-96 animate-pulse">
                <div className="aspect-[2/3] bg-gray-200"></div>
                <CardContent className="p-4">
                  <div className="mb-2 h-4 rounded bg-gray-200"></div>
                  <div className="h-3 w-2/3 rounded bg-gray-200"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayedMovies && displayedMovies.length > 0 ? (
          <>
            {/* AI Recommendations Introduction */}
            {showingRecommendations && (
              <Card className="from-primary/10 to-secondary/10 border-primary/20 mb-8 bg-gradient-to-r">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="text-primary h-5 w-5" />
                    Why These Recommendations?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base-content/80">
                    Each recommendation below includes detailed explanations showing why it matches
                    your taste. Look for <strong>preference matches</strong>,{' '}
                    <strong>quality signals</strong>, and
                    <strong>contextual fit</strong> to understand our AI&apos;s reasoning.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {displayedMovies.map((movie: any, index: number) => (
                <OptimizedMovieCard
                  key={`${showingRecommendations ? 'ai' : 'movie'}-${movie.id}-${index}`}
                  movie={movie}
                  aiExplanation={movie.aiExplanation}
                  onMovieClick={setSelectedMovie}
                  onAddToWatchlist={toggleWatchlist}
                  isInWatchlist={watchlistIds.has(movie.id)}
                />
              ))}
            </div>

            {/* Load More Button (only for regular movies) */}
            {!showingRecommendations && hasNextPage && (
              <div className="mt-12 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2"
                >
                  {isFetchingNextPage ? (
                    <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Load More Movies
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="text-base-content mb-2 text-lg font-medium">
                {showingRecommendations ? 'No AI recommendations yet' : 'No movies found'}
              </h3>
              <p className="text-base-content/70 mb-4">
                {showingRecommendations
                  ? 'Chat with CineAI to build your preferences and get personalized recommendations!'
                  : userHasPreferences
                    ? 'No movies match your preferences. Try chatting with CineAI to discover new tastes!'
                    : 'Check back later for more movie recommendations!'}
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={handleRefresh}>Refresh</Button>
                <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
                  Chat with CineAI
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Movie Details Modal */}
        {selectedMovie && (
          <MovieDetailsModal
            movie={selectedMovie}
            open={!!selectedMovie}
            onClose={() => setSelectedMovie(null)}
            onAddToWatchlist={async (movieId: string) => {
              toggleWatchlist(movieId)
            }}
            onRemoveFromWatchlist={async (movieId: string) => {
              toggleWatchlist(movieId)
            }}
            isInWatchlist={watchlistIds.has(selectedMovie.id)}
          />
        )}
      </div>
    </div>
  )
}
