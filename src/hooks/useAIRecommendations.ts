import { useQuery } from '@tanstack/react-query'
import type { EnhancedRecommendation } from '@/types'

const fetchAIRecommendations = async (userId: string): Promise<EnhancedRecommendation[]> => {
  console.log('🔍 Fetching AI recommendations for user:', userId)

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

  console.log('📡 AI recommendations response status:', response.status)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('❌ AI recommendations error:', errorData)
    throw new Error(errorData.error || 'Failed to fetch AI recommendations')
  }

  const data = await response.json()
  console.log('✅ AI recommendations data:', data)

  // The API returns { recommendations: [...] } structure
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
