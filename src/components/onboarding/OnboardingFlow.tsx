'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Film,
  Star,
  Heart,
  Zap,
  Coffee,
  Moon,
  Sun,
  Smile,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { useToast } from '@/hooks/useToast'
import { useAsyncOperation } from '@/hooks/useAsyncOperation'

interface OnboardingFlowProps {
  onComplete: () => void
  className?: string
}

interface MovieRating {
  id: string
  title: string
  poster_url?: string
  rating?: number
  year?: number
  genre?: string[]
}

interface MoodGenre {
  genre: string
  mood: string
  icon: React.ReactNode
  description: string
}

const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
]

const MOOD_GENRES: MoodGenre[] = [
  {
    genre: 'Action',
    mood: 'energetic',
    icon: <Zap className="h-4 w-4" />,
    description: 'High-energy thrills',
  },
  {
    genre: 'Comedy',
    mood: 'happy',
    icon: <Smile className="h-4 w-4" />,
    description: 'Laugh out loud',
  },
  {
    genre: 'Romance',
    mood: 'romantic',
    icon: <Heart className="h-4 w-4" />,
    description: 'Feel the love',
  },
  {
    genre: 'Horror',
    mood: 'dark',
    icon: <Moon className="h-4 w-4" />,
    description: 'Spine-chilling',
  },
  {
    genre: 'Drama',
    mood: 'thoughtful',
    icon: <Coffee className="h-4 w-4" />,
    description: 'Deep & meaningful',
  },
  {
    genre: 'Science Fiction',
    mood: 'curious',
    icon: <Sun className="h-4 w-4" />,
    description: 'Mind-bending',
  },
]

