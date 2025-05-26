'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Star, Calendar, CheckCircle } from 'lucide-react'
import type { Movie } from '@/types'

interface MarkWatchedModalProps {
  movie: Movie | null
  open: boolean
  onClose: () => void
  onConfirm: (rating?: number, notes?: string) => Promise<void>
  isLoading?: boolean
}

export function MarkWatchedModal({
  movie,
  open,
  onClose,
  onConfirm,
  isLoading = false
}: MarkWatchedModalProps) {
  const [rating, setRating] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [hoveredStar, setHoveredStar] = useState<number>(0)

  const handleConfirm = async () => {
    await onConfirm(rating || undefined, notes || undefined)
    // Reset form
    setRating(0)
    setNotes('')
    onClose()
  }

  const handleClose = () => {
    // Reset form
    setRating(0)
    setNotes('')
    onClose()
  }

  if (!movie) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Mark as Watched
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Movie Info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {movie.title}
            </h3>
            {movie.year && (
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                <Calendar className="h-3 w-3" />
                {movie.year}
              </div>
            )}
          </div>

          {/* Rating Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              How would you rate this movie? (Optional)
            </label>
            
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-colors p-1"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredStar || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="text-center">
                <span className="text-sm text-gray-600">
                  {rating === 1 && "Not great"}
                  {rating === 2 && "It was okay"}
                  {rating === 3 && "Pretty good"}
                  {rating === 4 && "Really good"}
                  {rating === 5 && "Amazing!"}
                </span>
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="ml-2 text-xs text-gray-500 underline hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Your thoughts (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you think about this movie?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Mark as Watched
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 