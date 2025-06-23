import React, { useState } from 'react'
import { CheckCircle, Edit3, Trash2, Plus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { PreferenceData } from '@/types/chat'

interface PreferenceConfirmationProps {
  preferences: PreferenceData
  onConfirm: (confirmedPreferences: PreferenceData) => void
  onEdit: () => void
  isLoading?: boolean
}

export const PreferenceConfirmation: React.FC<PreferenceConfirmationProps> = ({
  preferences,
  onConfirm,
  onEdit,
  isLoading = false,
}) => {
  const [editedPreferences, setEditedPreferences] = useState<PreferenceData>(preferences)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')

  const handleAddItem = (section: keyof PreferenceData, value: string) => {
    if (!value.trim()) return

    setEditedPreferences(prev => {
      const updated = { ...prev }

      if (
        section === 'favorite_movies' ||
        section === 'preferred_genres' ||
        section === 'avoid_genres' ||
        section === 'themes' ||
        section === 'preferred_eras' ||
        section === 'favorite_actors' ||
        section === 'favorite_directors'
      ) {
        const currentArray = (updated[section] as string[]) || []
        ;(updated[section] as string[]) = [...currentArray, value]
      }

      return updated
    })

    setNewItem('')
    setEditingSection(null)
  }

  const handleRemoveItem = (section: keyof PreferenceData, index: number) => {
    setEditedPreferences(prev => {
      const updated = { ...prev }

      if (
        section === 'favorite_movies' ||
        section === 'preferred_genres' ||
        section === 'avoid_genres' ||
        section === 'themes' ||
        section === 'preferred_eras' ||
        section === 'favorite_actors' ||
        section === 'favorite_directors'
      ) {
        const currentArray = (updated[section] as string[]) || []
        ;(updated[section] as string[]) = currentArray.filter((_, i) => i !== index)
      }

      return updated
    })
  }

  const renderArraySection = (
    title: string,
    items: string[] | undefined,
    section: keyof PreferenceData,
    color: 'blue' | 'green' | 'red' | 'purple' | 'orange' = 'blue'
  ) => {
    if (!items || items.length === 0) return null

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingSection(section as string)}
            className="text-purple-600 hover:text-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge
              key={index}
              variant="secondary"
              className={`bg-${color}-50 text-${color}-700 border-${color}-200 group hover:bg-${color}-100`}
            >
              {item}
              <button
                onClick={() => handleRemoveItem(section, index)}
                className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {editingSection === section && (
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder={`Add new ${title.toLowerCase()}`}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddItem(section, newItem)
                }
                if (e.key === 'Escape') {
                  setEditingSection(null)
                  setNewItem('')
                }
              }}
              className="flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleAddItem(section, newItem)}
              disabled={!newItem.trim()}
            >
              Add
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl text-gray-900">
          Perfect! I&apos;ve Learned About Your Movie Taste
        </CardTitle>
        <p className="text-gray-600">
          Please review and confirm the preferences I&apos;ve gathered. You can edit any details or
          add more information.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Favorite Movies */}
        {renderArraySection(
          'Favorite Movies',
          editedPreferences.favorite_movies,
          'favorite_movies',
          'purple'
        )}

        {/* Preferred Genres */}
        {renderArraySection(
          'Preferred Genres',
          editedPreferences.preferred_genres,
          'preferred_genres',
          'blue'
        )}

        {/* Avoid Genres */}
        {renderArraySection(
          'Avoid These Genres',
          editedPreferences.avoid_genres,
          'avoid_genres',
          'red'
        )}

        {/* Themes */}
        {renderArraySection('Favorite Themes', editedPreferences.themes, 'themes', 'green')}

        {/* Era Preferences */}
        {renderArraySection(
          'Preferred Eras',
          editedPreferences.preferred_eras,
          'preferred_eras',
          'orange'
        )}

        {/* Favorite People */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            {renderArraySection(
              'Favorite Actors',
              editedPreferences.favorite_actors,
              'favorite_actors',
              'purple'
            )}
          </div>
          <div>
            {renderArraySection(
              'Favorite Directors',
              editedPreferences.favorite_directors,
              'favorite_directors',
              'blue'
            )}
          </div>
        </div>

        {/* Additional Notes */}
        {editedPreferences.additional_notes && (
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="mb-2 font-medium text-gray-900">Additional Notes</h4>
            <p className="text-gray-700">{editedPreferences.additional_notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Continue Chatting
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onConfirm(editedPreferences)}
              disabled={isLoading}
            >
              Add More Later
            </Button>
            <Button
              onClick={() => onConfirm(editedPreferences)}
              disabled={isLoading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  Confirm & Get Recommendations
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Trust Message */}
        <div className="border-t pt-4 text-center text-sm text-gray-500">
          Don&apos;t worry - you can always update your preferences later in your account settings
        </div>
      </CardContent>
    </Card>
  )
}
