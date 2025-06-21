'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PreferencesSetup from '@/components/PreferencesSetup'
import { Settings, Brain, User, Trash2, AlertCircle, CheckCircle, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreferenceItem {
  id: string
  category: string
  value: string
  type: string
  learnedAt: string
  source?: string
}

interface UserPreferences {
  moviePreferences?: PreferenceItem[]
  viewingPreferences?: PreferenceItem[]
  contentPreferences?: PreferenceItem[]
  socialPreferences?: PreferenceItem[]
}

interface ManualPreferences {
  preferred_genres: string[]
  disliked_genres: string[]
  preferred_rating_min: number
  preferred_year_min: number
}

interface ToastMessage {
  message: string
  type: 'success' | 'error'
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiPreferences, setAiPreferences] = useState<UserPreferences>({})
  const [manualPreferences, setManualPreferences] = useState<ManualPreferences | null>(null)
  const [hasManualPreferences, setHasManualPreferences] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [activeTab, setActiveTab] = useState('ai-learned')

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const loadAiPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/preferences')
      const data = await response.json()

      if (data.success && data.preferences) {
        const realPreferences = data.preferences
        const transformedPreferences: UserPreferences = {}

        // Movie Preferences
        const moviePrefs: PreferenceItem[] = []

        const genres = realPreferences.preferred_genres || realPreferences.genres
        if (genres?.length > 0) {
          moviePrefs.push({
            id: 'genres',
            category: 'Favorite Genres',
            value: genres.join(', '),
            type: 'genre',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation',
          })
        }

        const directors = realPreferences.favorite_directors || realPreferences.directors
        if (directors?.length > 0) {
          moviePrefs.push({
            id: 'directors',
            category: 'Favorite Directors',
            value: directors.join(', '),
            type: 'director',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation',
          })
        }

        const actors = realPreferences.favorite_actors || realPreferences.actors
        if (actors?.length > 0) {
          moviePrefs.push({
            id: 'actors',
            category: 'Favorite Actors',
            value: actors.join(', '),
            type: 'actor',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation',
          })
        }

        const favoriteMovies = realPreferences.favorite_movies
        if (favoriteMovies?.length > 0) {
          moviePrefs.push({
            id: 'favoriteMovies',
            category: 'Favorite Movies',
            value: favoriteMovies.join(', '),
            type: 'movie',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation',
          })
        }

        // Viewing Preferences
        const viewingPrefs: PreferenceItem[] = []

        const preferredEras = realPreferences.preferred_eras
        if (preferredEras?.length > 0) {
          viewingPrefs.push({
            id: 'preferredEras',
            category: 'Preferred Eras',
            value: preferredEras.join(', '),
            type: 'era',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation',
          })
        }

        if (realPreferences.yearRange) {
          viewingPrefs.push({
            id: 'yearRange',
            category: 'Preferred Years',
            value: `${realPreferences.yearRange.min} - ${realPreferences.yearRange.max}`,
            type: 'year',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation',
          })
        }

        if (realPreferences.ratingRange) {
          viewingPrefs.push({
            id: 'ratingRange',
            category: 'Preferred Ratings',
            value: `${realPreferences.ratingRange.min}/10 - ${realPreferences.ratingRange.max}/10`,
            type: 'rating',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation',
          })
        }

        transformedPreferences.moviePreferences = moviePrefs
        transformedPreferences.viewingPreferences = viewingPrefs

        setAiPreferences(transformedPreferences)
      }
    } catch (error) {
      console.error('Error loading AI preferences:', error)
    }
  }, [])

  const loadManualPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/user/preferences')
      const data = await response.json()

      if (data.hasPreferences && data.preferences) {
        setManualPreferences(data.preferences)
        setHasManualPreferences(true)
      } else {
        setHasManualPreferences(false)
      }
    } catch (error) {
      console.error('Error loading manual preferences:', error)
      setHasManualPreferences(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      Promise.all([loadAiPreferences(), loadManualPreferences()]).finally(() => {
        setLoading(false)
      })
    }
  }, [user, loadAiPreferences, loadManualPreferences])

  const handleSaveManualPreferences = async (preferences: ManualPreferences) => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      })

      if (response.ok) {
        setManualPreferences(preferences)
        setHasManualPreferences(true)
        showToast('Manual preferences saved successfully!', 'success')
      } else {
        showToast('Failed to save preferences. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      showToast('Failed to save preferences. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAiPreference = async (preferenceId: string) => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferenceId }),
      })

      if (response.ok) {
        await loadAiPreferences()
        showToast('Preference deleted successfully!', 'success')
      } else {
        showToast('Failed to delete preference. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Error deleting preference:', error)
      showToast('Failed to delete preference. Please try again.', 'error')
    }
  }

  const handleClearManualPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'DELETE',
      })

      if (response.ok) {
        setManualPreferences(null)
        setHasManualPreferences(false)
        showToast('Manual preferences cleared successfully!', 'success')
      } else {
        showToast('Failed to clear preferences. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Error clearing preferences:', error)
      showToast('Failed to clear preferences. Please try again.', 'error')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'favorite genres':
        return '🎭'
      case 'favorite directors':
        return '🎬'
      case 'favorite actors':
        return '🎭'
      case 'favorite movies':
        return '🍿'
      case 'preferred eras':
        return '📅'
      case 'preferred years':
        return '📆'
      case 'preferred ratings':
        return '⭐'
      default:
        return '📝'
    }
  }

  const getTotalAiPreferences = () => {
    return Object.values(aiPreferences).reduce((total, prefs) => total + (prefs?.length || 0), 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Please log in to access settings.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg',
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Preferences</h1>
        </div>
        <p className="text-gray-600">
          Manage your movie preferences to get better AI recommendations
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-learned" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Learned ({getTotalAiPreferences()})
          </TabsTrigger>
          <TabsTrigger value="manual-setup" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Manual Setup {hasManualPreferences && '✓'}
          </TabsTrigger>
        </TabsList>

        {/* AI Learned Tab */}
        <TabsContent value="ai-learned" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI Learned Preferences
              </CardTitle>
              <CardDescription>
                These preferences were learned from your conversations with CineAI. They help
                improve your movie recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getTotalAiPreferences() === 0 ? (
                <div className="py-8 text-center">
                  <Brain className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-700">
                    No AI Preferences Yet
                  </h3>
                  <p className="mb-4 text-gray-500">
                    Start chatting with CineAI about movies you like to build your preference
                    profile!
                  </p>
                  <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
                    Chat with CineAI
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(aiPreferences).map(
                    ([category, preferences]) =>
                      preferences &&
                      preferences.length > 0 && (
                        <div key={category}>
                          <h3 className="mb-3 text-lg font-semibold capitalize">
                            {category.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <div className="grid gap-3">
                            {preferences.map((pref: PreferenceItem) => (
                              <div
                                key={pref.id}
                                className="flex items-start justify-between rounded-lg border p-4"
                              >
                                <div className="flex-1">
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="text-lg">
                                      {getCategoryIcon(pref.category)}
                                    </span>
                                    <span className="font-medium">{pref.category}</span>
                                    {pref.source && (
                                      <Badge variant="outline" className="text-xs">
                                        {pref.source}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mb-2 text-gray-700">{pref.value}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Learned: {formatDate(pref.learnedAt)}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAiPreference(pref.id)}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Setup Tab */}
        <TabsContent value="manual-setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Manual Preference Setup
              </CardTitle>
              <CardDescription>
                Set your movie preferences manually for AI recommendations. These preferences
                override AI learned preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasManualPreferences && manualPreferences ? (
                <div className="space-y-6">
                  {/* Current Manual Preferences Display */}
                  <div className="rounded-lg border bg-green-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-green-800">Current Manual Preferences</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearManualPreferences}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Clear All
                      </Button>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div>
                        <span className="font-medium">Preferred Genres:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {manualPreferences.preferred_genres.map(genre => (
                            <Badge key={genre} variant="secondary">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Minimum Rating:</span>
                        <span className="ml-2">{manualPreferences.preferred_rating_min}/10</span>
                      </div>
                      <div>
                        <span className="font-medium">Minimum Year:</span>
                        <span className="ml-2">{manualPreferences.preferred_year_min}</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <Button onClick={() => setHasManualPreferences(false)} className="w-full">
                    Edit Manual Preferences
                  </Button>
                </div>
              ) : (
                <PreferencesSetup
                  onSave={handleSaveManualPreferences}
                  onSkip={() => setActiveTab('ai-learned')}
                  isLoading={saving}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
