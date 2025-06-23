import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Film } from 'lucide-react'
import { useRouter } from 'next/navigation'

type FilterType = 'all' | 'watched' | 'unwatched'

interface WatchlistEmptyStateProps {
  filter: FilterType
}

export function WatchlistEmptyState({ filter }: WatchlistEmptyStateProps) {
  const router = useRouter()

  const getEmptyMessage = () => {
    switch (filter) {
      case 'watched':
        return {
          title: 'No watched movies yet',
          description: 'Movies you mark as watched will appear here.',
          showButton: false,
        }
      case 'unwatched':
        return {
          title: 'No movies to watch',
          description: 'Add some movies to your watchlist to see them here.',
          showButton: true,
        }
      default:
        return {
          title: 'No movies in your watchlist',
          description: 'Start adding movies to your watchlist from the recommendations!',
          showButton: true,
        }
    }
  }

  const { title, description, showButton } = getEmptyMessage()

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Film className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">{title}</h3>
        <p className="mb-4 text-gray-600">{description}</p>
        {showButton && <Button onClick={() => router.push('/dashboard')}>Discover Movies</Button>}
      </CardContent>
    </Card>
  )
}
