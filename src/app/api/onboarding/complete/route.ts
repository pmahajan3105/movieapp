import { NextRequest, NextResponse } from 'next/server'
import { ConfigService } from '@/lib/config/config-service'
import { LocalStorageService } from '@/lib/db'
import { logger } from '@/lib/logger'

interface OnboardingRating {
  tmdb_id: number
  title: string
  rating: 'loved' | 'seen' | 'not_for_me' | 'skip'
  genres: string[]
}

/**
 * POST /api/onboarding/complete
 * Submit taste onboarding ratings and complete onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ratings } = body as { ratings: OnboardingRating[] }

    if (!ratings || !Array.isArray(ratings)) {
      return NextResponse.json(
        { success: false, error: 'Ratings array is required' },
        { status: 400 }
      )
    }

    // Filter out skipped movies
    const actualRatings = ratings.filter(r => r.rating !== 'skip')

    if (actualRatings.length < 10) {
      return NextResponse.json(
        { success: false, error: 'At least 10 ratings are required' },
        { status: 400 }
      )
    }

    logger.info('Processing taste onboarding', {
      totalRatings: actualRatings.length,
      loved: actualRatings.filter(r => r.rating === 'loved').length,
      seen: actualRatings.filter(r => r.rating === 'seen').length,
      notForMe: actualRatings.filter(r => r.rating === 'not_for_me').length,
    })

    // Process each rating
    for (const rating of actualRatings) {
      // First, ensure the movie exists in our local database
      let movie = LocalStorageService.getMovieByTmdbId(rating.tmdb_id)

      if (!movie) {
        // Create a minimal movie record
        movie = LocalStorageService.upsertMovie({
          tmdb_id: rating.tmdb_id,
          title: rating.title,
          genre: rating.genres,
          source: 'onboarding',
        })
      }

      // Map rating type to numeric rating
      let numericRating: number | undefined
      let interested = true

      switch (rating.rating) {
        case 'loved':
          numericRating = 5
          interested = true
          break
        case 'seen':
          numericRating = 3.5
          interested = true
          break
        case 'not_for_me':
          numericRating = undefined // Don't rate, just mark as not interested
          interested = false
          break
      }

      // Save the rating
      // Genre preferences are computed automatically from ratings
      LocalStorageService.upsertRating(movie.id, {
        rating: numericRating,
        interested,
      })
    }

    // Mark onboarding as completed
    ConfigService.completeTasteOnboarding()

    // Get stats after onboarding
    const stats = LocalStorageService.getStats()

    logger.info('Taste onboarding completed', {
      totalRatings: stats.totalRatings,
      genresLearned: LocalStorageService.getGenrePreferences().size,
    })

    return NextResponse.json({
      success: true,
      message: 'Taste onboarding completed',
      stats: {
        ratingsCreated: actualRatings.length,
        totalRatings: stats.totalRatings,
      },
    })
  } catch (error) {
    logger.error('Failed to complete taste onboarding', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { success: false, error: 'Failed to save taste preferences' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/onboarding/complete
 * Check onboarding status
 */
export async function GET() {
  try {
    const setupCompleted = ConfigService.isSetupCompleted()
    const tasteOnboardingCompleted = ConfigService.isTasteOnboardingCompleted()
    const stats = LocalStorageService.getStats()

    return NextResponse.json({
      success: true,
      setupCompleted,
      tasteOnboardingCompleted,
      canSkip: stats.totalRatings >= 5, // Allow skip if user has some ratings
      stats: {
        totalRatings: stats.totalRatings,
        watchlistCount: stats.watchlistCount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to check onboarding status' },
      { status: 500 }
    )
  }
}
