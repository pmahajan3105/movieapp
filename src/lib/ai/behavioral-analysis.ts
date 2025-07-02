import { createClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'
import { logger } from '@/lib/logger'
// import { movieMemoryService } from '@/lib/mem0/client' // Disabled - package removed

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface RatingPattern {
  movie: Movie
  rating: number
  rated_at: string
  genre_match: string[]
  director_match: string[]
  themes: string[]
}

export interface WatchlistPattern {
  movie: Movie
  added_at: string
  watched_at?: string
  time_to_watch_days?: number
  completion_status: 'watched' | 'abandoned' | 'pending'
  genre: string[]
}

export interface UserBehaviorProfile {
  rating_patterns: {
    five_star_movies: RatingPattern[]
    four_star_movies: RatingPattern[]
    three_star_movies: RatingPattern[]
    two_star_movies: RatingPattern[]
    one_star_movies: RatingPattern[]
    genre_rating_averages: Map<string, number>
    director_rating_averages: Map<string, number>
    rating_distribution: Map<number, number>
    average_rating: number
    total_ratings: number
  }

  watchlist_patterns: {
    completion_rate: number
    genre_completion_rates: Map<string, number>
    average_time_to_watch: number
    impulse_watches: WatchlistPattern[] // Watched within 48 hours
    abandoned_movies: WatchlistPattern[] // Added >30 days ago, never watched
    pending_movies: WatchlistPattern[] // Recently added, not watched yet
    genre_add_vs_watch_patterns: Map<string, { added: number; watched: number }>
  }

  temporal_patterns: {
    weekend_genres: string[]
    weekday_genres: string[]
    recent_viewing_velocity: number // Movies per week
    seasonal_preferences: Map<string, string[]>
    preferred_viewing_contexts: string[]
  }

  intelligence_insights: {
    taste_consistency_score: number // How predictable their tastes are
    exploration_vs_comfort_ratio: number // New vs familiar content
    genre_loyalty_scores: Map<string, number>
    director_loyalty_scores: Map<string, number>
    quality_threshold: number // Minimum rating they typically enjoy
  }
}

/**
 * Analyze user's rating patterns to understand their taste preferences
 */
export async function analyzeRatingPatterns(
  userId: string
): Promise<UserBehaviorProfile['rating_patterns']> {
  try {
    logger.info('Analyzing rating patterns for user', { userId })

    // Get all rated movies (using ratings table instead of non-existent watchlist.rating)
    const { data: ratedMovies, error } = await supabase
      .from('ratings')
      .select(
        `
        rating,
        created_at,
        movies (
          id, title, year, genre, director, rating, plot, poster_url, runtime, created_at
        )
      `
      )
      .eq('user_id', userId)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!ratedMovies || ratedMovies.length === 0) {
      return createEmptyRatingPatterns()
    }

    // Process ratings into patterns
    const ratingPatterns: RatingPattern[] = ratedMovies.map(item => ({
      movie: item.movies as unknown as Movie,
      rating: item.rating!,
      rated_at: item.created_at!,
      genre_match: (item.movies as unknown as Movie).genre || [],
      director_match: (item.movies as unknown as Movie).director || [],
      themes: extractThemes(item.movies as unknown as Movie),
    }))

    // Group by rating
    const fiveStarMovies = ratingPatterns.filter(p => p.rating === 5)
    const fourStarMovies = ratingPatterns.filter(p => p.rating === 4)
    const threeStarMovies = ratingPatterns.filter(p => p.rating === 3)
    const twoStarMovies = ratingPatterns.filter(p => p.rating === 2)
    const oneStarMovies = ratingPatterns.filter(p => p.rating === 1)

    // Calculate genre rating averages
    const genreRatings = new Map<string, number[]>()
    ratingPatterns.forEach(pattern => {
      pattern.genre_match.forEach(genre => {
        if (!genreRatings.has(genre)) {
          genreRatings.set(genre, [])
        }
        genreRatings.get(genre)!.push(pattern.rating)
      })
    })

    const genreRatingAverages = new Map<string, number>()
    genreRatings.forEach((ratings, genre) => {
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      genreRatingAverages.set(genre, Math.round(average * 100) / 100)
    })

    // Calculate director rating averages
    const directorRatings = new Map<string, number[]>()
    ratingPatterns.forEach(pattern => {
      pattern.director_match.forEach(director => {
        if (!directorRatings.has(director)) {
          directorRatings.set(director, [])
        }
        directorRatings.get(director)!.push(pattern.rating)
      })
    })

    const directorRatingAverages = new Map<string, number>()
    directorRatings.forEach((ratings, director) => {
      if (ratings.length >= 2) {
        // Only include directors with 2+ rated movies
        const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        directorRatingAverages.set(director, Math.round(average * 100) / 100)
      }
    })

    // Calculate rating distribution
    const ratingDistribution = new Map<number, number>()
    for (let i = 1; i <= 5; i++) {
      const count = ratingPatterns.filter(p => p.rating === i).length
      ratingDistribution.set(i, count)
    }

    const totalRatings = ratingPatterns.length
    const averageRating = ratingPatterns.reduce((sum, p) => sum + p.rating, 0) / totalRatings

    logger.info('Rating analysis complete', {
      totalRatings,
      averageRating: Math.round(averageRating * 100) / 100,
      fiveStars: fiveStarMovies.length,
      genres: genreRatingAverages.size,
      directors: directorRatingAverages.size,
    })

    return {
      five_star_movies: fiveStarMovies,
      four_star_movies: fourStarMovies,
      three_star_movies: threeStarMovies,
      two_star_movies: twoStarMovies,
      one_star_movies: oneStarMovies,
      genre_rating_averages: genreRatingAverages,
      director_rating_averages: directorRatingAverages,
      rating_distribution: ratingDistribution,
      average_rating: Math.round(averageRating * 100) / 100,
      total_ratings: totalRatings,
    }
  } catch (error) {
    logger.warn('No rating data to analyze', { error })
    return createEmptyRatingPatterns()
  }
}

