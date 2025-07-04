import { useReducer, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import type { Movie, WatchlistItem } from '@/types'
import { logger } from '@/lib/logger'

// Types
interface WatchlistPageState {
  items: (WatchlistItem & { movies: Movie })[]
  isLoading: boolean
  error: string | null
  filter: 'all' | 'watched' | 'unwatched'
  sortBy: 'added_at' | 'title' | 'year'
  selectedMovie: Movie | null
  movieToMarkWatched: Movie | null
  watchlistItemToMarkWatched: string | null
  isMarkingWatched: boolean
}

type WatchlistAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ITEMS'; payload: (WatchlistItem & { movies: Movie })[] }
  | { type: 'SET_FILTER'; payload: 'all' | 'watched' | 'unwatched' }
  | { type: 'SET_SORT'; payload: 'added_at' | 'title' | 'year' }
  | { type: 'SET_SELECTED_MOVIE'; payload: Movie | null }
  | { type: 'SET_MARK_WATCHED_MOVIE'; payload: { movie: Movie | null; watchlistId: string | null } }
  | { type: 'SET_MARKING_WATCHED'; payload: boolean }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<WatchlistItem> } }

// Initial state
const initialState: WatchlistPageState = {
  items: [],
  isLoading: true,
  error: null,
  filter: 'unwatched', // Default to showing only unwatched movies
  sortBy: 'added_at',
  selectedMovie: null,
  movieToMarkWatched: null,
  watchlistItemToMarkWatched: null,
  isMarkingWatched: false,
}

// Reducer
function watchlistReducer(state: WatchlistPageState, action: WatchlistAction): WatchlistPageState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_ITEMS':
      return {
        ...state,
        items: Array.isArray(action.payload) ? action.payload : [],
        isLoading: false,
        error: null,
      }
    case 'SET_FILTER':
      return { ...state, filter: action.payload }
    case 'SET_SORT':
      return { ...state, sortBy: action.payload }
    case 'SET_SELECTED_MOVIE':
      return { ...state, selectedMovie: action.payload }
    case 'SET_MARK_WATCHED_MOVIE':
      return {
        ...state,
        movieToMarkWatched: action.payload.movie,
        watchlistItemToMarkWatched: action.payload.watchlistId,
      }
    case 'SET_MARKING_WATCHED':
      return { ...state, isMarkingWatched: action.payload }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: Array.isArray(state.items)
          ? state.items.filter(item => item.movies.id !== action.payload)
          : [],
      }
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: Array.isArray(state.items)
          ? state.items.map(item =>
              item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
            )
          : [],
      }
    default:
      return state
  }
}

