'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Heart, ThumbsUp, ThumbsDown, SkipForward, Check, Loader2 } from 'lucide-react'

interface OnboardingMovie {
  tmdb_id: number
  title: string
  year: number
  genres: string[]
  poster_url?: string
  rating?: number
}

type RatingType = 'loved' | 'seen' | 'not_for_me' | 'skip' | null

export default function TasteOnboardingPage() {
  const router = useRouter()
  const [movies, setMovies] = useState<OnboardingMovie[]>([])
  const [ratings, setRatings] = useState<Map<number, RatingType>>(new Map())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ratedCount = Array.from(ratings.values()).filter(r => r && r !== 'skip').length
  const minRequired = 10
  const canContinue = ratedCount >= minRequired

  useEffect(() => {
    async function loadMovies() {
      try {
        const response = await fetch('/api/onboarding/movies')
        const data = await response.json()

        if (data.success) {
          setMovies(data.movies)
        } else {
          setError('Failed to load movies')
        }
      } catch (err) {
        setError('Failed to load movies')
      } finally {
        setLoading(false)
      }
    }

    loadMovies()
  }, [])

  const handleRate = (tmdbId: number, rating: RatingType) => {
    setRatings(prev => {
      const newRatings = new Map(prev)
      if (newRatings.get(tmdbId) === rating) {
        // Toggle off if same rating clicked
        newRatings.delete(tmdbId)
      } else {
        newRatings.set(tmdbId, rating)
      }
      return newRatings
    })
  }

  const handleSubmit = async () => {
    if (!canContinue) return

    setSubmitting(true)
    setError(null)

    try {
      const ratingsArray = movies
        .filter(m => ratings.has(m.tmdb_id))
        .map(m => ({
          tmdb_id: m.tmdb_id,
          title: m.title,
          rating: ratings.get(m.tmdb_id)!,
          genres: m.genres,
        }))

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings: ratingsArray }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'Failed to save preferences')
      }
    } catch (err) {
      setError('Failed to save preferences')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    // Allow skip but warn
    if (ratedCount < 5) {
      if (!confirm('Rating more movies will help us give you better recommendations. Skip anyway?')) {
        return
      }
    }

    setSubmitting(true)
    try {
      // Submit whatever ratings we have
      if (ratedCount > 0) {
        const ratingsArray = movies
          .filter(m => ratings.has(m.tmdb_id))
          .map(m => ({
            tmdb_id: m.tmdb_id,
            title: m.title,
            rating: ratings.get(m.tmdb_id)!,
            genres: m.genres,
          }))

        await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ratings: ratingsArray }),
        })
      }

      // Mark as completed anyway
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to skip onboarding')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-white" />
          <p className="mt-4 text-lg text-white/80">Loading movies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">What do you like?</h1>
              <p className="text-sm text-white/60">
                Rate movies you&apos;ve seen to get personalized recommendations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {ratedCount}/{minRequired}
                </div>
                <div className="text-xs text-white/60">minimum ratings</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  disabled={submitting}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canContinue || submitting}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Continue
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min((ratedCount / minRequired) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="rounded-lg bg-red-500/20 px-4 py-2 text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Rating legend */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span>Loved it</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
              <ThumbsUp className="h-4 w-4 text-white" />
            </div>
            <span>Seen it</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-500">
              <ThumbsDown className="h-4 w-4 text-white" />
            </div>
            <span>Not for me</span>
          </div>
        </div>
      </div>

      {/* Movie grid */}
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((movie) => {
            const currentRating = ratings.get(movie.tmdb_id)

            return (
              <div key={movie.tmdb_id} className="group relative">
                {/* Movie poster */}
                <div
                  className={`relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-800 transition-all ${
                    currentRating ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''
                  } ${
                    currentRating === 'loved'
                      ? 'ring-red-500'
                      : currentRating === 'seen'
                        ? 'ring-blue-500'
                        : currentRating === 'not_for_me'
                          ? 'ring-gray-500'
                          : ''
                  }`}
                >
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
                      {movie.title}
                    </div>
                  )}

                  {/* Rating badge */}
                  {currentRating && currentRating !== 'skip' && (
                    <div
                      className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full ${
                        currentRating === 'loved'
                          ? 'bg-red-500'
                          : currentRating === 'seen'
                            ? 'bg-blue-500'
                            : 'bg-gray-500'
                      }`}
                    >
                      {currentRating === 'loved' && <Heart className="h-4 w-4 text-white" />}
                      {currentRating === 'seen' && <ThumbsUp className="h-4 w-4 text-white" />}
                      {currentRating === 'not_for_me' && <ThumbsDown className="h-4 w-4 text-white" />}
                    </div>
                  )}

                  {/* Hover overlay with rating buttons */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRate(movie.tmdb_id, 'loved')}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                          currentRating === 'loved' ? 'bg-red-500' : 'bg-white/20 hover:bg-red-500'
                        }`}
                        title="Loved it"
                      >
                        <Heart className="h-6 w-6 text-white" />
                      </button>
                      <button
                        onClick={() => handleRate(movie.tmdb_id, 'seen')}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                          currentRating === 'seen' ? 'bg-blue-500' : 'bg-white/20 hover:bg-blue-500'
                        }`}
                        title="Seen it"
                      >
                        <ThumbsUp className="h-6 w-6 text-white" />
                      </button>
                      <button
                        onClick={() => handleRate(movie.tmdb_id, 'not_for_me')}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                          currentRating === 'not_for_me' ? 'bg-gray-500' : 'bg-white/20 hover:bg-gray-500'
                        }`}
                        title="Not for me"
                      >
                        <ThumbsDown className="h-6 w-6 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Movie info */}
                <div className="mt-2">
                  <h3 className="truncate text-sm font-medium text-white">{movie.title}</h3>
                  <p className="text-xs text-white/50">{movie.year}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 p-4 backdrop-blur-lg md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-white">{ratedCount}/{minRequired}</span>
            <span className="ml-2 text-sm text-white/60">rated</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canContinue || submitting}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
