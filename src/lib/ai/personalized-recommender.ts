import { SmartRecommenderV2, SmartRecommendationOptions, SmartRecommendationResult } from './smart-recommender-v2'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env'
import type { Movie } from '@/types'
import { logger } from '../logger'
import { analyzeTemporalGenreAffinity, TemporalPreferencesLite } from './behavioral-analysis'
import { RECOMMENDER_BOOSTS } from '@/lib/constants/recommender'

interface GenreAffinityMap {
  [genreId: number]: number
}

// Adjust confidence scaling constants (centralised)
const { GENRE_MAX: GENRE_BOOST_MAX, TEMPORAL_MAX: TEMPORAL_BOOST_MAX, MEMORY_MAX: MEMORY_BOOST_MAX } = RECOMMENDER_BOOSTS

export class PersonalizedRecommender extends SmartRecommenderV2 {
  private static _singleton: PersonalizedRecommender

  public static override getInstance(): PersonalizedRecommender {
    if (!PersonalizedRecommender._singleton) {
      PersonalizedRecommender._singleton = new PersonalizedRecommender()
    }
    return PersonalizedRecommender._singleton
  }

  private supabase = createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!)

  /**
   * Return recommendations blended with interaction-based preference scores
   */
  async getPersonalizedRecommendations(
    options: SmartRecommendationOptions & { includeInteractions?: boolean; includeTemporal?: boolean }
  ): Promise<SmartRecommendationResult> {
    // Step 1 – Base vector recs
    const base = await this.getSmartRecommendations(options)

    // Continue even if interactions/temporal flags are off so we can still apply memory-based boosts

    let genreAffinity: GenreAffinityMap = {}
    let temporalPrefs: TemporalPreferencesLite | undefined
    let memoryAffinity: GenreAffinityMap = {}
    try {
      if (options.includeInteractions) {
        genreAffinity = await this.calculateGenreAffinity(options.userId)
      }

      if (options.includeTemporal) {
        temporalPrefs = await analyzeTemporalGenreAffinity(options.userId)
      }

      // Always fetch memory affinity; cheap query
      memoryAffinity = await this.fetchMemoryAffinity(options.userId)
    } catch (err) {
      logger.warn('Affinity calculation failed, falling back to base recs', {
        error: err instanceof Error ? err.message : 'unknown',
      })
      return base
    }

    // Step 3 – Apply boost to confidence scores
    const boosted = base.movies.map((movie) => {
      let score = movie.confidenceScore || 0.5
      if (options.includeInteractions) {
        score += this.computeGenreBoost(movie, genreAffinity)
      }
      if (options.includeTemporal && temporalPrefs) {
        score += this.computeTemporalBoost(movie, temporalPrefs)
      }
      if (Object.keys(memoryAffinity).length > 0) {
        score += this.computeMemoryBoost(movie, memoryAffinity)
      }
      return {
        ...movie,
        confidenceScore: Math.min(1, score),
      }
    })

    boosted.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))

    return {
      ...base,
      movies: boosted,
      insights: {
        ...base.insights
      },
    }
  }

  /**
   * Compute per-genre affinity weight from user_interactions
   */
  private async calculateGenreAffinity(userId: string): Promise<GenreAffinityMap> {
    // Get last 200 interactions
    const { data, error } = await this.supabase
      .from('user_interactions')
      .select('movie_id, interaction_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    if (!data || (data as any[]).length === 0) return {}

    // Collect unique movie ids
    const movieIds = Array.from(new Set(data.map((r) => r.movie_id)))

    // Fetch genre arrays for those movies
    const { data: moviesData, error: moviesErr } = await this.supabase
      .from('movies')
      .select('id, genre_ids')
      .in('id', movieIds)

    if (moviesErr) throw moviesErr

    const genreCount: Record<number, number> = {}
    moviesData?.forEach((m) => {
      (m.genre_ids as number[]).forEach((gid) => {
        genreCount[gid] = (genreCount[gid] || 0) + 1
      })
    })

    // Normalize to 0-1
    const max = Math.max(...Object.values(genreCount), 1)
    const affinity: GenreAffinityMap = {}
    Object.entries(genreCount).forEach(([gid, cnt]) => {
      affinity[Number(gid)] = cnt / max
    })
    return affinity
  }

  private computeGenreBoost(movie: Movie, affinity: GenreAffinityMap): number {
    const genres = (movie.genre_ids as number[] | undefined) || []
    if (genres.length === 0) return 0
    const weights = genres.map((g) => affinity[g] || 0)
    if (weights.length === 0) return 0
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length
    // Scale boost (max 0.2)
    return avg * GENRE_BOOST_MAX
  }

  /** boost if movie genres align with current hour/day prefs */
  private computeTemporalBoost(
    movie: Movie,
    prefs: TemporalPreferencesLite
  ): number {
    const genres = (movie.genre_ids as number[]) || []
    if (genres.length === 0) return 0

    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()
    
    const hourPref = prefs.timeOfDay[currentHour]
    const dayPref = prefs.dayOfWeek[currentDay]

    let boost = 0

    // Check hourly preferences
    if (hourPref && hourPref.preferredGenres && hourPref.preferredGenres.length > 0) {
      const genreStrings = genres.map(g => String(g))
      const match = genreStrings.some((g) => hourPref.preferredGenres.includes(g))
      if (match && hourPref.confidence) {
        boost += TEMPORAL_BOOST_MAX * hourPref.confidence
      }
    }

    // Check daily preferences  
    if (dayPref && dayPref.preferredGenres && dayPref.preferredGenres.length > 0) {
      const genreStrings = genres.map(g => String(g))
      const matchD = genreStrings.some((g) => dayPref.preferredGenres.includes(g))
      if (matchD && dayPref.watchCount) {
        boost += TEMPORAL_BOOST_MAX * Math.min(1, dayPref.watchCount / 5)
      }
    }
    return boost
  }

  private async fetchMemoryAffinity(userId: string): Promise<GenreAffinityMap> {
    try {
      const { data, error } = await this.supabase
        .from('conversational_memory')
        .select('memory_key, preference_strength')
        .eq('user_id', userId)
        .eq('memory_type', 'genre_preference')
        .gt('preference_strength', 0)

      if (error) throw error
      if (!data || data.length === 0) return {}

      const map: GenreAffinityMap = {}
      data.forEach((row: any) => {
        const gid = Number(row.memory_key)
        if (!Number.isNaN(gid)) {
          map[gid] = Math.min(1, Number(row.preference_strength) || 0)
        }
      })
      return map
    } catch (err) {
      logger.warn('Fetch memory affinity failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return {}
    }
  }

  private computeMemoryBoost(movie: Movie, memoryMap: GenreAffinityMap): number {
    const genres = (movie.genre_ids as number[] | undefined) || []
    if (genres.length === 0) return 0
    const weights = genres.map((g) => memoryMap[g] || 0)
    if (weights.length === 0) return 0
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length
    return avg * MEMORY_BOOST_MAX
  }
} 