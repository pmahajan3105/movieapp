'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Brain, Check, X } from 'lucide-react'

const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Biography',
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
  'Sci-Fi',
  'Sport',
  'Thriller',
  'War',
  'Western',
]

interface PreferencesSetupProps {
  onSave: (preferences: any) => void
  onSkip: () => void
  isLoading?: boolean
}

export default function PreferencesSetup({
  onSave,
  onSkip,
  isLoading = false,
}: PreferencesSetupProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action', 'Drama', 'Comedy'])
  const [minRating, setMinRating] = useState([7.0])
  const [minYear, setMinYear] = useState([2010])

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handleSave = () => {
    const preferences = {
      preferred_genres: selectedGenres,
      disliked_genres: [],
      preferred_rating_min: minRating[0],
      preferred_year_min: minYear[0],
    }
    onSave(preferences)
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Brain className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-2xl">Set Up AI Recommendations</CardTitle>
        </div>
        <CardDescription>
          Help our AI understand your movie preferences for personalized recommendations
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Genre Selection */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">Preferred Genres</h3>
          <p className="mb-4 text-sm text-gray-600">Select genres you enjoy watching</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_GENRES.map(genre => (
              <Badge
                key={genre}
                variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                className="hover:bg-primary/80 cursor-pointer transition-colors"
                onClick={() => toggleGenre(genre)}
              >
                {selectedGenres.includes(genre) && <Check className="mr-1 h-3 w-3" />}
                {genre}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Selected: {selectedGenres.length} genres</p>
        </div>

        {/* Minimum Rating */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">Minimum Rating</h3>
          <p className="mb-4 text-sm text-gray-600">
            Only show movies with rating above: <strong>{minRating[0]}/10</strong>
          </p>
          <Slider
            value={minRating}
            onValueChange={setMinRating}
            max={10}
            min={1}
            step={0.5}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>1.0</span>
            <span>10.0</span>
          </div>
        </div>

        {/* Minimum Year */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">Minimum Year</h3>
          <p className="mb-4 text-sm text-gray-600">
            Only show movies from: <strong>{minYear[0]} onwards</strong>
          </p>
          <Slider
            value={minYear}
            onValueChange={setMinYear}
            max={2025}
            min={1980}
            step={5}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>1980</span>
            <span>2025</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={selectedGenres.length === 0 || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            Save Preferences
          </Button>
          <Button variant="outline" onClick={onSkip} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Skip for Now
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            You can change these preferences anytime in your profile settings
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
