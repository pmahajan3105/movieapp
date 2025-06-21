import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import type { Movie, WatchlistItem } from '@/types'

interface WatchlistResponse {
  success: boolean
  data: (WatchlistItem & { movies: Movie })[]
  error?: string
}

interface MarkWatchedRequest {
  watchlist_id: string
  watched: boolean
  rating?: number
  notes?: string
}

interface AddToWatchlistRequest {
  movie_id: string
  notes?: string
}

// Query keys for caching
export const watchlistKeys = {
  all: ['watchlist'] as const,
  lists: () => [...watchlistKeys.all, 'list'] as const,
  list: (filter?: string) => [...watchlistKeys.lists(), { filter }] as const,
}

export function useWatchlist(filter?: 'watched' | 'unwatched') {
  const { user } = useAuth()

  return useQuery({
    queryKey: watchlistKeys.list(filter),
    queryFn: async (): Promise<(WatchlistItem & { movies: Movie })[]> => {
      const url = filter ? `/api/watchlist?watched=${filter === 'watched'}` : '/api/watchlist'
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch watchlist: ${response.statusText}`)
      }

      const data: WatchlistResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch watchlist')
      }

      // Accept either [{...}, …] or { data: [...] }
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.data)
          ? data.data.data
          : []

      return items
    },
    enabled: !!user, // Only run query if user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: AddToWatchlistRequest) => {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add to watchlist')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch watchlist queries
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all })
    },
  })
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (movieId: string) => {
      const response = await fetch(`/api/watchlist?movie_id=${movieId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove from watchlist')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch watchlist queries
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all })
    },
  })
}

export function useMarkWatched() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: MarkWatchedRequest) => {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update watched status')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch watchlist queries
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all })
    },
  })
}
