/**
 * @jest-environment node
 */

import { 
  analyzeRatingPatterns,
  analyzeWatchlistBehavior,
  analyzeTemporalPatterns,
  generateIntelligenceInsights,
  analyzeCompleteUserBehavior,
  analyzeTemporalGenreAffinity
} from '@/lib/ai/behavioral-analysis'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  }))
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

describe('Behavioral Analysis', () => {
  const mockUserId = 'user-123'
  
  const mockRatedMovies = [
    {
      rating: 5,
      created_at: '2023-01-01T00:00:00Z',
      movies: {
        id: '1',
        title: 'Great Movie',
        genre: ['Action', 'Adventure'],
        director: ['Director A'],
        year: 2023,
        rating: 8.5,
        plot: 'An exciting adventure with love and friendship'
      }
    },
    {
      rating: 4,
      created_at: '2023-01-02T00:00:00Z',
      movies: {
        id: '2',
        title: 'Good Movie',
        genre: ['Drama'],
        director: ['Director B'],
        year: 2022,
        rating: 7.8,
        plot: 'A touching family story'
      }
    },
    {
      rating: 3,
      created_at: '2023-01-03T00:00:00Z',
      movies: {
        id: '3',
        title: 'Average Movie',
        genre: ['Comedy'],
        director: ['Director C'],
        year: 2021,
        rating: 6.5,
        plot: 'A funny story about friendship'
      }
    }
  ]

  const mockWatchlistItems = [
    {
      added_at: '2023-01-01T00:00:00Z',
      watched: true,
      watched_at: '2023-01-03T00:00:00Z',
      movies: {
        id: '1',
        title: 'Watched Movie',
        genre: ['Action'],
        year: 2023
      }
    },
    {
      added_at: '2022-12-01T00:00:00Z',
      watched: false,
      watched_at: null,
      movies: {
        id: '2',
        title: 'Abandoned Movie',
        genre: ['Horror'],
        year: 2022
      }
    },
    {
      added_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      watched: false,
      watched_at: null,
      movies: {
        id: '3',
        title: 'Pending Movie',
        genre: ['Drama'],
        year: 2023
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('analyzeRatingPatterns', () => {
    it('should analyze user rating patterns correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockRatedMovies,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeRatingPatterns(mockUserId)

      expect(result.five_star_movies).toHaveLength(1)
      expect(result.four_star_movies).toHaveLength(1)
      expect(result.three_star_movies).toHaveLength(1)
      expect(result.total_ratings).toBe(3)
      expect(result.average_rating).toBe(4)
    })

    it('should handle empty rating data', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeRatingPatterns(mockUserId)

      expect(result.total_ratings).toBe(0)
      expect(result.average_rating).toBe(0)
      expect(result.five_star_movies).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeRatingPatterns(mockUserId)

      expect(result.total_ratings).toBe(0)
      expect(result.average_rating).toBe(0)
    })
  })

  describe('analyzeWatchlistBehavior', () => {
    it('should analyze watchlist behavior correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockWatchlistItems,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeWatchlistBehavior(mockUserId)

      expect(result.completion_rate).toBeGreaterThan(0)
      expect(result.abandoned_movies).toHaveLength(1)
      expect(result.pending_movies).toHaveLength(1)
      expect(result.impulse_watches).toHaveLength(1) // Watched within 2 days
    })

    it('should calculate completion rates correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockWatchlistItems,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeWatchlistBehavior(mockUserId)

      // 1 watched out of 3 total = 33% completion rate
      expect(result.completion_rate).toBe(33)
    })
  })

  describe('analyzeTemporalPatterns', () => {
    it('should analyze temporal viewing patterns', async () => {
      const watchedMovies = [
        {
          watched_at: '2023-01-07T20:00:00Z', // Saturday evening
          movies: {
            id: '1',
            title: 'Weekend Movie',
            genre: ['Action', 'Adventure'],
            year: 2023
          }
        },
        {
          watched_at: '2023-01-03T19:00:00Z', // Tuesday evening
          movies: {
            id: '2',
            title: 'Weekday Movie',
            genre: ['Comedy', 'Romance'],
            year: 2023
          }
        }
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((field, value) => {
          if (field === 'watched' && value === true) {
            mockQuery.then = jest.fn().mockResolvedValue({
              data: watchedMovies,
              error: null
            })
          }
          return mockQuery
        }),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn()
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeTemporalPatterns(mockUserId)

      expect(result.weekend_genres).toContain('Action')
      expect(result.weekday_genres).toContain('Comedy')
      expect(result.recent_viewing_velocity).toBeGreaterThanOrEqual(0)
    })
  })

  describe('generateIntelligenceInsights', () => {
    it('should generate intelligence insights from patterns', async () => {
      const mockRatingPatterns = {
        five_star_movies: mockRatedMovies.slice(0, 1),
        four_star_movies: mockRatedMovies.slice(1, 2),
        three_star_movies: mockRatedMovies.slice(2, 3),
        two_star_movies: [],
        one_star_movies: [],
        genre_rating_averages: new Map([['Action', 4.5], ['Drama', 4.0]]),
        director_rating_averages: new Map([['Director A', 4.5]]),
        rating_distribution: new Map([[5, 1], [4, 1], [3, 1]]),
        average_rating: 4.0,
        total_ratings: 3
      }

      const mockWatchlistPatterns = {
        completion_rate: 50,
        genre_completion_rates: new Map(),
        average_time_to_watch: 5,
        impulse_watches: [],
        abandoned_movies: [],
        pending_movies: [],
        genre_add_vs_watch_patterns: new Map()
      }

      const mockTemporalPatterns = {
        weekend_genres: ['Action'],
        weekday_genres: ['Comedy'],
        recent_viewing_velocity: 2.5,
        seasonal_preferences: new Map(),
        preferred_viewing_contexts: []
      }

      const result = await generateIntelligenceInsights(
        mockRatingPatterns,
        mockWatchlistPatterns,
        mockTemporalPatterns
      )

      expect(result.taste_consistency_score).toBeGreaterThanOrEqual(0)
      expect(result.taste_consistency_score).toBeLessThanOrEqual(1)
      expect(result.exploration_vs_comfort_ratio).toBeGreaterThanOrEqual(0)
      expect(result.quality_threshold).toBeGreaterThan(0)
      expect(result.genre_loyalty_scores.size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('analyzeCompleteUserBehavior', () => {
    it('should perform complete behavioral analysis', async () => {
      // Mock all the individual analysis functions
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockRatedMovies,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeCompleteUserBehavior(mockUserId)

      expect(result).toHaveProperty('rating_patterns')
      expect(result).toHaveProperty('watchlist_patterns')
      expect(result).toHaveProperty('temporal_patterns')
      expect(result).toHaveProperty('intelligence_insights')
    })
  })

  describe('analyzeTemporalGenreAffinity', () => {
    it('should analyze temporal genre preferences', async () => {
      const mockInteractions = [
        {
          time_of_day: 20,
          day_of_week: 6, // Saturday
          interaction_type: 'view',
          movies: { genre_ids: [28, 12] } // Action, Adventure
        },
        {
          time_of_day: 19,
          day_of_week: 2, // Tuesday
          interaction_type: 'view',
          movies: { genre_ids: [35, 10749] } // Comedy, Romance
        }
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: mockInteractions,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeTemporalGenreAffinity(mockUserId, 200)

      expect(result).toHaveProperty('timeOfDay')
      expect(result).toHaveProperty('dayOfWeek')
      expect(result.timeOfDay[20]).toBeDefined()
      expect(result.dayOfWeek[6]).toBeDefined()
    })

    it('should handle empty interaction data', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('No data')
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await analyzeTemporalGenreAffinity(mockUserId)

      expect(result.timeOfDay).toEqual({})
      expect(result.dayOfWeek).toEqual({})
    })
  })
})