export function useWatchlistPage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [state, dispatch] = useReducer(watchlistReducer, initialState)

  // Load watchlist data
  const loadWatchlist = useCallback(async () => {
    if (!user) return

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const response = await fetch('/api/watchlist')

      if (!response.ok) {
        if (response.status === 401) {
          dispatch({ type: 'SET_ERROR', payload: 'Unauthorized' })
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // Accept either [{...}, …] or { data: [...] }
        const items = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.data)
            ? data.data.data
            : []
        dispatch({ type: 'SET_ITEMS', payload: items })
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.error || 'Failed to load watchlist' })
      }
    } catch (err) {
      logger.error('Error loading watchlist:', { error: String(err) })
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'An error occurred',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [user])

  // Remove from watchlist
  const handleRemoveFromWatchlist = async (movieId: string) => {
    if (!user) return

    try {
      const url = new URL('/api/watchlist', window.location.origin)
      url.searchParams.append('movie_id', movieId)

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove from watchlist')
      }

      // Update local state
      dispatch({ type: 'REMOVE_ITEM', payload: movieId })

      showSuccess('Movie removed from watchlist successfully')
    } catch (err) {
      logger.error('Network error removing from watchlist:', { error: String(err) })
      showError('Failed to remove movie. Network error - please check your connection.')
    }
  }

  // Mark as watched
  const handleMarkWatched = async (movieId: string, watchlistId: string) => {
    const items = Array.isArray(state.items) ? state.items : []
    const movie = items.find(item => item.movies.id === movieId)?.movies
    if (movie) {
      dispatch({
        type: 'SET_MARK_WATCHED_MOVIE',
        payload: { movie, watchlistId },
      })
    }
  }

  // Confirm mark as watched
  const handleConfirmMarkWatched = async (rating?: number, notes?: string) => {
    if (!state.watchlistItemToMarkWatched) {
      logger.error('❌ No watchlist item to mark as watched')
      return
    }

    logger.info('🔄 Starting mark as watched process:', {
      watchlistId: state.watchlistItemToMarkWatched,
      rating,
      notes,
    })

    dispatch({ type: 'SET_MARKING_WATCHED', payload: true })

    try {
      const requestBody = {
        watched: true,
        rating,
        notes,
      }

      logger.info('📤 Sending PATCH request:', {
        url: `/api/watchlist/${state.watchlistItemToMarkWatched}`,
        body: requestBody,
      })

      const response = await fetch(`/api/watchlist/${state.watchlistItemToMarkWatched}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      logger.info('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update the local state
          dispatch({
            type: 'UPDATE_ITEM',
            payload: {
              id: state.watchlistItemToMarkWatched,
              updates: { watched: true, rating, notes, watched_at: new Date().toISOString() },
            },
          })

          dispatch({ type: 'SET_MARKING_WATCHED', payload: false })
          dispatch({ type: 'SET_MARK_WATCHED_MOVIE', payload: { movie: null, watchlistId: null } })

          // Keep the current filter instead of switching to 'watched'
          // This way if user is viewing 'unwatched', the movie disappears from view
          // If they want to see watched movies, they can switch the filter manually
          showSuccess('Movie marked as watched successfully')
        } else {
          logger.error('❌ Failed to mark as watched:', data)
          showError(`Failed to mark movie as watched: ${data.error || 'Unknown error'}`)
          dispatch({ type: 'SET_MARKING_WATCHED', payload: false })
          dispatch({ type: 'SET_MARK_WATCHED_MOVIE', payload: { movie: null, watchlistId: null } })
        }
      } else {
        let errorData
        try {
          errorData = await response.json()
        } catch (parseError) {
          logger.error('❌ Failed to parse error response:', { error: String(parseError) })
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        logger.error('❌ Failed to mark as watched:', { error: errorData })
        showError(`Failed to mark movie as watched: ${errorData.error || 'Unknown error'}`)
        dispatch({ type: 'SET_MARKING_WATCHED', payload: false })
        dispatch({ type: 'SET_MARK_WATCHED_MOVIE', payload: { movie: null, watchlistId: null } })
      }
    } catch (error) {
      logger.error('❌ Network error updating watch status:', { error: String(error as unknown) })
      showError('Failed to mark movie as watched. Network error - please check your connection.')
      dispatch({ type: 'SET_MARKING_WATCHED', payload: false })
      dispatch({ type: 'SET_MARK_WATCHED_MOVIE', payload: { movie: null, watchlistId: null } })
    }
  }

  // Get sorted and filtered items
  const getSortedItems = useCallback(() => {
    // Ensure state.items is an array
    const items = Array.isArray(state.items) ? state.items : []
    let filteredItems = [...items]

    // Apply filter
    if (state.filter === 'watched') {
      filteredItems = filteredItems.filter(item => item.watched)
    } else if (state.filter === 'unwatched') {
      filteredItems = filteredItems.filter(item => !item.watched)
    }

    // Apply sort
    filteredItems.sort((a, b) => {
      switch (state.sortBy) {
        case 'title':
          return a.movies.title.localeCompare(b.movies.title)
        case 'year':
          return (b.movies.year || 0) - (a.movies.year || 0)
        case 'added_at':
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      }
    })

    return filteredItems
  }, [state.items, state.filter, state.sortBy])

  // Calculate counts
  const items = Array.isArray(state.items) ? state.items : []
  const counts = {
    total: items.length,
    watched: items.filter(item => item.watched).length,
    unwatched: items.filter(item => !item.watched).length,
  }

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadWatchlist()
    } else {
      dispatch({ type: 'SET_LOADING', payload: false })
      dispatch({ type: 'SET_ERROR', payload: 'Please log in to view your watchlist' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadWatchlist, user])

  return {
    // State
    state,
    dispatch,
    sortedItems: getSortedItems(),
    unwatchedItems: items.filter(item => !item.watched), // Only unwatched movies
    counts,

    // Actions
    loadWatchlist,
    handleRemoveFromWatchlist,
    handleMarkWatched,
    handleConfirmMarkWatched,
  }
}
