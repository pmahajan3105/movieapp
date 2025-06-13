'use client'

import React, { useState } from 'react'
import { Star, Calendar, CheckCircle, X } from 'lucide-react'
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
  isLoading = false,
}: MarkWatchedModalProps) {
  const [rating, setRating] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [hoveredStar, setHoveredStar] = useState<number>(0)

  const handleConfirm = async () => {
    try {
      await onConfirm(rating || undefined, notes || undefined)
      // Reset form
      setRating(0)
      setNotes('')
      onClose()
    } catch (error) {
      console.error('Error marking movie as watched:', error)
    }
  }

  const handleClose = () => {
    // Reset form
    setRating(0)
    setNotes('')
    onClose()
  }

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        handleClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, handleClose])

  if (!movie) return null

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1:
        return 'Not great'
      case 2:
        return 'It was okay'
      case 3:
        return 'Pretty good'
      case 4:
        return 'Really good'
      case 5:
        return 'Amazing!'
      default:
        return ''
    }
  }

  return (
    <>
      {/* Modal Backdrop */}
      {open && (
        <div className="modal modal-open" onClick={handleClose}>
          <div
            className="modal-box relative mx-4 w-full max-w-md"
            role="dialog"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-6 text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                <CheckCircle className="text-success h-6 w-6" />
                <h3 id="modal-title" className="text-xl font-bold">
                  Movies completed
                </h3>
              </div>
              <div className="text-success flex items-center justify-center gap-2 font-semibold">
                <CheckCircle className="h-5 w-5" />
                <span>Mark as Watched</span>
              </div>
            </div>

            {/* Movie Info */}
            <div id="modal-description" className="mb-6 text-center">
              <h4 className="text-base-content mb-2 text-2xl font-bold">{movie.title}</h4>
              {movie.year && (
                <div className="text-base-content/70 flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-lg">{movie.year}</span>
                </div>
              )}
            </div>

            {/* Rating Section */}
            <div className="mb-6">
              <label className="label">
                <span className="label-text text-base-content font-semibold">
                  How would you rate this movie? (Optional)
                </span>
              </label>

              <div className="mb-3 flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className={`btn btn-ghost btn-circle p-2 transition-all duration-200 hover:scale-110 ${
                      star <= (hoveredStar || rating) ? 'text-warning' : 'text-base-300'
                    }`}
                    disabled={isLoading}
                  >
                    <Star
                      className={`h-8 w-8 ${star <= (hoveredStar || rating) ? 'fill-current' : ''}`}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <div className="text-center">
                  <span className="text-base-content/70 text-sm">{getRatingText(rating)}</span>
                  <button
                    type="button"
                    onClick={() => setRating(0)}
                    className="btn btn-ghost btn-xs ml-2 underline"
                    disabled={isLoading}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <label className="label">
                <span className="label-text text-base-content font-semibold">
                  Your thoughts (Optional)
                </span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What did you think about this movie?"
                className="textarea textarea-bordered h-24 w-full resize-none"
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={handleClose} disabled={isLoading} className="btn btn-outline flex-1">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="btn btn-success flex-1 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Mark as Watched
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
