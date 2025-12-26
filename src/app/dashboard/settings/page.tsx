'use client'

import { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PreferencesSetup from '@/components/PreferencesSetup'
import { EditableTasteProfile } from '@/components/profile/EditableTasteProfile'
import { AIControlPanel } from '@/components/ai/AIControlPanel'
import { Settings, Brain, User, Trash2, AlertCircle, CheckCircle, Clock, X, Heart, Sliders, Download, Upload, Database } from 'lucide-react'
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

class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
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
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    ratings: number
    watchlist: number
    name?: string
  } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [setToast])

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
      // Fail silently - AI preferences are optional
    }
  }, [setAiPreferences])

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
      // Fail silently - show no manual preferences
      setHasManualPreferences(false)
    }
  }, [setManualPreferences, setHasManualPreferences])

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
      // Error feedback handled by UI toast
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
      // Error feedback handled by UI toast
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
      // Error feedback handled by UI toast
      showToast('Failed to clear preferences. Please try again.', 'error')
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/backup')
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cineai-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('Data exported successfully!', 'success')
    } catch (error) {
      showToast('Failed to export data. Please try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      // Validate structure
      if (!backup.version || !backup.ratings || !backup.watchlist) {
        showToast('Invalid backup file format', 'error')
        return
      }

      setImportPreview({
        ratings: backup.ratings.length,
        watchlist: backup.watchlist.length,
        name: backup.profile?.name,
      })
    } catch (error) {
      showToast('Failed to read backup file', 'error')
    }
  }

  const handleImportData = async (file: File, mode: 'merge' | 'replace') => {
    setImporting(true)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup, mode }),
      })

      const data = await response.json()

      if (data.success) {
        showToast(
          `Imported ${data.imported.ratings} ratings and ${data.imported.watchlist} watchlist items!`,
          'success'
        )
        setImportPreview(null)
      } else {
        showToast(data.error || 'Import failed', 'error')
      }
    } catch (error) {
      showToast('Failed to import data', 'error')
    } finally {
      setImporting(false)
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ai-learned" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI Learned ({getTotalAiPreferences()})</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="taste-profile" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Taste Profile</span>
            <span className="sm:hidden">Taste</span>
          </TabsTrigger>
          <TabsTrigger value="ai-controls" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">AI Controls</span>
            <span className="sm:hidden">Controls</span>
          </TabsTrigger>
          <TabsTrigger value="manual-setup" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Manual Setup {hasManualPreferences && '✓'}</span>
            <span className="sm:hidden">Manual</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
            <span className="sm:hidden">Data</span>
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

        {/* Taste Profile Tab */}
        <TabsContent value="taste-profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                AI Taste Profile
              </CardTitle>
              <CardDescription>
                View and edit your detailed taste profile that the AI uses to understand your preferences.
                This helps generate more personalized recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-600">Error loading taste profile. Please refresh the page.</div>}>
                <EditableTasteProfile />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Controls Tab */}
        <TabsContent value="ai-controls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-blue-500" />
                AI Behavior Controls
              </CardTitle>
              <CardDescription>
                Configure how the AI learns, recommends, and explains its choices. 
                Fine-tune the recommendation engine to match your preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary fallback={<div className="p-4 text-center text-red-600">Error loading AI controls. Please refresh the page.</div>}>
                <AIControlPanel />
              </ErrorBoundary>
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
                  onSave={preferences => {
                    void handleSaveManualPreferences(preferences as unknown as ManualPreferences)
                  }}
                  onSkip={() => setActiveTab('ai-learned')}
                  isLoading={saving}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export your data for backup or import from a previous backup.
                Your data is stored locally and never leaves your machine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Export Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Export Your Data</h3>
                <p className="text-sm text-gray-600">
                  Download all your ratings, watchlist, and preferences as a JSON file.
                  Use this to backup your data or transfer to another device.
                </p>
                <Button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Download Backup'}
                </Button>
              </div>

              <div className="border-t border-gray-200" />

              {/* Import Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Import from Backup</h3>
                <p className="text-sm text-gray-600">
                  Restore data from a previous export. You can merge with existing data
                  or replace everything.
                </p>

                {!importPreview ? (
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 hover:border-gray-400 hover:bg-gray-50">
                        <Upload className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Select backup file</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
                    <h4 className="font-medium text-gray-900">Backup Preview</h4>
                    <div className="grid gap-2 text-sm">
                      {importPreview.name && (
                        <div>
                          <span className="text-gray-500">Profile:</span>
                          <span className="ml-2 font-medium">{importPreview.name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Ratings:</span>
                        <span className="ml-2 font-medium">{importPreview.ratings} movies</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Watchlist:</span>
                        <span className="ml-2 font-medium">{importPreview.watchlist} items</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const input = document.querySelector('input[type="file"]') as HTMLInputElement
                          if (input?.files?.[0]) {
                            handleImportData(input.files[0], 'merge')
                          }
                        }}
                        disabled={importing}
                        className="flex-1"
                      >
                        {importing ? 'Importing...' : 'Merge with Existing'}
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => {
                          const input = document.querySelector('input[type="file"]') as HTMLInputElement
                          if (input?.files?.[0]) {
                            handleImportData(input.files[0], 'replace')
                          }
                        }}
                        disabled={importing}
                        className="flex-1"
                      >
                        {importing ? 'Importing...' : 'Replace All'}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => setImportPreview(null)}
                      className="w-full text-gray-500"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200" />

              {/* Data Location Info */}
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 font-medium text-blue-900">Where is your data stored?</h4>
                <p className="text-sm text-blue-700">
                  All your data is stored locally in <code className="rounded bg-blue-100 px-1">~/.cineai/</code>
                </p>
                <ul className="mt-2 list-inside list-disc text-sm text-blue-600">
                  <li><code>cineai.db</code> - SQLite database with movies, ratings, watchlist</li>
                  <li><code>config.json</code> - Your settings and API keys</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
