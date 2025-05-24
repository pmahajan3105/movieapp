'use client'

import { Button } from '@/components/ui/button'
import type { PreferenceData } from '@/types/chat'

interface PreferenceSummaryProps {
  preferences: PreferenceData
  onContinue?: () => void
  onEdit?: () => void
}

export function PreferenceSummary({ preferences, onContinue, onEdit }: PreferenceSummaryProps) {
  const hasPreferences = Object.keys(preferences).some(key => {
    const value = preferences[key as keyof PreferenceData]
    return Array.isArray(value) ? value.length > 0 : value
  })

  if (!hasPreferences) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <span className="text-xl text-yellow-600">⚠️</span>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No preferences detected</h3>
          <p className="mb-4 text-gray-600">
            Continue chatting to help me understand your movie taste better.
          </p>
          <Button onClick={onEdit} variant="outline">
            Continue Conversation
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <span className="text-lg text-green-600">✅</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Movie Preferences</h3>
          <p className="text-sm text-gray-600">
            Based on our conversation, here&apos;s what I learned about your taste
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Favorite Movies */}
        {preferences.favorite_movies && preferences.favorite_movies.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Favorite Movies</h4>
            <div className="flex flex-wrap gap-2">
              {preferences.favorite_movies.map((movie, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {movie}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Genres */}
        {preferences.preferred_genres && preferences.preferred_genres.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Preferred Genres</h4>
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_genres.map((genre, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Themes */}
        {preferences.themes && preferences.themes.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Themes You Enjoy</h4>
            <div className="flex flex-wrap gap-2">
              {preferences.themes.map((theme, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Avoid Genres */}
        {preferences.avoid_genres && preferences.avoid_genres.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Genres to Avoid</h4>
            <div className="flex flex-wrap gap-2">
              {preferences.avoid_genres.map((genre, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm text-red-800"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Eras */}
        {preferences.preferred_eras && preferences.preferred_eras.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Preferred Time Periods</h4>
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_eras.map((era, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800"
                >
                  {era}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Actors */}
        {preferences.favorite_actors && preferences.favorite_actors.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Favorite Actors</h4>
            <div className="flex flex-wrap gap-2">
              {preferences.favorite_actors.map((actor, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800"
                >
                  {actor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Directors */}
        {preferences.favorite_directors && preferences.favorite_directors.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Favorite Directors</h4>
            <div className="flex flex-wrap gap-2">
              {preferences.favorite_directors.map((director, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-pink-100 px-3 py-1 text-sm text-pink-800"
                >
                  {director}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mood Preferences */}
        {preferences.mood_preferences && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-900">Mood Preferences</h4>
            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              {preferences.mood_preferences.default && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Default mood:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preferences.mood_preferences.default}
                  </span>
                </div>
              )}
              {preferences.mood_preferences.relaxing && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">For relaxing:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preferences.mood_preferences.relaxing}
                  </span>
                </div>
              )}
              {preferences.mood_preferences.energizing && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">For energy:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preferences.mood_preferences.energizing}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Viewing Context */}
        {preferences.viewing_context && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-900">Viewing Preferences</h4>
            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              {typeof preferences.viewing_context.solo === 'boolean' && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Solo watching:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preferences.viewing_context.solo ? 'Enjoys' : 'Prefers not to'}
                  </span>
                </div>
              )}
              {typeof preferences.viewing_context.social === 'boolean' && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Social watching:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preferences.viewing_context.social ? 'Enjoys' : 'Prefers not to'}
                  </span>
                </div>
              )}
              {preferences.viewing_context.weekend && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Weekend preference:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preferences.viewing_context.weekend}
                  </span>
                </div>
              )}
              {preferences.viewing_context.weekday && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Weekday preference:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preferences.viewing_context.weekday}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {preferences.additional_notes && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-900">Additional Notes</h4>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700">{preferences.additional_notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onContinue} className="flex-1">
          Start Discovering Movies
        </Button>
        <Button onClick={onEdit} variant="outline" className="flex-1 sm:flex-none">
          Refine Preferences
        </Button>
      </div>
    </div>
  )
}
