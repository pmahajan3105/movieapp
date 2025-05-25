'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, User, Calendar, Clock, Brain, Settings } from 'lucide-react'

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

interface ProfileData {
  email?: string
  createdAt?: string
  lastSignIn?: string
}

export default function AccountPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('')
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [profileData, setProfileData] = useState<ProfileData | null>(null)

  useEffect(() => {
    if (user) {
      loadUserProfile()
      loadPreferences()
    }
  }, [user])

  const loadUserProfile = async () => {
    try {
      // Use auth data for now, could be enhanced with API call to /api/user/profile
      setUserName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '')
      setProfileData({
        email: user?.email,
        createdAt: user?.created_at,
        lastSignIn: user?.last_sign_in_at,
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/preferences')
      const data = await response.json()
      
      console.log('Preferences API response:', data)
      
      if (data.success && data.preferences) {
        // Transform real preferences data into categorized format
        const realPreferences = data.preferences
        console.log('Real preferences structure:', realPreferences)
        const transformedPreferences: UserPreferences = {}

        // Movie Preferences
        const moviePrefs: PreferenceItem[] = []
        
        // Handle both old and new field names for genres
        const genres = realPreferences.preferred_genres || realPreferences.genres
        if (genres?.length > 0) {
          moviePrefs.push({
            id: 'genres',
            category: 'Favorite Genres',
            value: genres.join(', '),
            type: 'genre',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        
        // Handle both old and new field names for directors
        const directors = realPreferences.favorite_directors || realPreferences.directors
        if (directors?.length > 0) {
          moviePrefs.push({
            id: 'directors',
            category: 'Favorite Directors',
            value: directors.join(', '),
            type: 'director',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        
        // Handle both old and new field names for actors  
        const actors = realPreferences.favorite_actors || realPreferences.actors
        if (actors?.length > 0) {
          moviePrefs.push({
            id: 'actors',
            category: 'Favorite Actors',
            value: actors.join(', '),
            type: 'actor',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        
        // Add favorite movies if they exist
        const favoriteMovies = realPreferences.favorite_movies
        if (favoriteMovies?.length > 0) {
          moviePrefs.push({
            id: 'favoriteMovies',
            category: 'Favorite Movies',
            value: favoriteMovies.join(', '),
            type: 'movie',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        
        // Viewing Preferences
        const viewingPrefs: PreferenceItem[] = []
        
        // Handle preferred eras
        const preferredEras = realPreferences.preferred_eras
        if (preferredEras?.length > 0) {
          viewingPrefs.push({
            id: 'preferredEras',
            category: 'Preferred Eras',
            value: preferredEras.join(', '),
            type: 'era',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        
        if (realPreferences.yearRange) {
          viewingPrefs.push({
            id: 'yearRange',
            category: 'Preferred Years',
            value: `${realPreferences.yearRange.min} - ${realPreferences.yearRange.max}`,
            type: 'year',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        if (realPreferences.ratingRange) {
          viewingPrefs.push({
            id: 'ratingRange',
            category: 'Preferred Ratings',
            value: `${realPreferences.ratingRange.min}/10 - ${realPreferences.ratingRange.max}/10`,
            type: 'rating',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        if (realPreferences.languages?.length > 0) {
          viewingPrefs.push({
            id: 'languages',
            category: 'Preferred Languages',
            value: realPreferences.languages.join(', '),
            type: 'language',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }

        // Content Preferences
        const contentPrefs: PreferenceItem[] = []
        if (realPreferences.themes?.length > 0) {
          contentPrefs.push({
            id: 'themes',
            category: 'Favorite Themes',
            value: realPreferences.themes.join(', '),
            type: 'theme',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        if (realPreferences.moods?.length > 0) {
          contentPrefs.push({
            id: 'moods',
            category: 'Preferred Moods',
            value: realPreferences.moods.join(', '),
            type: 'mood',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        if (realPreferences.dislikedGenres?.length > 0) {
          contentPrefs.push({
            id: 'dislikedGenres',
            category: 'Genres to Avoid',
            value: realPreferences.dislikedGenres.join(', '),
            type: 'avoid',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }
        
        // Add additional notes if they exist
        if (realPreferences.additional_notes) {
          contentPrefs.push({
            id: 'additionalNotes',
            category: 'Additional Notes',
            value: realPreferences.additional_notes,
            type: 'notes',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }

        // Social Preferences
        const socialPrefs: PreferenceItem[] = []
        if (realPreferences.viewingContexts?.length > 0) {
          socialPrefs.push({
            id: 'viewingContexts',
            category: 'Viewing Contexts',
            value: realPreferences.viewingContexts.join(', '),
            type: 'context',
            learnedAt: data.lastUpdated || new Date().toISOString(),
            source: 'Chat conversation'
          })
        }

        // Set the transformed preferences
        transformedPreferences.moviePreferences = moviePrefs
        transformedPreferences.viewingPreferences = viewingPrefs
        transformedPreferences.contentPreferences = contentPrefs
        transformedPreferences.socialPreferences = socialPrefs

        setPreferences(transformedPreferences)
      } else {
        // No preferences yet - show empty state
        setPreferences({})
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      setPreferences({})
    } finally {
      setLoading(false)
    }
  }

  const handleSaveName = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: userName,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save name')
      }
      
      // Show success message
      alert('Name saved successfully!')
    } catch (error) {
      console.error('Error saving name:', error)
      alert('Failed to save name. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePreference = async (preferenceId: string) => {
    try {
      const response = await fetch(`/api/preferences/${preferenceId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete preference')
      }
      
      // Update local state
      setPreferences(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(category => {
          if (updated[category as keyof UserPreferences]) {
            updated[category as keyof UserPreferences] = updated[category as keyof UserPreferences]!.filter(
              pref => pref.id !== preferenceId
            )
          }
        })
        return updated
      })
    } catch (error) {
      console.error('Error deleting preference:', error)
      // Could be replaced with a toast notification in the future
      alert('Failed to delete preference. Please try again.')
    }
  }

  const handleClearCategory = async (category: string) => {
    if (!window.confirm(`Are you sure you want to clear all ${getCategoryDisplayName(category).toLowerCase()}? This action cannot be undone.`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/preferences/category/${category}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear category')
      }
      
      // Update local state
      setPreferences(prev => ({
        ...prev,
        [category]: []
      }))
    } catch (error) {
      console.error('Error clearing category:', error)
      alert('Failed to clear category. Please try again.')
    }
  }

  const handleClearAllPreferences = async () => {
    if (window.confirm('Are you sure you want to clear all AI-learned preferences? This action cannot be undone.')) {
      try {
        const response = await fetch('/api/preferences', {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          throw new Error('Failed to clear all preferences')
        }
        
        // Update local state
        setPreferences({})
        alert('All preferences have been cleared successfully!')
      } catch (error) {
        console.error('Error clearing all preferences:', error)
        alert('Failed to clear preferences. Please try again.')
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'moviepreferences':
        return '🎭'
      case 'viewingpreferences':
        return '🎯'
      case 'contentpreferences':
        return '🎨'
      case 'socialpreferences':
        return '👥'
      default:
        return '📝'
    }
  }

  const getCategoryDisplayName = (category: string) => {
    switch (category.toLowerCase()) {
      case 'moviepreferences':
        return 'Movie Preferences'
      case 'viewingpreferences':
        return 'Viewing Preferences'
      case 'contentpreferences':
        return 'Content Preferences'
      case 'socialpreferences':
        return 'Social Preferences'
      default:
        return category
    }
  }

  const getTotalPreferences = () => {
    return Object.values(preferences).reduce((total, prefs) => total + (prefs?.length || 0), 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-6" />
        </div>

        {/* Profile Information Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* AI Preferences Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <div className="space-y-2">
                  {[1, 2].map((j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your profile and AI-learned preferences</p>
        </div>
        <Settings className="h-6 w-6 text-gray-400" />
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your basic account information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                />
                <Button 
                  onClick={handleSaveName} 
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                value={profileData?.email || ''} 
                disabled 
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Member Since: {profileData?.createdAt ? formatDate(profileData.createdAt) : 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Last Active: {profileData?.lastSignIn ? formatDateTime(profileData.lastSignIn) : 'Unknown'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI-Learned Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Learned Preferences
          </CardTitle>
          <CardDescription>
            Preferences the AI has learned about you from your interactions ({getTotalPreferences()} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(preferences).map(([category, prefs]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(category)}</span>
                  {getCategoryDisplayName(category)} ({prefs?.length || 0})
                </h3>
                {prefs && prefs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearCategory(category)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              {prefs && prefs.length > 0 ? (
                <div className="space-y-2">
                                     {prefs.map((pref: PreferenceItem) => (
                    <div key={pref.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {pref.category}
                          </Badge>
                          <span className="font-medium">{pref.value}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>Learned: {formatDate(pref.learnedAt)}</span>
                          {pref.source && <span>Source: {pref.source}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePreference(pref.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm italic p-4 text-center bg-gray-50 rounded-lg">
                  No {getCategoryDisplayName(category).toLowerCase()} learned yet
                </div>
              )}
            </div>
          ))}

          {getTotalPreferences() === 0 && (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Preferences Yet</h3>
              <p className="text-gray-500 mb-4">
                Start interacting with movies and the AI will learn your preferences automatically.
              </p>
              <Button asChild>
                <a href="/dashboard/movies">Explore Movies</a>
              </Button>
            </div>
          )}

          {getTotalPreferences() > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleClearAllPreferences}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Preferences
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                This will remove all AI-learned preferences and cannot be undone
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 