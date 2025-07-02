import { useQuery } from '@tanstack/react-query'
import { RecommendationExplanation } from '@/types/explanation'

export const useMovieExplanation = (movieId: string, enabled = false) => {
  return useQuery<{ explanation: RecommendationExplanation }, Error>({
    queryKey: ['explanation', movieId],
    queryFn: async () => {
      const res = await fetch('/api/movies/explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      })
      if (!res.ok) throw new Error('Failed to fetch explanation')
      return res.json()
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 24, // cache 24h
  })
} 