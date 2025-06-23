import { NextResponse } from 'next/server'
import { requireAuth, withError } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

export const PATCH = withError(
  requireAuth(async ({ request, supabase, user }) => {
    // Extract watchlist ID from URL path (last segment)
    const watchlistId = request.nextUrl.pathname.split('/').pop() || ''

    const body = await request.json()
    const { watched, notes, rating } = body

    logger.info('Updating watchlist item', {
      watchlistId,
      userId: user.id,
      updates: { watched, notes, rating },
    })

    if (!watchlistId) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID is required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { success: false, error: 'Failed to update watchlist item' },
        { status: 500 }
      )
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
      return NextResponse.json(
        { success: false, error: 'Watchlist item not found' },
        { status: 404 }
      )
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
)

export const DELETE = withError(
  requireAuth(async ({ request, supabase, user }) => {
    const watchlistId = request.nextUrl.pathname.split('/').pop() || ''

    logger.info('Deleting watchlist item', {
      watchlistId,
      userId: user.id,
    })

    if (!watchlistId) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID is required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { success: false, error: 'Failed to delete watchlist item' },
        { status: 500 }
      )
    }

    logger.info('Successfully deleted watchlist item', {
      watchlistId,
      userId: user.id,
    })

    return NextResponse.json({ success: true, message: 'Watchlist item deleted' })
  })
)
