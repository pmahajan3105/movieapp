import { PersonalizedRecommender } from '@/lib/ai/personalized-recommender'
import type { Movie } from '@/types'
import { TemporalPreferencesLite } from '@/lib/ai/behavioral-analysis'

/**
 * Unit-tests for the temporal boost helper inside PersonalizedRecommender.
 * We reach the private method via `as any` to keep production code untouched.
 */

describe('PersonalizedRecommender.computeTemporalBoost', () => {
  const recommender = PersonalizedRecommender.getInstance() as any

  const makeMovie = (genres: number[]): Movie =>
    ({
      id: 'm1',
      title: 'Dummy',
      genre_ids: genres,
    } as unknown as Movie)

  /** helper to build prefs */
  const prefs: TemporalPreferencesLite = {
    timeOfDay: {
      5: { preferredGenres: ['28', '35'], confidence: 0.8 }, // 5 AM (to match local time)
      10: { preferredGenres: ['28', '35'], confidence: 0.8 }, // 10 AM
    },
    dayOfWeek: {
      1: { preferredGenres: ['18'], watchCount: 6 }, // Monday
    },
  }

  it('returns >0 when hour pref matches', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-06T10:15:00Z'))

    const boost = recommender.computeTemporalBoost(makeMovie([28]), prefs)
    expect(boost).toBeGreaterThan(0)

    jest.useRealTimers()
  })

  it('returns 0 when no match', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-06T22:00:00Z'))

    const boost = recommender.computeTemporalBoost(makeMovie([99]), prefs)
    expect(boost).toBe(0)

    jest.useRealTimers()
  })
}) 