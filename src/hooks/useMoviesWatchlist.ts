import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

// Simple interface for movies page watchlist needs
interface WatchlistItem {
  movie_id: string
}

interface WatchlistResponse {
  data: WatchlistItem[]
}

// Simple hook for movies page
export const useMoviesWatchlist = () => {
  const queryClient = useQueryClient()

  // Fetch watchlist IDs
  const { data: watchlistData, isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ['movies-watchlist'],
    queryFn: async () => {
      const response = await fetch('/api/watchlist')
      if (!response.ok) throw new Error('Failed to fetch watchlist')
      const data: WatchlistResponse = await response.json()
      return data.data || []
    },
  })

  const watchlistIds = new Set(watchlistData?.map(item => item.movie_id) || [])

  // Add to watchlist
  const { mutate: addToWatchlist, isPending: isAdding } = useMutation({
    mutationFn: async (movieId: string) => {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId }),
      })
      if (!response.ok) throw new Error('Failed to add to watchlist')
      return response.json()
    },
    onMutate: async movieId => {
      await queryClient.cancelQueries({ queryKey: ['movies-watchlist'] })
      const previousData = queryClient.getQueryData<WatchlistItem[]>(['movies-watchlist'])

      // Optimistically add
      queryClient.setQueryData<WatchlistItem[]>(['movies-watchlist'], old => [
        ...(old || []),
        { movie_id: movieId },
      ])

      return { previousData }
    },
    onSuccess: () => {
      toast.success('Added to watchlist')
    },
    onError: (err, movieId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['movies-watchlist'], context.previousData)
      }
      toast.error('Failed to add to watchlist')
    },
  })

  // Remove from watchlist
  const { mutate: removeFromWatchlist, isPending: isRemoving } = useMutation({
    mutationFn: async (movieId: string) => {
      const response = await fetch(`/api/watchlist?movie_id=${encodeURIComponent(movieId)}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to remove from watchlist')
      return response.json()
    },
    onMutate: async movieId => {
      await queryClient.cancelQueries({ queryKey: ['movies-watchlist'] })
      const previousData = queryClient.getQueryData<WatchlistItem[]>(['movies-watchlist'])

      // Optimistically remove
      queryClient.setQueryData<WatchlistItem[]>(['movies-watchlist'], old =>
        old ? old.filter(item => item.movie_id !== movieId) : []
      )

      return { previousData }
    },
    onSuccess: () => {
      toast.success('Removed from watchlist')
    },
    onError: (err, movieId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['movies-watchlist'], context.previousData)
      }
      toast.error('Failed to remove from watchlist')
    },
  })

  const toggleWatchlist = (movieId: string) => {
    if (watchlistIds.has(movieId)) {
      removeFromWatchlist(movieId)
    } else {
      addToWatchlist(movieId)
    }
  }

  return {
    watchlistIds,
    isLoading,
    toggleWatchlist,
    isMutating: isAdding || isRemoving,
  }
}
