'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { MarkWatchedModal } from '@/components/movies/MarkWatchedModal'
import { WatchlistCard } from '@/components/watchlist/WatchlistCard'
import { useWatchlistPage } from '@/hooks/useWatchlistPage'
import type { Movie } from '@/types'

export default function WatchlistPage() {
  const router = useRouter()
  const {
    state,
    dispatch,
    unwatchedItems, // Only get unwatched items
    loadWatchlist,
    handleRemoveFromWatchlist,
    handleMarkWatched,
    handleConfirmMarkWatched,
  } = useWatchlistPage()

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading your watchlist...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <h2 className="mt-4 text-center text-lg font-medium text-gray-900">
            Failed to load watchlist
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {state.error === 'Unauthorized'
              ? 'Please sign in to view your watchlist'
              : 'There was a problem loading your watchlist. Please try again.'}
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <Button onClick={() => loadWatchlist()}>Try Again</Button>
            {state.error === 'Unauthorized' && (
              <Button variant="outline" onClick={() => router.push('/auth/login')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">My Watchlist 🎬</h1>
          <p className="text-gray-600">Movies you want to watch ({unwatchedItems.length} movies)</p>
        </div>

        {/* Movies Grid or Empty State */}
        {unwatchedItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unwatchedItems.map(item => (
              <WatchlistCard
                key={item.id}
                item={item}
                onMovieClick={(movie: Movie) =>
                  dispatch({ type: 'SET_SELECTED_MOVIE', payload: movie })
                }
                onRemove={handleRemoveFromWatchlist}
                onMarkWatched={handleMarkWatched}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-24 w-24 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6v11a1 1 0 102 0V6a1 1 0 10-2 0zm4 0v11a1 1 0 102 0V6a1 1 0 10-2 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No movies in your watchlist</h3>
            <p className="mb-6 text-gray-600">Start adding movies you want to watch!</p>
            <Button onClick={() => router.push('/dashboard/movies')}>Discover Movies</Button>
          </div>
        )}

        {/* Movie Details Modal */}
        <MovieDetailsModal
          movie={state.selectedMovie}
          open={!!state.selectedMovie}
          onClose={() => dispatch({ type: 'SET_SELECTED_MOVIE', payload: null })}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={true}
        />

        {/* Mark as Watched Modal */}
        <MarkWatchedModal
          movie={state.movieToMarkWatched}
          open={!!state.movieToMarkWatched}
          onClose={() =>
            dispatch({
              type: 'SET_MARK_WATCHED_MOVIE',
              payload: { movie: null, watchlistId: null },
            })
          }
          onConfirm={handleConfirmMarkWatched}
          isLoading={state.isMarkingWatched}
        />
      </div>
    </div>
  )
}
