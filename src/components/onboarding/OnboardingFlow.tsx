'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Sparkles, Film } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/browser-client'

interface OnboardingFlowProps {
  onComplete: () => void
  className?: string
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

export function OnboardingFlow({ onComplete, className = '' }: OnboardingFlowProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalSteps = 2
  const progress = (step / totalSteps) * 100

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

  const savePreferences = async () => {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      const preferences = {
        explicitGenres: selectedGenres,
        onboardingCompletedAt: new Date().toISOString(),
      }

      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email!,
        preferences: preferences,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })

      if (profileError) throw profileError
      onComplete()
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError('Failed to save preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canProceedFromStep1 = selectedGenres.length >= 3

  return (
    <div className={`mx-auto max-w-4xl p-6 ${className}`}>
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Film className="text-primary h-8 w-8" />
          <h1 className="text-3xl font-bold">Welcome to CineAI</h1>
          <Sparkles className="h-8 w-8 text-yellow-500" />
        </div>
        <p className="text-base-content/70 text-lg">Let&apos;s personalize your movie experience</p>
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
                <CardTitle className="text-center">
                  Perfect! Let&apos;s save your preferences
                </CardTitle>
                <p className="text-base-content/70 text-center">
                  We&apos;ll use these to personalize your movie recommendations
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

                {error && (
                  <div className="bg-error/10 text-error rounded-lg p-3 text-sm">{error}</div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  <Button onClick={savePreferences} disabled={loading} size="lg" className="px-8">
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Start My Journey
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
