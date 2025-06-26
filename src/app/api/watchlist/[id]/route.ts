import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndErrorHandling, withValidation } from '@/lib/api/factory'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server-client'

const updateSchema = z.object({
  watched: z.boolean().optional(),
  notes: z.string().optional(),
  rating: z.number().optional(),
})

export const PATCH = withAuthAndErrorHandling(async (request: NextRequest, { user }) => {
  const supabase = await createServerClient()
  // Extract watchlist ID from URL path (last segment)
  const watchlistId = request.nextUrl.pathname.split('/').pop() || ''

  const { watched, notes, rating } = await withValidation(request, updateSchema)

  logger.info('Updating watchlist item', {
    watchlistId,
    userId: user.id,
    updates: { watched, notes, rating },
  })

  if (!watchlistId) {
    throw new Error('Watchlist ID is required')
  }

  // First, update without rating to avoid schema cache issues
  const updateData: Record<string, unknown> = {}

  if (typeof watched === 'boolean') {
    updateData.watched = watched
    updateData.watched_at = watched ? new Date().toISOString() : null
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  logger.info('Preparing watchlist update', {
    watchlistId,
    userId: user.id,
    updateFields: Object.keys(updateData),
  })

  const { data, error } = await supabase
    .from('watchlist')
    .update(updateData)
    .eq('id', watchlistId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    logger.dbError('watchlist-update', error, {
      watchlistId,
      userId: user.id,
      errorCode: error.code,
    })
    throw new Error('Failed to update watchlist item')
  }

  // If rating is provided, try to update it using a database function to bypass schema cache
  if (rating !== undefined && typeof rating === 'number') {
    logger.info('Attempting rating update via database function', {
      rating,
      watchlistId,
      userId: user.id,
    })

    try {
      // Use database function to bypass the schema cache issue
      const { data: ratingResult, error: ratingError } = await supabase.rpc(
        'update_watchlist_rating',
        {
          watchlist_id: watchlistId,
          user_id: user.id,
          new_rating: rating,
        }
      )

      if (ratingError) {
        logger.warn('Rating update failed, continuing with main update', {
          watchlistId,
          userId: user.id,
          rating,
          error: ratingError.message,
        })
      } else if (ratingResult) {
        logger.info('Rating updated successfully via database function', {
          watchlistId,
          userId: user.id,
          rating,
        })
      } else {
        logger.warn('Rating update returned false - item not found or not updated', {
          watchlistId,
          userId: user.id,
          rating,
        })
      }
    } catch (ratingErr) {
      logger.warn('Rating update error - non-critical', {
        watchlistId,
        userId: user.id,
        rating,
        error: ratingErr instanceof Error ? ratingErr.message : String(ratingErr),
      })
      // Continue with success since the main update worked
    }
  }

  if (!data) {
    logger.warn('Watchlist item not found for update', {
      watchlistId,
      userId: user.id,
    })
    throw new Error('Watchlist item not found')
  }

  logger.info('Successfully updated watchlist item', {
    watchlistId,
    userId: user.id,
    watched: data.watched,
    watchedAt: data.watched_at,
    hasNotes: !!data.notes,
  })

  return NextResponse.json({ success: true, data })
})

export const DELETE = withAuthAndErrorHandling(async (request: NextRequest, { user }) => {
  const supabase = await createServerClient()
  const watchlistId = request.nextUrl.pathname.split('/').pop() || ''

  logger.info('Deleting watchlist item', {
    watchlistId,
    userId: user.id,
  })

  if (!watchlistId) {
    throw new Error('Watchlist ID is required')
  }

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('id', watchlistId)
    .eq('user_id', user.id)

  if (error) {
    logger.dbError('watchlist-delete', error, {
      watchlistId,
      userId: user.id,
      errorCode: error.code,
    })
    throw new Error('Failed to delete watchlist item')
  }

  logger.info('Successfully deleted watchlist item', {
    watchlistId,
    userId: user.id,
  })

  return NextResponse.json({ success: true, message: 'Watchlist item deleted' })
})
