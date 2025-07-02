import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface InsightResponse {
  success: boolean
  insights: {
    top_genres?: Array<{ genre_id: string; count: number }>
    total_interactions?: number
  } | null
}

export const BehavioralInsightsPanel: React.FC = () => {
  const [windowSize, setWindowSize] = React.useState<'7d' | '30d' | '90d'>('30d')

  const { data, isLoading } = useQuery<InsightResponse>({
    queryKey: ['preference-insights', windowSize],
    queryFn: async () => {
      const res = await fetch(`/api/user/preference-insights?window=${windowSize}`)
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="card bg-base-200 p-4">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    )
  }

  if (!data?.insights?.top_genres) return null

  const top = data.insights.top_genres.slice(0, 5)

  return (
    <div className="card bg-base-200 shadow-lg" data-testid="behavioral-insights">
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <h3 className="card-title text-primary">Your Top Genres</h3>
          <div className="join join-sm">
            {(['7d','30d','90d'] as const).map(w => (
              <button
                key={w}
                className={cn('btn btn-xs join-item', w===windowSize ? 'btn-primary text-base-100':'btn-ghost')}
                onClick={() => setWindowSize(w)}
              >{w}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {top.map(g => (
            <Badge key={g.genre_id} color="primary" variant="soft">
              {genreName(g.genre_id)} <span className="opacity-60 ml-1">×{g.count}</span>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

// Simple mapping; real map could come from TMDB constants
function genreName(id: string): string {
  const map: Record<string, string> = {
    '28': 'Action',
    '12': 'Adventure',
    '16': 'Animation',
    '35': 'Comedy',
    '80': 'Crime',
    '18': 'Drama',
    '10749': 'Romance',
    '27': 'Horror',
    '14': 'Fantasy',
    '99': 'Documentary',
  }
  return map[id] || 'Genre ' + id
} 