/**
 * Analyze user's watchlist behavior patterns
 */
export async function analyzeWatchlistBehavior(
  userId: string
): Promise<UserBehaviorProfile['watchlist_patterns']> {
  try {
    logger.info('Analyzing watchlist behavior for user', { userId })

    // Get all watchlist items
    const { data: watchlistItems, error } = await supabase
      .from('watchlist')
      .select(
        `
        added_at,
        watched,
        watched_at,
        movies (
          id, title, year, genre, director, rating, plot, poster_url, runtime, created_at
        )
      `
      )
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (error) throw error
    if (!watchlistItems || watchlistItems.length === 0) {
      return createEmptyWatchlistPatterns()
    }

    // Process into watchlist patterns
    const now = new Date()
    const watchlistPatterns: WatchlistPattern[] = watchlistItems.map(item => {
      const addedAt = new Date(item.added_at)
      const watchedAt = item.watched_at ? new Date(item.watched_at) : undefined

      let timeToWatchDays: number | undefined
      let completionStatus: 'watched' | 'abandoned' | 'pending'

      if (item.watched && watchedAt) {
        timeToWatchDays = Math.round(
          (watchedAt.getTime() - addedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        completionStatus = 'watched'
      } else {
        const daysSinceAdded = Math.round(
          (now.getTime() - addedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        completionStatus = daysSinceAdded > 30 ? 'abandoned' : 'pending'
      }

      return {
        movie: item.movies as unknown as Movie,
        added_at: item.added_at,
        watched_at: item.watched_at || undefined,
        time_to_watch_days: timeToWatchDays,
        completion_status: completionStatus,
        genre: (item.movies as unknown as Movie).genre || [],
      }
    })

    // Calculate completion rate
    const totalItems = watchlistPatterns.length
    const watchedItems = watchlistPatterns.filter(p => p.completion_status === 'watched')
    const completionRate = totalItems > 0 ? Math.round((watchedItems.length / totalItems) * 100) : 0

    // Calculate genre completion rates
    const genreStats = new Map<string, { added: number; watched: number }>()
    watchlistPatterns.forEach(pattern => {
      pattern.genre.forEach(genre => {
        if (!genreStats.has(genre)) {
          genreStats.set(genre, { added: 0, watched: 0 })
        }
        genreStats.get(genre)!.added++
        if (pattern.completion_status === 'watched') {
          genreStats.get(genre)!.watched++
        }
      })
    })

    const genreCompletionRates = new Map<string, number>()
    genreStats.forEach((stats, genre) => {
      if (stats.added >= 3) {
        // Only calculate for genres with 3+ movies
        const rate = Math.round((stats.watched / stats.added) * 100)
        genreCompletionRates.set(genre, rate)
      }
    })

    // Identify impulse watches (watched within 48 hours)
    const impulseWatches = watchedItems.filter(
      p => p.time_to_watch_days !== undefined && p.time_to_watch_days <= 2
    )

    // Identify abandoned movies (added >30 days ago, never watched)
    const abandonedMovies = watchlistPatterns.filter(p => p.completion_status === 'abandoned')

    // Identify pending movies (recently added, not watched yet)
    const pendingMovies = watchlistPatterns.filter(p => p.completion_status === 'pending')

    // Calculate average time to watch
    const timesToWatch = watchedItems
      .map(p => p.time_to_watch_days)
      .filter(days => days !== undefined) as number[]

    const averageTimeToWatch =
      timesToWatch.length > 0
        ? Math.round(timesToWatch.reduce((sum, days) => sum + days, 0) / timesToWatch.length)
        : 0

    logger.info('Watchlist analysis complete', {
      totalItems,
      completionRate: `${completionRate}%`,
      impulseWatches: impulseWatches.length,
      abandoned: abandonedMovies.length,
      pending: pendingMovies.length,
      avgTimeToWatch: `${averageTimeToWatch} days`,
    })

    return {
      completion_rate: completionRate,
      genre_completion_rates: genreCompletionRates,
      average_time_to_watch: averageTimeToWatch,
      impulse_watches: impulseWatches,
      abandoned_movies: abandonedMovies,
      pending_movies: pendingMovies,
      genre_add_vs_watch_patterns: genreStats,
    }
  } catch (error) {
    logger.warn('No watchlist data to analyze', { error })
    return createEmptyWatchlistPatterns()
  }
}

/**
 * Analyze temporal viewing patterns
 */
export async function analyzeTemporalPatterns(
  userId: string
): Promise<UserBehaviorProfile['temporal_patterns']> {
  try {
    logger.info('Analyzing temporal patterns for user', { userId })

    // Get watched movies with timestamps
    const { data: watchedMovies, error } = await supabase
      .from('watchlist')
      .select(
        `
        watched_at,
        movies (
          id, title, year, genre, director, rating, plot, poster_url, runtime
        )
      `
      )
      .eq('user_id', userId)
      .eq('watched', true)
      .not('watched_at', 'is', null)
      .order('watched_at', { ascending: false })

    if (error) throw error
    if (!watchedMovies || watchedMovies.length === 0) {
      return createEmptyTemporalPatterns()
    }

    // Analyze weekend vs weekday preferences
    const weekendGenres: string[] = []
    const weekdayGenres: string[] = []

    watchedMovies.forEach(item => {
      const watchedDate = new Date(item.watched_at!)
      const dayOfWeek = watchedDate.getDay() // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const genres = (item.movies as unknown as Movie).genre || []

      if (isWeekend) {
        weekendGenres.push(...genres)
      } else {
        weekdayGenres.push(...genres)
      }
    })

    // Calculate recent viewing velocity (movies per week in last 4 weeks)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const recentMovies = watchedMovies.filter(item => new Date(item.watched_at!) >= fourWeeksAgo)
    const recentViewingVelocity = Math.round((recentMovies.length / 4) * 100) / 100

    // Analyze seasonal preferences (by month)
    const seasonalPreferences = new Map<string, string[]>()
    watchedMovies.forEach(item => {
      const watchedDate = new Date(item.watched_at!)
      const month = watchedDate.toLocaleDateString('en-US', { month: 'long' })
      const genres = (item.movies as unknown as Movie).genre || []

      if (!seasonalPreferences.has(month)) {
        seasonalPreferences.set(month, [])
      }
      seasonalPreferences.get(month)!.push(...genres)
    })

    logger.info('Temporal analysis complete', {
      totalWatched: watchedMovies.length,
      weekendMovies: weekendGenres.length,
      weekdayMovies: weekdayGenres.length,
      recentVelocity: `${recentViewingVelocity} movies/week`,
      seasonalMonths: seasonalPreferences.size,
    })

    return {
      weekend_genres: getTopGenres(weekendGenres),
      weekday_genres: getTopGenres(weekdayGenres),
      recent_viewing_velocity: recentViewingVelocity,
      seasonal_preferences: seasonalPreferences,
      preferred_viewing_contexts: inferViewingContexts(weekendGenres, weekdayGenres),
    }
  } catch (error) {
    logger.warn('No temporal data to analyze', { error })
    return createEmptyTemporalPatterns()
  }
}

/**
 * Generate intelligence insights from behavioral data
 */

export async function generateIntelligenceInsights(
  ratingPatterns: UserBehaviorProfile['rating_patterns'],
  watchlistPatterns: UserBehaviorProfile['watchlist_patterns'],
  temporalPatterns: UserBehaviorProfile['temporal_patterns']
): Promise<UserBehaviorProfile['intelligence_insights']> {
  // Use the parameters to avoid linting errors (they're reserved for future enhancement)
  void watchlistPatterns
  void temporalPatterns

  // Calculate taste consistency score (higher = more predictable tastes)
  const ratingVariance = calculateRatingVariance(ratingPatterns.rating_distribution)
  const tasteConsistencyScore = Math.max(0, Math.min(1, (5 - ratingVariance) / 5))

  // Calculate exploration vs comfort ratio
  const totalRatings = ratingPatterns.total_ratings
  const highRatings =
    ratingPatterns.five_star_movies.length + ratingPatterns.four_star_movies.length
  const explorationVsComfortRatio =
    totalRatings > 0 ? Math.round((highRatings / totalRatings) * 100) / 100 : 0.5

  // Calculate genre loyalty scores
  const genreLoyaltyScores = new Map<string, number>()
  ratingPatterns.genre_rating_averages.forEach((avgRating, genre) => {
    if (avgRating >= 4.0) {
      genreLoyaltyScores.set(genre, avgRating)
    }
  })

  // Calculate director loyalty scores
  const directorLoyaltyScores = new Map<string, number>()
  ratingPatterns.director_rating_averages.forEach((avgRating, director) => {
    if (avgRating >= 4.0) {
      directorLoyaltyScores.set(director, avgRating)
    }
  })

  // Calculate quality threshold (lowest rating they typically enjoy)
  const qualityThreshold =
    ratingPatterns.average_rating > 0 ? ratingPatterns.average_rating - 0.5 : 3.0

  return {
    taste_consistency_score: Math.round(tasteConsistencyScore * 100) / 100,
    exploration_vs_comfort_ratio: explorationVsComfortRatio,
    genre_loyalty_scores: genreLoyaltyScores,
    director_loyalty_scores: directorLoyaltyScores,
    quality_threshold: Math.max(1, Math.min(5, qualityThreshold)),
  }
}

/**
 * Store behavioral insights in Mem0 for semantic access
 */
export async function storeBehavioralInsightsInMem0(
  userId: string,
  profile: UserBehaviorProfile
): Promise<void> {
  try {
    const insights: string[] = []

    // Rating insights
    if (profile.rating_patterns.five_star_movies.length > 0) {
      const topGenres = getTopGenresFromMovies(profile.rating_patterns.five_star_movies)
      const topDirectors = getTopDirectorsFromMovies(profile.rating_patterns.five_star_movies)

      insights.push(
        `User LOVES these movies (5-star ratings): ${profile.rating_patterns.five_star_movies
          .map(p => p.movie.title)
          .slice(0, 5)
          .join(', ')}`
      )

      if (topGenres.length > 0) {
        insights.push(
          `User's highest-rated genres: ${topGenres.join(', ')} (average rating ${profile.rating_patterns.average_rating}/5)`
        )
      }

      if (topDirectors.length > 0) {
        insights.push(`User consistently rates these directors highly: ${topDirectors.join(', ')}`)
      }
    }

    // Watchlist behavior insights
    if (profile.watchlist_patterns.completion_rate > 0) {
      insights.push(
        `User has ${profile.watchlist_patterns.completion_rate}% watchlist completion rate`
      )

      if (profile.watchlist_patterns.impulse_watches.length > 0) {
        const impulseGenres = getTopGenresFromWatchlist(profile.watchlist_patterns.impulse_watches)
        insights.push(`User watches these genres immediately: ${impulseGenres.join(', ')}`)
      }

      if (profile.watchlist_patterns.abandoned_movies.length > 0) {
        const abandonedGenres = getTopGenresFromWatchlist(
          profile.watchlist_patterns.abandoned_movies
        )
        insights.push(`User tends to add but not watch: ${abandonedGenres.join(', ')}`)
      }
    }

    // Temporal insights
    if (profile.temporal_patterns.weekend_genres.length > 0) {
      insights.push(
        `User prefers these genres on weekends: ${profile.temporal_patterns.weekend_genres.join(', ')}`
      )
    }

    if (profile.temporal_patterns.weekday_genres.length > 0) {
      insights.push(
        `User prefers these genres on weekdays: ${profile.temporal_patterns.weekday_genres.join(', ')}`
      )
    }

    // Intelligence insights
    insights.push(
      `User's taste consistency score: ${profile.intelligence_insights.taste_consistency_score} (${profile.intelligence_insights.taste_consistency_score > 0.7 ? 'very consistent' : 'diverse'} tastes)`
    )
    insights.push(
      `User's quality threshold: ${profile.intelligence_insights.quality_threshold}/5 stars`
    )

    // Store each insight as a behavioral memory - DISABLED (mem0 package removed)
    // for (const insight of insights) {
    //   await movieMemoryService.addConversation(
    //     [{ role: 'assistant', content: insight }] as any,
    //     userId,
    //     {
    //       category: 'behavioral_intelligence',
    //       confidence: 0.9,
    //       source: 'behavioral_analysis',
    //       timestamp: Math.floor(Date.now() / 1000) // Unix timestamp in seconds
    //     }
    //   )
    // }

    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Generated behavioral insights (mem0 storage disabled)`, { insightCount: insights.length })
    }
  } catch (error) {
    logger.error('Error storing behavioral insights in Mem0', { error })
  }
}

/**
 * Main function to analyze all user behavior and store insights
 */
export async function analyzeCompleteUserBehavior(userId: string): Promise<UserBehaviorProfile> {
  logger.info('Starting complete behavioral analysis for user', { userId })

  const [ratingPatterns, watchlistPatterns, temporalPatterns] = await Promise.all([
    analyzeRatingPatterns(userId),
    analyzeWatchlistBehavior(userId),
    analyzeTemporalPatterns(userId),
  ])

  const intelligenceInsights = await generateIntelligenceInsights(
    ratingPatterns,
    watchlistPatterns,
    temporalPatterns
  )

  const completeProfile: UserBehaviorProfile = {
    rating_patterns: ratingPatterns,
    watchlist_patterns: watchlistPatterns,
    temporal_patterns: temporalPatterns,
    intelligence_insights: intelligenceInsights,
  }

  // Store insights in Mem0 for semantic access - DISABLED (mem0 package removed)
  // await storeBehavioralInsightsInMem0(userId, completeProfile)

  logger.info('Complete behavioral analysis finished')
  return completeProfile
}

// Helper functions
function createEmptyRatingPatterns(): UserBehaviorProfile['rating_patterns'] {
  return {
    five_star_movies: [],
    four_star_movies: [],
    three_star_movies: [],
    two_star_movies: [],
    one_star_movies: [],
    genre_rating_averages: new Map(),
    director_rating_averages: new Map(),
    rating_distribution: new Map(),
    average_rating: 0,
    total_ratings: 0,
  }
}

function createEmptyWatchlistPatterns(): UserBehaviorProfile['watchlist_patterns'] {
  return {
    completion_rate: 0,
    genre_completion_rates: new Map(),
    average_time_to_watch: 0,
    impulse_watches: [],
    abandoned_movies: [],
    pending_movies: [],
    genre_add_vs_watch_patterns: new Map(),
  }
}

function createEmptyTemporalPatterns(): UserBehaviorProfile['temporal_patterns'] {
  return {
    weekend_genres: [],
    weekday_genres: [],
    recent_viewing_velocity: 0,
    seasonal_preferences: new Map(),
    preferred_viewing_contexts: [],
  }
}

function extractThemes(movie: Movie): string[] {
  // Extract themes from plot/genre - simple implementation
  const themes: string[] = []
  const plot = movie.plot?.toLowerCase() || ''

  if (plot.includes('love') || plot.includes('romance')) themes.push('romance')
  if (plot.includes('war') || plot.includes('battle')) themes.push('war')
  if (plot.includes('family') || plot.includes('father') || plot.includes('mother'))
    themes.push('family')
  if (plot.includes('revenge') || plot.includes('vengeance')) themes.push('revenge')
  if (plot.includes('friendship') || plot.includes('friend')) themes.push('friendship')
  if (plot.includes('betrayal') || plot.includes('betray')) themes.push('betrayal')
  if (plot.includes('journey') || plot.includes('adventure')) themes.push('journey')
  if (plot.includes('survival') || plot.includes('survive')) themes.push('survival')

  return themes
}

function getTopGenres(genres: string[]): string[] {
  const genreCounts = new Map<string, number>()
  genres.forEach(genre => {
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
  })

  return Array.from(genreCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre]) => genre)
}

function getTopGenresFromMovies(patterns: RatingPattern[]): string[] {
  const allGenres = patterns.flatMap(p => p.genre_match)
  return getTopGenres(allGenres)
}

function getTopDirectorsFromMovies(patterns: RatingPattern[]): string[] {
  const allDirectors = patterns.flatMap(p => p.director_match)
  const directorCounts = new Map<string, number>()

  allDirectors.forEach(director => {
    directorCounts.set(director, (directorCounts.get(director) || 0) + 1)
  })

  return Array.from(directorCounts.entries())
    .filter(([, count]) => count >= 2) // Only directors with 2+ movies
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([director]) => director)
}

function getTopGenresFromWatchlist(patterns: WatchlistPattern[]): string[] {
  const allGenres = patterns.flatMap(p => p.genre)
  return getTopGenres(allGenres)
}

function inferViewingContexts(weekendGenres: string[], weekdayGenres: string[]): string[] {
  const contexts: string[] = []

  if (weekendGenres.includes('Action') || weekendGenres.includes('Adventure')) {
    contexts.push('Weekend excitement seeker')
  }

  if (weekdayGenres.includes('Comedy') || weekdayGenres.includes('Romance')) {
    contexts.push('Weekday relaxation')
  }

  if (weekendGenres.includes('Drama') || weekendGenres.includes('Thriller')) {
    contexts.push('Weekend deep viewing')
  }

  return contexts
}

function calculateRatingVariance(ratingDistribution: Map<number, number>): number {
  const total = Array.from(ratingDistribution.values()).reduce((sum, count) => sum + count, 0)
  if (total === 0) return 0

  const mean =
    Array.from(ratingDistribution.entries()).reduce(
      (sum, [rating, count]) => sum + rating * count,
      0
    ) / total

  const variance =
    Array.from(ratingDistribution.entries()).reduce(
      (sum, [rating, count]) => sum + count * Math.pow(rating - mean, 2),
      0
    ) / total

  return Math.sqrt(variance)
}

/**
 * Lightweight structure focused on genre affinity by hour & weekday.
 * This is used by PersonalizedRecommender to boost scores.
 */
export interface TemporalPreferencesLite {
  timeOfDay: Record<
    number,
    {
      preferredGenres: string[]
      confidence: number // 0-1 based on sample size
    }
  >
  dayOfWeek: Record<
    number,
    {
      preferredGenres: string[]
      watchCount: number
    }
  >
}

/**
 * Analyze the last N interactions and derive simple genre affinity per hour/day.
 * We purposefully keep calculations cheap – only last 90 days, max 200 rows.
 */
export async function analyzeTemporalGenreAffinity(
  userId: string,
  limit = 200
): Promise<TemporalPreferencesLite> {
  // Query user_interactions joined with movies to get genre_ids.
  const { data, error } = await supabase
    .from('user_interactions')
    .select(
      `time_of_day, day_of_week, interaction_type, movies:movie_id ( genre_ids )`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return { timeOfDay: {}, dayOfWeek: {} }
  }

  // Helpers to accumulate counts
  const hourlyGenreCount: Record<number, Record<string, number>> = {}
  const weekdayGenreCount: Record<number, Record<string, number>> = {}

  data.forEach((row: any) => {
    const movieObj: any = (row as any).movies || {}
    const genres: number[] = Array.isArray(movieObj.genre_ids) ? movieObj.genre_ids : []
    if (genres.length === 0) return

    const rowAny: any = row
     
    const hour =
      typeof rowAny.time_of_day === 'number'
        ? rowAny.time_of_day
        : new Date(rowAny.created_at ?? Date.now()).getHours()
     
    const dow =
      typeof rowAny.day_of_week === 'number'
        ? rowAny.day_of_week
        : new Date(rowAny.created_at ?? Date.now()).getDay()

    hourlyGenreCount[hour] = hourlyGenreCount[hour] || {}
    weekdayGenreCount[dow] = weekdayGenreCount[dow] || {}

    const hourMap = hourlyGenreCount[hour]!
    const dayMap = weekdayGenreCount[dow]!

    genres.forEach((g) => {
      const gn = `${g}`
      hourMap[gn] = (hourMap[gn] || 0) + 1
      dayMap[gn] = (dayMap[gn] || 0) + 1
    })
  })

  // Convert counts → sorted arrays + confidence
  const timeOfDay: TemporalPreferencesLite['timeOfDay'] = {}
  Object.entries(hourlyGenreCount).forEach(([h, counts]) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g)
    timeOfDay[Number(h)] = {
      preferredGenres: sorted,
      confidence: Math.min(1, total / 10),
    }
  })

  const dayOfWeek: TemporalPreferencesLite['dayOfWeek'] = {}
  Object.entries(weekdayGenreCount).forEach(([d, counts]) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g)
    dayOfWeek[Number(d)] = {
      preferredGenres: sorted,
      watchCount: total,
    }
  })

  return { timeOfDay, dayOfWeek }
}
