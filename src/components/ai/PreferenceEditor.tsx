'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { X, Plus, RotateCcw, Edit3, Trash2 } from 'lucide-react'
import type { PreferenceData } from '@/types/chat'
import { useAsyncAction } from '@/hooks/useAsyncOperation'

interface PreferenceEditorProps {
  initialPreferences?: PreferenceData | null
  onSave?: (preferences: PreferenceData) => void
  onCancel?: () => void
}

export function PreferenceEditor({ initialPreferences, onSave, onCancel }: PreferenceEditorProps) {
  const [preferences, setPreferences] = useState<PreferenceData>({
    genres: [],
    actors: [],
    directors: [],
    moods: [],
    themes: [],
    yearRange: { min: 1980, max: 2024 },
    ratingRange: { min: 6.0, max: 10.0 },
    languages: ['English'],
    viewingContexts: [],
    dislikedGenres: [],
    ...initialPreferences,
  })

  const [newItems, setNewItems] = useState<Record<string, string>>({
    genres: '',
    actors: '',
    directors: '',
    moods: '',
    themes: '',
    languages: '',
    viewingContexts: '',
    dislikedGenres: '',
  })

  const { isLoading, execute } = useAsyncAction()
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  useEffect(() => {
    const hasChangedFromInitial = JSON.stringify(preferences) !== JSON.stringify(initialPreferences)
    setHasChanges(hasChangedFromInitial)
  }, [preferences, initialPreferences])

  const addItem = (field: keyof typeof newItems, value?: string) => {
    const itemToAdd = value || newItems[field]?.trim()
    if (!itemToAdd) return

    setPreferences(prev => {
      const currentValue = prev[field]
      const currentArray = Array.isArray(currentValue) ? currentValue : []
      return {
        ...prev,
        [field]: [...currentArray, itemToAdd],
      }
    })

    setNewItems(prev => ({ ...prev, [field]: '' }))
  }

  const removeItem = (field: keyof typeof newItems, item: string) => {
    setPreferences(prev => {
      const currentValue = prev[field]
      const currentArray = Array.isArray(currentValue) ? currentValue : []
      return {
        ...prev,
        [field]: currentArray.filter((i: string) => i !== item),
      }
    })
  }

  const updateRange = (field: 'yearRange' | 'ratingRange', values: number[]) => {
    setPreferences(prev => ({
      ...prev,
      [field]: { min: values[0], max: values[1] },
    }))
  }

  const handleSave = async () => {
    if (!hasChanges) return

    await execute(async () => {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      const data = await response.json()
      if (data.success) {
        onSave?.(preferences)
        setHasChanges(false)
      }
    })
  }

  const handleReset = () => {
    setPreferences({
      genres: [],
      actors: [],
      directors: [],
      moods: [],
      themes: [],
      yearRange: { min: 1980, max: 2024 },
      ratingRange: { min: 6.0, max: 10.0 },
      languages: ['English'],
      viewingContexts: [],
      dislikedGenres: [],
    })
    setNewItems({
      genres: '',
      actors: '',
      directors: '',
      moods: '',
      themes: '',
      languages: '',
      viewingContexts: '',
      dislikedGenres: '',
    })
  }

  const commonGenres = [
    'Action',
    'Comedy',
    'Drama',
    'Horror',
    'Romance',
    'Sci-Fi',
    'Fantasy',
    'Thriller',
    'Mystery',
    'Animation',
    'Documentary',
    'Crime',
    'Adventure',
  ]

  const commonMoods = [
    'Feel-good',
    'Thought-provoking',
    'Exciting',
    'Relaxing',
    'Intense',
    'Emotional',
    'Inspiring',
    'Dark',
    'Light-hearted',
    'Suspenseful',
  ]

  const commonContexts = [
    'Date night',
    'Solo viewing',
    'Family time',
    'With friends',
    'Background watching',
    'Focused viewing',
    'Weekend binge',
    'Quick watch',
    'Late night',
    'Rainy day',
  ]

  const renderArrayField = (
    field: keyof typeof newItems,
    label: string,
    suggestions?: string[]
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{label}</CardTitle>
        <CardDescription>Add your preferences for {label.toLowerCase()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current items */}
        <div className="flex flex-wrap gap-2">
          {((preferences[field] as string[]) || []).map((item, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {item}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0"
                onClick={() => removeItem(field, item)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>

        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            placeholder={`Add ${label.toLowerCase()}...`}
            value={newItems[field]}
            onChange={e => setNewItems(prev => ({ ...prev, [field]: e.target.value }))}
            onKeyPress={e => e.key === 'Enter' && addItem(field)}
            className="text-xs"
          />
          <Button size="sm" onClick={() => addItem(field)} disabled={!newItems[field]?.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Suggestions */}
        {suggestions && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Quick add:</Label>
            <div className="flex flex-wrap gap-1">
              {suggestions
                .filter(
                  suggestion => !((preferences[field] as string[]) || []).includes(suggestion)
                )
                .slice(0, 8)
                .map(suggestion => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => addItem(field, suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Movie Preferences</h2>
          <p className="text-muted-foreground">
            Customize your movie preferences for better recommendations
          </p>
        </div>

        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              <Edit3 className="mr-1 h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="genres" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="genres">Genres & Moods</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="genres" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {renderArrayField('genres', 'Favorite Genres', commonGenres)}
            {renderArrayField('moods', 'Preferred Moods', commonMoods)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {renderArrayField('themes', 'Themes & Topics')}
            {renderArrayField('dislikedGenres', 'Disliked Genres', commonGenres)}
          </div>
        </TabsContent>

        <TabsContent value="people" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {renderArrayField('actors', 'Favorite Actors')}
            {renderArrayField('directors', 'Favorite Directors')}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Release Year Range</CardTitle>
                <CardDescription>
                  Movies from {preferences.yearRange?.min} to {preferences.yearRange?.max}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Slider
                  value={[preferences.yearRange?.min || 1980, preferences.yearRange?.max || 2024]}
                  onValueChange={values => updateRange('yearRange', values)}
                  min={1960}
                  max={2024}
                  step={1}
                  className="w-full"
                />
                <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                  <span>1960</span>
                  <span>2024</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rating Range</CardTitle>
                <CardDescription>
                  Movies rated {preferences.ratingRange?.min}/10 to {preferences.ratingRange?.max}
                  /10
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Slider
                  value={[
                    preferences.ratingRange?.min || 6.0,
                    preferences.ratingRange?.max || 10.0,
                  ]}
                  onValueChange={values => updateRange('ratingRange', values)}
                  min={1.0}
                  max={10.0}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                  <span>1.0</span>
                  <span>10.0</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {renderArrayField('languages', 'Preferred Languages')}
            {renderArrayField('viewingContexts', 'Viewing Contexts', commonContexts)}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trash2 className="h-4 w-4" />
                Reset Preferences
              </CardTitle>
              <CardDescription>
                Clear all preferences and start fresh. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleReset} className="min-w-[120px]">
                <RotateCcw className="mr-2 h-3 w-3" />
                Reset All
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preference Summary</CardTitle>
              <CardDescription>Overview of your current preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Genres:</strong> {(preferences.genres || []).length || 'None'}
                </div>
                <div>
                  <strong>Actors:</strong> {(preferences.actors || []).length || 'None'}
                </div>
                <div>
                  <strong>Directors:</strong> {(preferences.directors || []).length || 'None'}
                </div>
                <div>
                  <strong>Moods:</strong> {(preferences.moods || []).length || 'None'}
                </div>
                <div>
                  <strong>Languages:</strong> {(preferences.languages || []).length || 'None'}
                </div>
                <div>
                  <strong>Contexts:</strong> {(preferences.viewingContexts || []).length || 'None'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
