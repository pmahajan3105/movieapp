import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { ConfigService } from '@/lib/config/config-service'
import { logger } from '@/lib/logger'

interface BackupData {
  version: string
  exportedAt: string
  appVersion: string
  profile: {
    name: string
  }
  ratings: Array<{
    movieId: string
    tmdbId?: number
    title: string
    rating?: number
    interested: boolean
    ratedAt: string
  }>
  watchlist: Array<{
    movieId: string
    tmdbId?: number
    title: string
    watched: boolean
    notes?: string
    addedAt: string
  }>
  genrePreferences: Record<string, number>
}

/**
 * GET /api/backup
 * Export all user data as JSON
 */
export async function GET() {
  try {
    logger.info('Starting data export')

    // Get user profile
    const config = ConfigService.getConfig()
    const profile = LocalStorageService.getUserProfile()

    // Get all ratings with movie info
    const ratings = LocalStorageService.getRatings()
    const ratingsWithMovies = ratings.map(r => {
      const movie = LocalStorageService.getMovieById(r.movie_id)
      return {
        movieId: r.movie_id,
        tmdbId: movie?.tmdb_id,
        title: movie?.title || 'Unknown',
        rating: r.rating,
        interested: r.interested,
        ratedAt: r.rated_at,
      }
    })

    // Get watchlist with movie info
    const watchlist = LocalStorageService.getWatchlist()
    const watchlistWithMovies = watchlist.map(w => {
      const movie = LocalStorageService.getMovieById(w.movie_id)
      return {
        movieId: w.movie_id,
        tmdbId: movie?.tmdb_id,
        title: movie?.title || 'Unknown',
        watched: w.watched,
        notes: w.notes,
        addedAt: w.added_at,
      }
    })

    // Get genre preferences
    const genrePrefs = LocalStorageService.getGenrePreferences()
    const genrePreferences: Record<string, number> = {}
    genrePrefs.forEach((value, key) => {
      genrePreferences[key] = value
    })

    const backup: BackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appVersion: '2.0.0',
      profile: {
        name: profile?.name || config.user.name,
      },
      ratings: ratingsWithMovies,
      watchlist: watchlistWithMovies,
      genrePreferences,
    }

    logger.info('Data export completed', {
      ratingsCount: ratingsWithMovies.length,
      watchlistCount: watchlistWithMovies.length,
      genresCount: Object.keys(genrePreferences).length,
    })

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cineai-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    logger.error('Failed to export data', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/backup
 * Import data from backup JSON
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { backup, mode = 'merge' } = body as { backup: BackupData; mode: 'replace' | 'merge' }

    // Validate backup structure
    if (!backup || !backup.version || !backup.ratings || !backup.watchlist) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup format' },
        { status: 400 }
      )
    }

    // Check version compatibility
    if (!backup.version.startsWith('1.')) {
      return NextResponse.json(
        { success: false, error: `Unsupported backup version: ${backup.version}` },
        { status: 400 }
      )
    }

    logger.info('Starting data import', {
      mode,
      ratingsCount: backup.ratings.length,
      watchlistCount: backup.watchlist.length,
    })

    let importedRatings = 0
    let importedWatchlist = 0
    let skippedRatings = 0
    let skippedWatchlist = 0

    // If replace mode, we'd need to clear existing data first
    // For now, merge mode only (safer)
    if (mode === 'replace') {
      // Clear existing ratings and watchlist
      // Note: This would need a clearAll method in LocalStorageService
      logger.warn('Replace mode requested - treating as merge for safety')
    }

    // Import ratings
    for (const rating of backup.ratings) {
      try {
        // Check if movie exists, if not we need the TMDB ID to fetch it
        const movieId = rating.movieId

        // If movie doesn't exist locally, skip (user would need to search for it again)
        // In a full implementation, we'd fetch from TMDB using tmdbId
        const existingMovie = LocalStorageService.getMovieById(movieId)

        if (!existingMovie && rating.tmdbId) {
          // Movie doesn't exist, skip for now
          // Could enhance to fetch from TMDB
          skippedRatings++
          continue
        }

        if (existingMovie) {
          // Check if rating already exists (for merge mode)
          const existingRatings = LocalStorageService.getRatings()
          const alreadyRated = existingRatings.some(r => r.movie_id === movieId)

          if (alreadyRated && mode === 'merge') {
            skippedRatings++
            continue
          }

          LocalStorageService.upsertRating(movieId, {
            rating: rating.rating,
            interested: rating.interested,
          })
          importedRatings++
        } else {
          skippedRatings++
        }
      } catch (err) {
        logger.warn('Failed to import rating', { movieId: rating.movieId })
        skippedRatings++
      }
    }

    // Import watchlist
    for (const item of backup.watchlist) {
      try {
        const movieId = item.movieId

        const existingMovie = LocalStorageService.getMovieById(movieId)

        if (!existingMovie && item.tmdbId) {
          skippedWatchlist++
          continue
        }

        if (existingMovie) {
          // Check if already in watchlist
          const existingWatchlist = LocalStorageService.getWatchlist()
          const alreadyInWatchlist = existingWatchlist.some(w => w.movie_id === movieId)

          if (alreadyInWatchlist && mode === 'merge') {
            skippedWatchlist++
            continue
          }

          LocalStorageService.addToWatchlist(movieId, item.notes)

          if (item.watched) {
            LocalStorageService.markWatched(movieId)
          }

          importedWatchlist++
        } else {
          skippedWatchlist++
        }
      } catch (err) {
        logger.warn('Failed to import watchlist item', { movieId: item.movieId })
        skippedWatchlist++
      }
    }

    // Update profile name if provided
    if (backup.profile?.name) {
      ConfigService.updateUserName(backup.profile.name)
    }

    // Record that a backup/import was done
    ConfigService.recordBackup()

    logger.info('Data import completed', {
      importedRatings,
      importedWatchlist,
      skippedRatings,
      skippedWatchlist,
    })

    return NextResponse.json({
      success: true,
      message: 'Import completed',
      imported: {
        ratings: importedRatings,
        watchlist: importedWatchlist,
      },
      skipped: {
        ratings: skippedRatings,
        watchlist: skippedWatchlist,
      },
    })
  } catch (error) {
    logger.error('Failed to import data', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { success: false, error: 'Failed to import data' },
      { status: 500 }
    )
  }
}
