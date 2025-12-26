import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/watchlist/[id]
 * Update a specific watchlist item by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: watchlistId } = await params

    if (!watchlistId) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { watched, notes } = body

    logger.info('Updating watchlist item', { watchlistId, watched, notes })

    // Find the watchlist item to get movie_id
    const watchlist = LocalStorageService.getWatchlist()
    const item = watchlist.find(w => w.id === watchlistId)

    if (!item) {
      logger.warn('Watchlist item not found', { watchlistId })
      return NextResponse.json(
        { success: false, error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    let result = null

    // Update watched status if provided
    if (typeof watched === 'boolean') {
      result = LocalStorageService.markWatched(item.movie_id, watched)

      // Record interaction
      LocalStorageService.recordInteraction(
        watched ? 'movie_watched' : 'movie_unwatched',
        item.movie_id
      )
    }

    if (!result) {
      result = LocalStorageService.getWatchlistItem(item.movie_id)
    }

    logger.info('Successfully updated watchlist item', {
      watchlistId,
      watched: result?.watched,
    })

    return NextResponse.json({
      success: true,
      data: result,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/watchlist/[id]',
      method: 'PATCH',
    })
  }
}

/**
 * DELETE /api/watchlist/[id]
 * Delete a specific watchlist item by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: watchlistId } = await params

    if (!watchlistId) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID is required' },
        { status: 400 }
      )
    }

    logger.info('Deleting watchlist item', { watchlistId })

    // Find the watchlist item to get movie_id
    const watchlist = LocalStorageService.getWatchlist()
    const item = watchlist.find(w => w.id === watchlistId)

    if (!item) {
      logger.warn('Watchlist item not found', { watchlistId })
      return NextResponse.json(
        { success: false, error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    // Remove from watchlist
    LocalStorageService.removeFromWatchlist(item.movie_id)

    // Record interaction
    LocalStorageService.recordInteraction('watchlist_remove', item.movie_id)

    logger.info('Successfully deleted watchlist item', { watchlistId, movieId: item.movie_id })

    return NextResponse.json({
      success: true,
      message: 'Watchlist item deleted',
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/watchlist/[id]',
      method: 'DELETE',
    })
  }
}
