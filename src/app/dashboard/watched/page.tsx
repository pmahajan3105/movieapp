'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CheckCircle,
  Calendar,
  Star,
  Film,
  Clock,
  TrendingUp,
  Filter,
  Search,
  Edit,
  Trash2,
  SortAsc,
  Eye,
  BarChart3
} from 'lucide-react'
import Image from 'next/image'
import type { Movie, WatchlistItem } from '@/types'
import { toast } from 'react-hot-toast'

interface WatchedMovie extends WatchlistItem {
  movies: Movie
}

interface ViewingStats {
  totalWatched: number
  thisMonth: number
  thisYear: number
  averageRating: number
  favoriteGenres: Array<{ genre: string; count: number }>
  recentWatches: number
}

export default function WatchedMoviesPage() {
  const { loading } = useAuth()
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [sortBy, setSortBy] = useState<'watched_at' | 'rating' | 'title' | 'year'>('watched_at')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRating, setEditingRating] = useState<number>(0)
  const [editingNotes, setEditingNotes] = useState('')

  useEffect(() => {
    if (!loading) {
      fetchWatchedMovies()
    }
  }, [loading])

  const fetchWatchedMovies = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/watchlist?watched=true')
      const data = await response.json()

      if (data.success && data.data) {
        const watched = data.data.filter((item: WatchedMovie) => item.watched)
        setWatchedMovies(watched)
      } else {
        throw new Error(data.error || 'Failed to fetch watched movies')
      }
    } catch (err) {
      console.error('Error fetching watched movies:', err)
      setError(err instanceof Error ? err.message : 'Failed to load watched movies')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie)
  }

  const handleEditRating = (item: WatchedMovie) => {
    setEditingId(item.id)
    setEditingRating(item.rating || 0)
    setEditingNotes(item.notes || '')
  }

  const handleSaveEdit = async (watchlistId: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlist_id: watchlistId,
          rating: editingRating || null,
          notes: editingNotes || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
                 // Update local state
         setWatchedMovies(prev => 
           prev.map(item => 
             item.id === watchlistId 
               ? { ...item, rating: editingRating || undefined, notes: editingNotes || undefined }
               : item
           )
         )
        setEditingId(null)
        toast.success('Rating updated successfully! 🌟')
      } else {
        throw new Error(data.error || 'Failed to update rating')
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      toast.error('Failed to update rating')
    }
  }

  const handleRemoveFromWatched = async (watchlistId: string) => {
    try {
      console.log('🔄 Moving movie back to watchlist:', { watchlistId })

      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlist_id: watchlistId,
          watched: false,
        }),
      })

      const data = await response.json()
      console.log('🔄 Move response:', { status: response.status, data })

      if (data.success) {
        setWatchedMovies(prev => prev.filter(item => item.id !== watchlistId))
        toast.success('Moved back to watchlist! 📝')
      } else {
        console.error('❌ Failed to move to watchlist:', data.error)
        if (response.status === 401) {
          toast.error('Please sign in again')
          window.location.href = '/auth/login'
        } else {
          toast.error(data.error || 'Failed to update status')
        }
      }
    } catch (error) {
      console.error('❌ Network error moving to watchlist:', error)
      toast.error('Network error: Failed to update status')
    }
  }

  const getViewingStats = (): ViewingStats => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const totalWatched = watchedMovies.length
    const thisMonthCount = watchedMovies.filter(item => 
      item.watched_at && new Date(item.watched_at) >= thisMonth
    ).length
    const thisYearCount = watchedMovies.filter(item => 
      item.watched_at && new Date(item.watched_at) >= thisYear
    ).length
    const recentWatches = watchedMovies.filter(item => 
      item.watched_at && new Date(item.watched_at) >= lastMonth
    ).length

    const ratedMovies = watchedMovies.filter(item => item.rating)
    const averageRating = ratedMovies.length > 0 
      ? ratedMovies.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedMovies.length
      : 0

    // Calculate favorite genres
    const genreCount: Record<string, number> = {}
    watchedMovies.forEach(item => {
      if (item.movies.genre) {
        item.movies.genre.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1
        })
      }
    })

    const favoriteGenres = Object.entries(genreCount)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalWatched,
      thisMonth: thisMonthCount,
      thisYear: thisYearCount,
      averageRating,
      favoriteGenres,
      recentWatches
    }
  }

  const getFilteredAndSortedMovies = () => {
    let filtered = watchedMovies

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.movies.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.movies.director?.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.movies.genre?.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply rating filter
    if (filterRating) {
      filtered = filtered.filter(item => item.rating === filterRating)
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'watched_at':
          return new Date(b.watched_at || '').getTime() - new Date(a.watched_at || '').getTime()
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'title':
          return a.movies.title.localeCompare(b.movies.title)
        case 'year':
          return (b.movies.year || 0) - (a.movies.year || 0)
        default:
          return 0
      }
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-base-100 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
          <p className="mt-4 text-center text-sm text-base-content/70">Loading your watched movies...</p>
        </div>
      </div>
    )
  }

  const stats = getViewingStats()
  const filteredMovies = getFilteredAndSortedMovies()

  return (
    <div className="min-h-screen bg-base-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-success" />
            Watched Movies
          </h1>
          <p className="mt-2 text-base-content/70">
            Your personal movie journal and viewing history
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Watched</p>
                  <p className="text-2xl font-bold text-green-800">{stats.totalWatched}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">This Month</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.thisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Avg Rating</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">This Year</p>
                  <p className="text-2xl font-bold text-purple-800">{stats.thisYear}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Favorite Genres */}
        {stats.favoriteGenres.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Your Favorite Genres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.favoriteGenres.map(({ genre, count }) => (
                  <div key={genre} className="badge badge-primary gap-2">
                    {genre}
                    <span className="badge badge-secondary badge-sm">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search watched movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-64"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="select select-bordered select-sm"
            >
              <option value="watched_at">Recently Watched</option>
              <option value="rating">Highest Rated</option>
              <option value="title">Title A-Z</option>
              <option value="year">Release Year</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
              className="select select-bordered select-sm"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
              <p className="text-base-content/70">Loading your watched movies...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="bg-error/10 border-error">
            <CardContent className="p-6 text-center">
              <p className="text-error font-medium mb-4">Failed to load watched movies</p>
              <p className="text-base-content/70 mb-4">{error}</p>
              <Button onClick={fetchWatchedMovies} className="btn btn-error btn-outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredMovies.length === 0 ? (
          <Card className="bg-warning/10 border-warning">
            <CardContent className="p-6 text-center">
              <Eye className="h-12 w-12 text-warning mx-auto mb-4" />
              <p className="text-warning font-medium mb-2">No watched movies yet</p>
              <p className="text-base-content/70 mb-4">
                {searchQuery || filterRating 
                  ? 'No movies match your current filters.' 
                  : 'Start watching movies from your watchlist and they\'ll appear here!'
                }
              </p>
              <Button 
                onClick={() => window.location.href = '/dashboard/watchlist'} 
                className="btn btn-primary"
              >
                View Watchlist
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMovies.map((item) => (
              <Card key={item.id} className="h-fit overflow-hidden hover:shadow-lg transition-shadow">
                {/* Movie Poster */}
                <div className="aspect-[2/3] w-full overflow-hidden relative">
                  {item.movies.poster_url ? (
                    <Image
                      src={item.movies.poster_url}
                      alt={item.movies.title}
                      fill
                      className="cursor-pointer object-cover transition-transform hover:scale-105"
                      onClick={() => handleMovieClick(item.movies)}
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full cursor-pointer items-center justify-center bg-gray-200 hover:bg-gray-300 transition-colors"
                      onClick={() => handleMovieClick(item.movies)}
                    >
                      <Film className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Rating overlay */}
                  {item.rating && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-bold">
                      {item.rating}★
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  {/* Movie Title */}
                  <h3
                    className="mb-2 line-clamp-2 cursor-pointer text-lg font-semibold hover:text-primary transition-colors"
                    onClick={() => handleMovieClick(item.movies)}
                  >
                    {item.movies.title}
                  </h3>

                  {/* Movie Meta */}
                  <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      {item.movies.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.movies.year}
                        </span>
                      )}
                      {item.movies.runtime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.movies.runtime}m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Watch Date */}
                  {item.watched_at && (
                    <p className="text-sm text-gray-500 mb-3">
                      Watched {new Date(item.watched_at).toLocaleDateString()}
                    </p>
                  )}

                  {/* Rating Section */}
                  {editingId === item.id ? (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setEditingRating(star)}
                            className={`text-lg ${
                              star <= editingRating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        placeholder="Add your thoughts..."
                        className="textarea textarea-bordered textarea-sm w-full"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      {item.rating ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= item.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRating(item)}
                            className="p-1"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRating(item)}
                          className="text-xs"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Rate Movie
                        </Button>
                      )}
                      
                                             {item.notes && (
                         <p className="text-sm text-gray-600 mt-2 italic">&ldquo;{item.notes}&rdquo;</p>
                       )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMovieClick(item.movies)}
                      className="flex-1"
                    >
                      <Film className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFromWatched(item.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Move back to watchlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Movie Details Modal */}
        {selectedMovie && (
          <MovieDetailsModal
            movie={selectedMovie}
            open={!!selectedMovie}
            onClose={() => setSelectedMovie(null)}
            onAddToWatchlist={async () => {}} // Not needed for watched movies
            onRemoveFromWatchlist={async () => {}} // Not needed for watched movies
            isInWatchlist={false}
          />
        )}
      </div>
    </div>
  )
} 