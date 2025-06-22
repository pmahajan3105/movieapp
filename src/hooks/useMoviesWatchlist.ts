import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

// Simple interface for movies page watchlist needs
interface WatchlistItem {
  movie_id: string
  id?: string
  added_at?: string
  watched?: boolean
  watched_at?: string | null
  rating?: number | null
  notes?: string | null
}

// Enhanced hook for all watchlist operations across the app
export const useMoviesWatchlist = () => {
  const queryClient = useQueryClient()
  const { user, isSessionValid, refreshUser, signOut } = useAuth()
  const router = useRouter()

  // Fetch watchlist IDs
  const { data: watchlistData, isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ['movies-watchlist'],
    queryFn: async () => {
      // Check if session is valid before making request
      if (!isSessionValid) {
        logger.debug('Session invalid, attempting to refresh')
        await refreshUser()
      }

      const response = await fetch('/api/watchlist')

      if (!response.ok) {
        if (response.status === 401) {
          logger.debug('Received 401, refreshing session')
          await refreshUser()

          // Retry the request after refresh
          const retryResponse = await fetch('/api/watchlist')
          if (!retryResponse.ok) {
            if (retryResponse.status === 401) {
              // Session is truly invalid, sign out and redirect
              logger.warn('Session invalid after retry, signing out')
              await signOut()
              router.push('/auth/login')
              throw new Error('Session expired. Please sign in again.')
            }
            throw new Error('Failed to fetch watchlist after retry')
          }

          const retryData = await retryResponse.json()
          const retryList = Array.isArray(retryData?.data)
            ? retryData.data
            : Array.isArray(retryData?.data?.data)
              ? retryData.data.data
              : []
          return retryList
        }
        throw new Error('Failed to fetch watchlist')
      }

      const data = await response.json()
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.data)
          ? data.data.data
          : []
      return list
    },
    enabled: !!user, // Only fetch if user is logged in
    retry: (failureCount, error) => {
      // Don't retry auth errors more than once
      if (error.message.includes('sign in')) {
        return failureCount < 1
      }
      return failureCount < 3
    },
  })

  const watchlistIds = new Set(watchlistData?.map(item => item.movie_id) || [])

  // Add to watchlist
  const { mutate: addToWatchlist, isPending: isAdding } = useMutation({
    mutationFn: async (movieId: string) => {
      if (!user) {
        throw new Error('Please sign in to add movies to your watchlist')
      }

      if (!isSessionValid) {
        logger.debug('Session invalid, refreshing before add')
        await refreshUser()
      }

      logger.info('Adding movie to watchlist', {
        movieId,
        userId: user.id,
        userEmail: user.email,
        sessionValid: isSessionValid,
      })

      const requestBody = { movie_id: movieId }
      logger.debug('Watchlist request body', requestBody)

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      logger.debug('Watchlist API response', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      })

      // Handle 401 with retry
      if (response.status === 401) {
        logger.debug('Received 401 on add; refreshing session and retrying')
        await refreshUser()

        // Retry the request
        const retryResponse = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (retryResponse.status === 401) {
          // Session is truly invalid, sign out and redirect
          logger.warn('Session invalid after retry, signing out')
          await signOut()
          router.push('/auth/login')
          throw new Error('Session expired. Please sign in again.')
        }

        if (!retryResponse.ok) {
          const retryData = await retryResponse.json().catch(() => ({}))
          throw new Error(
            retryData?.error || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
          )
        }

        const retryData = await retryResponse.json()
        if (!retryData.success) {
          throw new Error(retryData.error || 'Failed to add to watchlist')
        }

        return retryData
      }

      let data
      try {
        data = await response.json()
        logger.debug('Watchlist API data', data)
      } catch (jsonError) {
        logger.error('Failed to parse watchlist response as JSON', {
          error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        })
        const responseText = await response.text()
        logger.debug('Raw watchlist response text', { responseText })
        throw new Error(`HTTP ${response.status}: Failed to parse response`)
      }

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to add to watchlist')
      }

      return data
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
      toast.success('Added to watchlist!')
    },
    onError: (error, movieId, context) => {
      logger.error('Add to watchlist mutation failed', {
        error: error instanceof Error ? error.message : String(error),
      })

      if (context?.previousData) {
        queryClient.setQueryData(['movies-watchlist'], context.previousData)
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to add to watchlist'
      toast.error(errorMessage)
    },
  })

  // Remove from watchlist
  const { mutate: removeFromWatchlist, isPending: isRemoving } = useMutation({
    mutationFn: async (movieId: string) => {
      if (!user) {
        throw new Error('Please sign in to manage your watchlist')
      }

      if (!isSessionValid) {
        logger.debug('Session invalid, refreshing before remove')
        await refreshUser()
      }

      const response = await fetch(`/api/watchlist?movie_id=${encodeURIComponent(movieId)}`, {
        method: 'DELETE',
      })

      // Handle 401 with retry
      if (response.status === 401) {
        logger.debug('Received 401 on remove; refreshing session and retrying')
        await refreshUser()

        const retryResponse = await fetch(
          `/api/watchlist?movie_id=${encodeURIComponent(movieId)}`,
          {
            method: 'DELETE',
          }
        )

        if (retryResponse.status === 401) {
          // Session is truly invalid, sign out and redirect
          logger.warn('Session invalid after retry, signing out')
          await signOut()
          router.push('/auth/login')
          throw new Error('Session expired. Please sign in again.')
        }

        if (!retryResponse.ok) {
          const retryData = await retryResponse.json().catch(() => ({}))
          throw new Error(
            retryData?.error || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
          )
        }

        const retryData = await retryResponse.json()
        if (!retryData.success) {
          throw new Error(retryData.error || 'Failed to remove from watchlist')
        }

        return retryData
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove from watchlist')
      }

      return data
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
    onError: (error, movieId, context) => {
      logger.error('Remove from watchlist mutation failed', {
        error: error instanceof Error ? error.message : String(error),
      })

      if (context?.previousData) {
        queryClient.setQueryData(['movies-watchlist'], context.previousData)
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to remove from watchlist'
      toast.error(errorMessage)
    },
  })

  // Toggle watchlist (add if not in watchlist, remove if in watchlist)
  const toggleWatchlist = (movieId: string) => {
    if (!user) {
      toast.error('Please sign in to manage your watchlist')
      return
    }

    if (watchlistIds.has(movieId)) {
      removeFromWatchlist(movieId)
    } else {
      addToWatchlist(movieId)
    }
  }

  // Check if a movie is in watchlist
  const isInWatchlist = (movieId: string) => watchlistIds.has(movieId)

  return {
    // Data
    watchlistIds,
    watchlistData,
    isLoading,

    // Actions
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,

    // Utilities
    isInWatchlist,
    isMutating: isAdding || isRemoving,
    isAdding,
    isRemoving,

    // User state
    isAuthenticated: !!user && isSessionValid,
    sessionValid: isSessionValid,
  }
}
