import { PersonalizedRecommender } from '@/lib/ai/personalized-recommender'
import type { Movie } from '@/types'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  const mockSelectChain = {
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockImplementation(function () {
      return { data: [
        { memory_key: '28', preference_strength: 0.9 }, // Action
        { memory_key: '35', preference_strength: 0.6 }, // Comedy
      ], error: null }
    }),
    select: jest.fn().mockReturnThis(),
  }

  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => mockSelectChain),
    })),
  }
})

// Stub getSmartRecommendations to isolate boost behaviour
jest.mock('@/lib/ai/smart-recommender-v2', () => {
  return {
    SmartRecommenderV2: class {
      async getSmartRecommendations() {
        // Return two movies with genre ids 28 (Action) and 18 (Drama)
        const movies: Partial<Movie & { confidenceScore?: number }> [] = [
          { id: 'm1', title: 'Action Flick', genre_ids: [28], confidenceScore: 0.5 },
          { id: 'm2', title: 'Drama Piece', genre_ids: [18], confidenceScore: 0.5 },
        ]
        return { movies, insights: {} } as any
      }
    },
  }
})

describe('PersonalizedRecommender memory boost', () => {
  const recommender = PersonalizedRecommender.getInstance()

  it('fetchMemoryAffinity should map rows correctly', async () => {
    // @ts-expect-error accessing private method for test
    const map = await recommender.fetchMemoryAffinity('user-1')
    expect(map).toEqual({ 28: 0.9, 35: 0.6 })
  })

  it('computeMemoryBoost should scale boost according to constants', () => {
    const movie: Movie = { id: 'x', title: 'Test', genre_ids: [28, 35] } as any
    // @ts-expect-error accessing private method for test
    const boost = recommender.computeMemoryBoost(movie, { 28: 0.9, 35: 0.6 })
    // Both genres avg=0.75, MEMORY_BOOST_MAX = 0.25 -> expect 0.1875
    expect(boost).toBeCloseTo(0.1875, 4)
  })

  it('getPersonalizedRecommendations should boost Action movie higher', async () => {
    const result = await recommender.getPersonalizedRecommendations({
      userId: 'user-1',
      limit: 5,
      includeInteractions: false,
      includeTemporal: false,
    })

    expect(result.movies.length).toBeGreaterThan(1)
    const topMovie = result.movies[0]!
    expect(topMovie.title).toBe('Action Flick')
    expect(topMovie.confidenceScore!).toBeGreaterThan(result.movies[1]!.confidenceScore!)
  })
}) 