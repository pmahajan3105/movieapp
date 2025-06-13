import { useQuery } from '@tanstack/react-query'
import type { EnhancedRecommendation } from '@/types'

const fetchAIRecommendations = async (userId: string): Promise<EnhancedRecommendation[]> => {
  const response = await fetch('/api/ai/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: userId,
      sessionId: `movies-page-${Date.now()}`,
      message:
        'I want personalized movie recommendations based on my preferences and viewing history',
      count: 12,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || 'Failed to fetch AI recommendations')
  }

  const data = await response.json()
  return data.recommendations || []
}

export const useAIRecommendations = (userId: string | undefined, options: { enabled: boolean }) => {
  return useQuery<EnhancedRecommendation[], Error>({
    queryKey: ['aiRecommendations', userId],
    queryFn: () => fetchAIRecommendations(userId!),
    enabled: !!userId && options.enabled,
    staleTime: 1000 * 60 * 10, // 10 minute stale time for AI recs
  })
}
