import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Film, CheckCircle, Circle, Calendar, Star, Trash2 } from 'lucide-react'
import Image from 'next/image'
import type { Movie, WatchlistItem } from '@/types'

interface WatchlistCardProps {
  item: WatchlistItem & { movies: Movie }
  onMovieClick: (movie: Movie) => void
  onRemove: (movieId: string) => void
  onMarkWatched: (movieId: string, watchlistId: string) => void
}

export function WatchlistCard({ item, onMovieClick, onRemove, onMarkWatched }: WatchlistCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative">
        <div className="aspect-[2/3] w-full overflow-hidden">
          {item.movies.poster_url ? (
            <div className="relative h-full w-full">
              <Image
                src={item.movies.poster_url}
                alt={item.movies.title}
                fill
                className="cursor-pointer object-cover transition-transform hover:scale-105"
                onClick={() => onMovieClick(item.movies)}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            </div>
          ) : (
            <div
              className="flex h-full w-full cursor-pointer items-center justify-center bg-gray-200"
              onClick={() => onMovieClick(item.movies)}
            >
              <Film className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {item.watched ? (
            <Badge className="bg-green-600">Watched</Badge>
          ) : (
            <Badge variant="outline" className="bg-white">
              To Watch
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold">{item.movies.title}</h3>

        <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
          {item.movies.year && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {item.movies.year}
            </div>
          )}
          {item.movies.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {item.movies.rating}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={item.watched ? 'outline' : 'default'}
            className="flex-1"
            onClick={() => {
              onMarkWatched(item.movies?.id || item.movie_id, item.id)
            }}
          >
            {item.watched ? (
              <>
                <Circle className="mr-1 h-3 w-3" />
                Mark Unwatched
              </>
            ) : (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Mark Watched
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onRemove(item.movies?.id || item.movie_id)}
            className="px-3"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