export function OnboardingFlow({ onComplete, className = '' }: OnboardingFlowProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [movieRatings, setMovieRatings] = useState<Record<string, number>>({})
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0)
  const { showSuccess, showError } = useToast()

  // Use useAsyncOperation for fetching popular movies
  const {
    isLoading: isLoadingMovies,
    error: moviesError,
    data: popularMoviesData,
    execute: executeMoviesFetch,
  } = useAsyncOperation<MovieRating[]>([])

  // Use useAsyncOperation for submitting ratings
  const {
    isLoading: isSubmittingRatings,
    error: submitError,
    execute: executeSubmitRatings,
  } = useAsyncOperation<void>()

  // Ensure popularMovies is always an array
  const popularMovies = popularMoviesData || []

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  // Fetch popular movies for rating carousel
  useEffect(() => {
    if (step === 3 && popularMovies.length === 0) {
      executeMoviesFetch(async () => {
        const response = await fetch('/api/movies?limit=20')
        const data = await response.json()
        if (!data.success || !data.data) {
          throw new Error('Failed to fetch popular movies')
        }
        return data.data.slice(0, 20)
      })
    }
  }, [step, popularMovies.length, executeMoviesFetch])

  // Show error toast if movies fetch fails
  useEffect(() => {
    if (moviesError) {
      showError(`Failed to load movies: ${moviesError}`)
    }
  }, [moviesError, showError])

  // Show error toast if submission fails
  useEffect(() => {
    if (submitError) {
      showError(`Failed to save preferences: ${submitError}`)
    }
  }, [submitError, showError])

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre)
      } else if (prev.length < 5) {
        return [...prev, genre]
      }
      return prev
    })
  }

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev => {
      if (prev.includes(mood)) {
        return prev.filter(m => m !== mood)
      } else if (prev.length < 3) {
        return [...prev, mood]
      }
      return prev
    })
  }

  const rateMovie = (movieId: string, rating: number) => {
    setMovieRatings(prev => ({
      ...prev,
      [movieId]: rating,
    }))
  }

  const nextMovie = () => {
    if (currentMovieIndex < popularMovies.length - 1) {
      setCurrentMovieIndex(prev => prev + 1)
    }
  }

  const prevMovie = () => {
    if (currentMovieIndex > 0) {
      setCurrentMovieIndex(prev => prev - 1)
    }
  }

  const submitRatings = async () => {
    if (!user) return

    const ratingsArray = Array.from(Object.entries(movieRatings))
    const validRatings = ratingsArray.filter(([, rating]) => rating > 0)

    if (validRatings.length === 0) {
      showError('No ratings to submit. Please rate at least one movie to continue')
      return
    }

    const result = await executeSubmitRatings(async () => {
      // Submit all ratings in parallel for better performance
      const ratingPromises = validRatings.map(([movieId, rating]) =>
        fetch('/api/user/interactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            movieId,
            interactionType: 'rate',
            rating,
            context: {
              source: 'onboarding',
              timestamp: new Date().toISOString(),
            },
          }),
        })
      )

      const results = await Promise.all(ratingPromises)

      // Check if all requests were successful
      const allSuccessful = results.every(res => res.ok)

      if (!allSuccessful) {
        throw new Error('Some ratings failed to submit')
      }

      // Update user profile
      const profileResponse = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences_set: true,
        }),
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to update user profile')
      }
    })

    // Only show success and complete onboarding if the operation succeeded
    if (result !== null) {
      showSuccess('Preferences saved! Your movie preferences have been recorded.')
      onComplete()
    }
  }

  const canProceedFromStep1 = selectedGenres.length >= 3
  const canProceedFromStep2 = selectedMoods.length >= 2
  const canProceedFromStep3 = Object.keys(movieRatings).length >= 5

  return (
    <div className={`mx-auto max-w-4xl p-6 ${className}`}>
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Film className="text-primary h-8 w-8" />
          <h1 className="text-3xl font-bold">Welcome to CineAI</h1>
          <Sparkles className="h-8 w-8 text-yellow-500" />
        </div>
        <p className="text-base-content/70 text-lg">
          Let&apos;s create your perfect movie experience
        </p>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            Step {step} of {totalSteps}
          </span>
          <span className="text-base-content/70 text-sm">{Math.round(progress)}% Complete</span>
        </div>
        <div className="bg-base-200 h-2 w-full rounded-full">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Genre Selection */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-center">What genres do you love?</CardTitle>
                <p className="text-base-content/70 text-center">
                  Pick 3-5 genres that excite you most (selected: {selectedGenres.length}/5)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {AVAILABLE_GENRES.map(genre => (
                    <Badge
                      key={genre}
                      variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                      className="cursor-pointer p-3 text-center text-sm transition-all duration-200 hover:scale-105"
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>

                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedFromStep1}
                    size="lg"
                    className="px-8"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Mood Selection */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-center">What&apos;s your movie mood?</CardTitle>
                <p className="text-base-content/70 text-center">
                  Choose 2-3 moods that match your viewing style (selected: {selectedMoods.length}
                  /3)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {MOOD_GENRES.map(({ genre, mood, icon, description }) => (
                    <div
                      key={mood}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:scale-105 ${
                        selectedMoods.includes(mood)
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleMood(mood)}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${selectedMoods.includes(mood) ? 'bg-primary text-primary-content' : 'bg-gray-100'}`}
                        >
                          {icon}
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{mood}</h3>
                          <p className="text-sm text-gray-600">{genre}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedFromStep2}
                    size="lg"
                    className="px-8"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Movie Rating Carousel */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Rate some popular movies</CardTitle>
                <p className="text-base-content/70 text-center">
                  Help us understand your taste by rating at least 5 movies (rated:{' '}
                  {Object.keys(movieRatings).length}/20)
                </p>
              </CardHeader>
              <CardContent>
                {isLoadingMovies ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                    <p className="mt-4 text-gray-600">Loading popular movies...</p>
                  </div>
                ) : popularMovies.length > 0 ? (
                  <div className="space-y-6">
                    {/* Current Movie Display */}
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <div className="aspect-[2/3] w-48 overflow-hidden rounded-lg">
                          {popularMovies[currentMovieIndex]?.poster_url ? (
                            <Image
                              src={popularMovies[currentMovieIndex].poster_url}
                              alt={popularMovies[currentMovieIndex].title}
                              fill
                              className="object-cover"
                              sizes="192px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200">
                              <Film className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="bg-primary text-primary-content absolute -top-2 -right-2 rounded-full px-2 py-1 text-xs font-bold">
                          {currentMovieIndex + 1}/{popularMovies.length}
                        </div>
                      </div>

                      <h3 className="mb-2 text-center text-xl font-bold">
                        {popularMovies[currentMovieIndex]?.title}
                      </h3>

                      {popularMovies[currentMovieIndex]?.year && (
                        <p className="mb-4 text-gray-600">
                          {popularMovies[currentMovieIndex]?.year}
                        </p>
                      )}

                      {/* Rating Stars */}
                      <div className="mb-4 flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            onClick={() =>
                              popularMovies[currentMovieIndex] &&
                              rateMovie(popularMovies[currentMovieIndex].id, rating)
                            }
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={`h-8 w-8 ${
                                popularMovies[currentMovieIndex] &&
                                (movieRatings[popularMovies[currentMovieIndex].id] || 0) >= rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      {/* Quick Actions */}
                      <div className="mb-6 flex gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            popularMovies[currentMovieIndex] &&
                            rateMovie(popularMovies[currentMovieIndex].id, 5)
                          }
                          className="flex items-center gap-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Love it
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            popularMovies[currentMovieIndex] &&
                            rateMovie(popularMovies[currentMovieIndex].id, 1)
                          }
                          className="flex items-center gap-2"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not for me
                        </Button>
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          onClick={prevMovie}
                          disabled={currentMovieIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          onClick={nextMovie}
                          disabled={currentMovieIndex === popularMovies.length - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex justify-center gap-1">
                      {popularMovies.slice(0, 10).map((movie, index) => (
                        <div
                          key={index}
                          className={`h-2 w-2 rounded-full ${
                            movie?.id && movieRatings[movie.id]
                              ? 'bg-primary'
                              : index === currentMovieIndex
                                ? 'bg-primary/50'
                                : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Film className="mb-4 h-12 w-12 text-gray-400" />
                    <p className="text-gray-600">Unable to load movies for rating</p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        executeMoviesFetch(async () => {
                          const response = await fetch('/api/movies?limit=20')
                          const data = await response.json()
                          if (!data.success || !data.data) {
                            throw new Error('Failed to fetch popular movies')
                          }
                          return data.data.slice(0, 20)
                        })
                      }
                      className="mt-4"
                    >
                      Try Again
                    </Button>
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!canProceedFromStep3}
                    size="lg"
                    className="px-8"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Summary & Save */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Perfect! Your movie profile is ready</CardTitle>
                <p className="text-base-content/70 text-center">
                  We&apos;ll use this to create personalized recommendations just for you
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="mb-2 font-semibold">Your Favorite Genres:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedGenres.map(genre => (
                      <Badge key={genre} variant="default">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Your Movie Moods:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMoods.map(mood => {
                      const moodData = MOOD_GENRES.find(mg => mg.mood === mood)
                      return (
                        <Badge key={mood} variant="outline" className="flex items-center gap-1">
                          {moodData?.icon}
                          {mood}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Movies You Rated:</h3>
                  <p className="text-sm text-gray-600">
                    {Object.keys(movieRatings).length} movies rated •{' '}
                    {Object.values(movieRatings).filter(r => r >= 4).length} loved •{' '}
                    {Object.values(movieRatings).filter(r => r <= 2).length} disliked
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    disabled={isSubmittingRatings}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  <Button
                    onClick={submitRatings}
                    disabled={isSubmittingRatings}
                    size="lg"
                    className="px-8"
                  >
                    {isSubmittingRatings ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        Creating Your Profile...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Start My CineAI Journey
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
