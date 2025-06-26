'use client'

import React, { useState } from 'react'
import { Search, Brain, Sparkles, Target, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { MovieGridSkeleton } from '@/components/movies/MovieCardSkeleton'
import { motion } from 'framer-motion'
import type { Movie } from '@/types'
import { useAsyncOperation } from '@/hooks/useAsyncOperation'

interface SemanticSearchResult {
  movies: Movie[]
  insights: {
    method: string
    semanticMatches: number
    totalCandidates: number
    diversityScore: number
  }
  pagination: {
    currentPage: number
    limit: number
    hasMore: boolean
    totalResults: number
  }
}

interface SemanticSearchProps {
  onMovieClick?: (movie: Movie) => void
  className?: string
}

export function SemanticSearch({ onMovieClick, className = '' }: SemanticSearchProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [mood, setMood] = useState('')
  const {
    isLoading,
    error,
    data: results,
    setError,
    execute,
  } = useAsyncOperation<SemanticSearchResult>()

  const availableGenres = [
    'Action',
    'Comedy',
    'Drama',
    'Horror',
    'Sci-Fi',
    'Romance',
    'Thriller',
    'Fantasy',
    'Adventure',
    'Mystery',
  ]

  const availableMoods = [
    'Exciting',
    'Relaxing',
    'Thoughtful',
    'Fun',
    'Intense',
    'Emotional',
    'Mysterious',
    'Uplifting',
    'Dark',
    'Light',
  ]

  const handleSearch = async () => {
    if (!user?.id) {
      setError('Please log in to use semantic search')
      return
    }

    if (!query.trim() && selectedGenres.length === 0) {
      setError('Please enter a search query or select genres')
      return
    }

    await execute(async () => {
      const response = await fetch('/api/recommendations/semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          query: query.trim() || undefined,
          preferredGenres: selectedGenres.length > 0 ? selectedGenres : undefined,
          mood: mood || undefined,
          limit: 12,
          semanticThreshold: 0.6,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Search failed')
      }

      return data.data
    })
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Brain className="text-primary h-8 w-8" />
          <h2 className="text-2xl font-bold">AI-Powered Movie Discovery</h2>
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-base-content/70 mx-auto max-w-2xl">
          Describe what you are looking for, and our AI will find movies that match your vibe using
          advanced semantic understanding.
        </p>
      </div>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Semantic Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe what you want to watch</label>
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="e.g., A mind-bending thriller with great visuals or Heartwarming comedy for a family night"
              className="w-full"
            />
          </div>

          {/* Genre Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Genres (optional)</label>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map(genre => (
                <Badge
                  key={genre}
                  variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mood Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Mood (optional)</label>
            <div className="flex flex-wrap gap-2">
              {availableMoods.map(moodOption => (
                <Badge
                  key={moodOption}
                  variant={mood === moodOption ? 'default' : 'outline'}
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setMood(mood === moodOption ? '' : moodOption)}
                >
                  {moodOption}
                </Badge>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <Button onClick={handleSearch} disabled={isLoading || !user} className="w-full" size="lg">
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                Searching with AI...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Find Movies
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && <div className="bg-error/10 text-error rounded-lg p-3 text-sm">{error}</div>}
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="border-primary h-5 w-5 animate-spin rounded-full border-b-2" />
            <span>AI is analyzing your preferences...</span>
          </div>
          <MovieGridSkeleton count={8} />
        </div>
      )}

      {results && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">
                    {results.insights.semanticMatches}
                  </div>
                  <div className="text-base-content/70 text-sm">Semantic Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-secondary text-2xl font-bold">
                    {results.insights.totalCandidates}
                  </div>
                  <div className="text-base-content/70 text-sm">Total Candidates</div>
                </div>
                <div className="text-center">
                  <div className="text-accent text-2xl font-bold">
                    {Math.round(results.insights.diversityScore * 100)}%
                  </div>
                  <div className="text-base-content/70 text-sm">Diversity Score</div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {results.insights.method === 'semantic' ? 'AI-Powered' : 'Preference-Based'}
                  </Badge>
                  <div className="text-base-content/70 mt-1 text-sm">Method Used</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movie Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <Target className="h-5 w-5" />
                Recommended Movies ({results.movies.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.movies.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                >
                  <SemanticMovieCard movie={movie} onMovieClick={onMovieClick} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

interface SemanticMovieCardProps {
  movie: Movie & {
    semanticSimilarity?: number
    recommendationReason?: string
    confidence?: number
  }
  onMovieClick?: (movie: Movie) => void
}

function SemanticMovieCard({ movie, onMovieClick }: SemanticMovieCardProps) {
  const handleClick = () => {
    if (onMovieClick) {
      onMovieClick(movie)
    }
  }

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="bg-base-200 flex h-full w-full items-center justify-center">
            <span className="text-base-content/50">No Image</span>
          </div>
        )}

        {/* AI Score Overlay */}
        {movie.semanticSimilarity && movie.semanticSimilarity > 0.6 && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="bg-primary/90 text-primary-content text-xs">
              <Brain className="mr-1 h-3 w-3" />
              {Math.round(movie.semanticSimilarity * 100)}%
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h4 className="group-hover:text-primary mb-2 line-clamp-2 text-sm font-semibold transition-colors">
          {movie.title}
        </h4>

        <div className="space-y-2">
          {movie.recommendationReason && (
            <p className="text-base-content/70 line-clamp-2 text-xs">
              {movie.recommendationReason}
            </p>
          )}

          <div className="flex items-center justify-between text-xs">
            <span>{movie.year}</span>
            {movie.rating && <span className="flex items-center gap-1">⭐ {movie.rating}/10</span>}
          </div>

          {movie.confidence && (
            <div className="bg-base-300 h-1 w-full rounded-full">
              <div
                className="bg-primary h-1 rounded-full transition-all duration-500"
                style={{ width: `${movie.confidence * 100}%` }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
