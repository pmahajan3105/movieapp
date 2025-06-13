import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Film, CheckCircle, Circle } from 'lucide-react'

interface WatchlistStatsProps {
  totalCount: number
  watchedCount: number
  unwatchedCount: number
}

export function WatchlistStats({ totalCount, watchedCount, unwatchedCount }: WatchlistStatsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Movies</CardTitle>
          <Film className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
          <p className="text-muted-foreground text-xs">In your watchlist</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Watched</CardTitle>
          <CheckCircle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{watchedCount}</div>
          <p className="text-muted-foreground text-xs">Movies completed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">To Watch</CardTitle>
          <Circle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{unwatchedCount}</div>
          <p className="text-muted-foreground text-xs">Movies pending</p>
        </CardContent>
      </Card>
    </div>
  )
}
