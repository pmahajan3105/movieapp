import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryFunctionContext,
} from '@tanstack/react-query'
import type { Movie } from '@/types'

interface MoviesResponse {
  data: Movie[]
  pagination: {
    currentPage: number
    totalPages: number
    hasMore: boolean
  }
  mem0Enhanced?: boolean
}

const fetchMovies = async ({
  pageParam = 1,
}: QueryFunctionContext<['movies', string | undefined], number>): Promise<MoviesResponse> => {
  const params = new URLSearchParams({
    smart: 'true',
    limit: '12',
    page: pageParam.toString(),
    realtime: 'true',
    database: 'tmdb',
  })

  const response = await fetch(`/api/movies?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch movies')
  }
  return response.json()
}

export const useMovies = (userId: string | undefined) => {
  return useInfiniteQuery<
    MoviesResponse,
    Error,
    InfiniteData<MoviesResponse>,
    ['movies', string | undefined],
    number
  >({
    queryKey: ['movies', userId],
    queryFn: fetchMovies,
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage?.pagination?.hasMore) {
        return lastPage.pagination.currentPage + 1
      }
      return undefined
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
