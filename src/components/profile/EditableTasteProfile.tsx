/**
 * Editable Taste Profile Interface
 * Phase 3: Allows users to view and edit their AI-learned preferences
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Save, Edit3, RotateCcw, Brain, Heart, Eye, Palette, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface TasteProfile {
  user_id: string
  preferences: {
    favorite_genres?: string[]
    visual_style?: string
    pacing_preference?: string
    mood_preferences?: Record<string, number>
    thematic_interests?: string[]
    director_preferences?: string[]
    era_preference?: string
    runtime_preference?: string
  }
  favorite_genres?: string[]
  ai_confidence?: number
  created_at?: string
  updated_at?: string
}

const MOVIE_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'
]

const VISUAL_STYLES = [
  'cinematic_grandeur', 'intimate_handheld', 'stylized_artistic', 
  'naturalistic_realism', 'dark_atmospheric', 'bright_colorful',
  'minimalist_clean', 'gritty_urban', 'epic_sweeping'
]

const PACING_OPTIONS = [
  'slow_contemplative', 'moderate_balanced', 'fast_energetic', 'variable_dynamic'
]

const MOOD_CATEGORIES = [
  'uplifting', 'thoughtful', 'intense', 'relaxing', 'adventurous', 'romantic', 'suspenseful', 'humorous'
]

const THEMATIC_INTERESTS = [
  'human_relationships', 'personal_growth', 'social_justice', 'technology_future',
  'historical_events', 'family_dynamics', 'good_vs_evil', 'identity_self_discovery',
  'love_romance', 'survival_struggle', 'moral_dilemmas', 'coming_of_age'
]

export const EditableTasteProfile: React.FC = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<TasteProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (user) {
      loadTasteProfile()
    }
  }, [user])

  const loadTasteProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/user/ai-profile')
      if (!response.ok) {
        throw new Error('Failed to load taste profile')
      }

      const data = await response.json()
      setProfile(data.profile || createEmptyProfile())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const createEmptyProfile = (): TasteProfile => ({
    user_id: user?.id || '',
    preferences: {
      favorite_genres: [],
      mood_preferences: {}
    },
    favorite_genres: [],
    ai_confidence: 0.2
  })

  const handleSave = async () => {
    if (!profile || !hasChanges) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/user/ai-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: profile.preferences,
          favorite_genres: profile.favorite_genres,
          ai_confidence: profile.ai_confidence
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save taste profile')
      }

      const data = await response.json()
      setProfile(data.profile)
      setHasChanges(false)
      setIsEditing(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleGenreToggle = (genre: string) => {
    if (!profile) return

    const currentGenres = profile.favorite_genres || []
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre]

    setProfile({
      ...profile,
      favorite_genres: newGenres,
      preferences: {
        ...profile.preferences,
        favorite_genres: newGenres
      }
    })
    setHasChanges(true)
  }

  const handlePreferenceChange = (key: string, value: any) => {
    if (!profile) return

    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [key]: value
      }
    })
    setHasChanges(true)
  }

  const handleMoodPreferenceChange = (mood: string, value: number) => {
    if (!profile) return

    const moodPreferences = profile.preferences.mood_preferences || {}
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        mood_preferences: {
          ...moodPreferences,
          [mood]: value / 100 // Convert to 0-1 scale
        }
      }
    })
    setHasChanges(true)
  }

  const resetToDefaults = () => {
    if (!profile) return
    
    setProfile(createEmptyProfile())
    setHasChanges(true)
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-base-content/60">Please log in to edit your taste profile</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary animate-pulse" />
          <h3 className="text-xl font-bold">Loading Taste Profile...</h3>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-full h-20 bg-base-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-error mb-2">Failed to Load Profile</h3>
        <p className="text-base-content/60 mb-4">{error}</p>
        <button onClick={loadTasteProfile} className="btn btn-primary">
          Retry Loading
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <Brain className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Taste Profile Yet</h3>
        <p className="text-base-content/60 mb-4">Rate some movies to help AI learn your preferences</p>
        <button 
          onClick={() => setProfile(createEmptyProfile())}
          className="btn btn-primary"
        >
          Create Profile
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-bold">Your Taste Profile</h3>
          {profile.ai_confidence && (
            <div className="badge badge-primary">
              {(profile.ai_confidence * 100).toFixed(0)}% AI Confidence
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <div className="badge badge-warning">Unsaved changes</div>
          )}
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="btn btn-sm btn-ghost"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setIsEditing(false)
                  setHasChanges(false)
                  loadTasteProfile() // Reload to discard changes
                }}
                className="btn btn-sm btn-ghost"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="btn btn-sm btn-primary"
              >
                {isSaving ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Favorite Genres */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h4 className="card-title flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Favorite Genres
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              {MOVIE_GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => isEditing && handleGenreToggle(genre)}
                  disabled={!isEditing}
                  className={`btn btn-sm justify-start ${
                    profile.favorite_genres?.includes(genre)
                      ? 'btn-primary'
                      : 'btn-outline'
                  } ${!isEditing ? 'cursor-default' : ''}`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {profile.favorite_genres?.length === 0 && (
              <p className="text-sm text-base-content/60 text-center py-4">
                No favorite genres selected yet
              </p>
            )}
          </div>
        </div>

        {/* Visual Style Preference */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h4 className="card-title flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              Visual Style
            </h4>

            <select
              value={profile.preferences.visual_style || ''}
              onChange={(e) => handlePreferenceChange('visual_style', e.target.value)}
              disabled={!isEditing}
              className="select select-bordered w-full"
            >
              <option value="">No preference</option>
              {VISUAL_STYLES.map(style => (
                <option key={style} value={style}>
                  {style.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>

            <div className="divider">Pacing Preference</div>

            <select
              value={profile.preferences.pacing_preference || ''}
              onChange={(e) => handlePreferenceChange('pacing_preference', e.target.value)}
              disabled={!isEditing}
              className="select select-bordered w-full"
            >
              <option value="">No preference</option>
              {PACING_OPTIONS.map(pacing => (
                <option key={pacing} value={pacing}>
                  {pacing.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mood Preferences */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h4 className="card-title flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Mood Preferences
            </h4>

            <div className="space-y-3">
              {MOOD_CATEGORIES.map(mood => (
                <div key={mood} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {mood.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(profile.preferences.mood_preferences?.[mood] || 0.5) * 100}
                      onChange={(e) => handleMoodPreferenceChange(mood, parseInt(e.target.value))}
                      disabled={!isEditing}
                      className="range range-primary range-xs flex-1"
                    />
                    <span className="text-xs w-8 text-right">
                      {Math.round((profile.preferences.mood_preferences?.[mood] || 0.5) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Thematic Interests */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h4 className="card-title flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              Thematic Interests
            </h4>

            <div className="grid grid-cols-1 gap-2">
              {THEMATIC_INTERESTS.map(theme => (
                <button
                  key={theme}
                  onClick={() => {
                    if (!isEditing) return
                    const currentThemes = profile.preferences.thematic_interests || []
                    const newThemes = currentThemes.includes(theme)
                      ? currentThemes.filter(t => t !== theme)
                      : [...currentThemes, theme]
                    handlePreferenceChange('thematic_interests', newThemes)
                  }}
                  disabled={!isEditing}
                  className={`btn btn-sm justify-start ${
                    profile.preferences.thematic_interests?.includes(theme)
                      ? 'btn-secondary'
                      : 'btn-outline'
                  } ${!isEditing ? 'cursor-default' : ''}`}
                >
                  {theme.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Actions */}
      {isEditing && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h4 className="card-title">Profile Actions</h4>
            
            <div className="flex gap-4">
              <button
                onClick={resetToDefaults}
                className="btn btn-warning btn-outline"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All Preferences
              </button>
            </div>

            <div className="alert alert-info">
              <Brain className="w-5 h-5" />
              <div>
                <h5 className="font-semibold">AI Learning Note</h5>
                <p className="text-sm">
                  These preferences help the AI understand your taste better. 
                  The AI will also continue learning from your ratings and interactions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Summary */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h4 className="card-title">Profile Summary</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat">
              <div className="stat-title">Favorite Genres</div>
              <div className="stat-value text-2xl">{profile.favorite_genres?.length || 0}</div>
              <div className="stat-desc">Selected preferences</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">AI Confidence</div>
              <div className="stat-value text-2xl">{((profile.ai_confidence || 0) * 100).toFixed(0)}%</div>
              <div className="stat-desc">Learning progress</div>
            </div>
            
            <div className="stat">
              <div className="stat-title">Last Updated</div>
              <div className="stat-value text-lg">
                {profile.updated_at 
                  ? new Date(profile.updated_at).toLocaleDateString()
                  : 'Never'
                }
              </div>
              <div className="stat-desc">Profile modified</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}