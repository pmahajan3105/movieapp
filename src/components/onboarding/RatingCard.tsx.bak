import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThumbsDown, Meh, ThumbsUp, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Movie } from '@/types'

interface RatingCardProps {
  movie: Movie
  rating: number
  onRate: (rating: number) => void
}

export function RatingCard({ movie, rating, onRate }: RatingCardProps) {
  const ratingOptions = [
    { value: 1, icon: ThumbsDown, label: 'Not for me', color: 'text-red-500' },
    { value: 2, icon: Meh, label: "It's okay", color: 'text-yellow-500' },
    { value: 3, icon: ThumbsUp, label: 'Pretty good', color: 'text-green-500' },
    { value: 4, icon: Heart, label: 'Love it', color: 'text-red-500' },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="relative h-64 w-full">
        <Image
          src={movie.poster_url || '/placeholder-movie.jpg'}
          alt={movie.title}
          fill
          className="object-cover"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="mb-1 text-lg font-semibold">{movie.title}</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {movie.year} • {Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ratingOptions.map(option => {
            const Icon = option.icon
            return (
              <Button
                key={option.value}
                variant={rating === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onRate(option.value)}
                className={cn('flex items-center gap-2', rating === option.value && option.color)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{option.label}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
