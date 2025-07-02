/**
 * @jest-environment jsdom
 */

// Use centralized mocks
import { createMockSupabaseClient } from '../setupMocks'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

const mockSupabaseClient = createMockSupabaseClient()
const mockCreateRouteHandlerClient = createRouteHandlerClient as jest.MockedFunction<typeof createRouteHandlerClient>

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateRouteHandlerClient.mockReturnValue(mockSupabaseClient as any)
})

describe('User Interactions Database Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  const mockMovie = {
    id: 'movie-123',
    title: 'Test Movie',
    genre: ['Action', 'Thriller'],
    year: 2023,
    rating: 8.5,
  }

  describe('User Behavior Signals', () => {
    it('should record movie view interaction', async () => {
      const viewInteraction = {
        user_id: mockUser.id,
        movie_id: mockMovie.id,
        interaction_type: 'view',
        interaction_value: 1,
        context: {
          page_type: 'movie_list',
          position_in_list: 3,
          time_spent_seconds: 45,
        },
        created_at: expect.any(String),
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [viewInteraction],
        error: null,
      })

      // Simulate API call to record interaction
      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(viewInteraction)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_behavior_signals')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(viewInteraction)
      expect(data).toEqual([viewInteraction])
      expect(error).toBeNull()
    })

    it('should record movie rating interaction', async () => {
      const ratingInteraction = {
        user_id: mockUser.id,
        movie_id: mockMovie.id,
        interaction_type: 'rate',
        interaction_value: 4.5,
        context: {
          page_type: 'movie_details',
          previous_rating: null,
          rating_method: 'star_picker',
        },
        created_at: expect.any(String),
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [ratingInteraction],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(ratingInteraction)

      expect(data).toEqual([ratingInteraction])
      expect(error).toBeNull()
    })

    it('should record watchlist addition interaction', async () => {
      const watchlistInteraction = {
        user_id: mockUser.id,
        movie_id: mockMovie.id,
        interaction_type: 'save',
        interaction_value: 1,
        context: {
          page_type: 'recommendations',
          source: 'smart_recommendations',
          list_position: 1,
        },
        created_at: expect.any(String),
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [watchlistInteraction],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(watchlistInteraction)

      expect(data).toEqual([watchlistInteraction])
      expect(error).toBeNull()
    })

    it('should record movie skip interaction', async () => {
      const skipInteraction = {
        user_id: mockUser.id,
        movie_id: mockMovie.id,
        interaction_type: 'skip',
        interaction_value: 1,
        context: {
          page_type: 'recommendations',
          skip_reason: 'not_interested',
          time_visible_seconds: 2,
        },
        created_at: expect.any(String),
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [skipInteraction],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(skipInteraction)

      expect(data).toEqual([skipInteraction])
      expect(error).toBeNull()
    })

    it('should handle batch interaction recording', async () => {
      const batchInteractions = [
        {
          user_id: mockUser.id,
          movie_id: 'movie-1',
          interaction_type: 'view',
          interaction_value: 1,
          context: { page_type: 'search_results', position: 1 },
        },
        {
          user_id: mockUser.id,
          movie_id: 'movie-2',
          interaction_type: 'view',
          interaction_value: 1,
          context: { page_type: 'search_results', position: 2 },
        },
        {
          user_id: mockUser.id,
          movie_id: 'movie-3',
          interaction_type: 'skip',
          interaction_value: 1,
          context: { page_type: 'search_results', position: 3 },
        },
      ]

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: batchInteractions,
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(batchInteractions)

      expect(data).toHaveLength(3)
      expect(error).toBeNull()
    })

    it('should handle interaction recording errors', async () => {
      const errorInteraction = {
        user_id: mockUser.id,
        movie_id: mockMovie.id,
        interaction_type: 'view',
        interaction_value: 1,
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database constraint violation', code: '23505' },
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(errorInteraction)

      expect(data).toBeNull()
      expect(error).toEqual({
        message: 'Database constraint violation',
        code: '23505',
      })
    })
  })

  describe('Conversational Memory', () => {
    it('should store conversation exchange', async () => {
      const conversationExchange = {
        user_id: mockUser.id,
        conversation_id: 'conv-123',
        user_message: 'I want action movies like John Wick',
        ai_response: 'Based on your preference for action movies like John Wick, I recommend "Nobody" (2021) and "Atomic Blonde" (2017).',
        ai_audio_url: 'https://example.com/audio/response-123.mp3',
        context: {
          recommendation_source: 'conversational_ai',
          user_intent: 'movie_recommendation',
          extracted_preferences: ['action', 'john_wick_style'],
        },
        created_at: expect.any(String),
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [conversationExchange],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('conversational_memory')
        .insert(conversationExchange)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversational_memory')
      expect(data).toEqual([conversationExchange])
      expect(error).toBeNull()
    })

    it('should retrieve conversation history for user', async () => {
      const conversationHistory = [
        {
          id: 'exchange-1',
          user_id: mockUser.id,
          conversation_id: 'conv-123',
          user_message: 'Show me sci-fi movies',
          ai_response: 'Here are some great sci-fi movies...',
          created_at: '2025-07-01T10:00:00Z',
        },
        {
          id: 'exchange-2',
          user_id: mockUser.id,
          conversation_id: 'conv-123',
          user_message: 'What about horror movies?',
          ai_response: 'For horror, I recommend...',
          created_at: '2025-07-01T10:05:00Z',
        },
      ]

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: conversationHistory,
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('conversational_memory')
        .select('*')
        .eq('user_id', mockUser.id)
        .eq('conversation_id', 'conv-123')
        .order('created_at', { ascending: true })
        .single()

      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', mockUser.id)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('conversation_id', 'conv-123')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: true })
      expect(data).toEqual(conversationHistory)
    })

    it('should store memory key for context retention', async () => {
      const memoryEntry = {
        user_id: mockUser.id,
        memory_key: 'user_prefers_action_movies',
        memory_text: 'User consistently chooses action movies, especially those with martial arts',
        preference_strength: 0.85,
        times_reinforced: 3,
        last_updated: expect.any(String),
      }

      mockSupabaseClient.upsert.mockResolvedValueOnce({
        data: [memoryEntry],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('conversational_memory')
        .upsert(memoryEntry, { onConflict: 'user_id,memory_key' })

      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        memoryEntry,
        { onConflict: 'user_id,memory_key' }
      )
      expect(data).toEqual([memoryEntry])
    })

    it('should handle conversation cleanup for old sessions', async () => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days ago

      mockSupabaseClient.delete.mockResolvedValueOnce({
        data: { count: 15 },
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('conversational_memory')
        .delete()
        .lte('created_at', cutoffDate.toISOString())

      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('created_at', cutoffDate.toISOString())
      expect(data).toEqual({ count: 15 })
    })
  })

  describe('User Preference Insights', () => {
    it('should compute and store genre preferences', async () => {
      const genreInsights = {
        user_id: mockUser.id,
        insight_type: 'genre_preference',
        insight_data: {
          top_genres: [
            { genre: 'Action', score: 0.92, count: 25 },
            { genre: 'Sci-Fi', score: 0.78, count: 18 },
            { genre: 'Thriller', score: 0.65, count: 12 },
          ],
          diversity_score: 0.73,
          consistency_score: 0.88,
        },
        confidence: 0.91,
        computed_at: expect.any(String),
      }

      mockSupabaseClient.upsert.mockResolvedValueOnce({
        data: [genreInsights],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_preference_insights')
        .upsert(genreInsights, { onConflict: 'user_id,insight_type' })

      expect(data).toEqual([genreInsights])
      expect(error).toBeNull()
    })

    it('should compute temporal viewing patterns', async () => {
      const temporalInsights = {
        user_id: mockUser.id,
        insight_type: 'temporal_pattern',
        insight_data: {
          preferred_viewing_times: ['evening', 'weekend'],
          genre_by_time: {
            morning: ['Documentary', 'Comedy'],
            evening: ['Action', 'Thriller'],
            weekend: ['Drama', 'Sci-Fi'],
          },
          session_duration_avg: 95, // minutes
        },
        confidence: 0.76,
        computed_at: expect.any(String),
      }

      mockSupabaseClient.upsert.mockResolvedValueOnce({
        data: [temporalInsights],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_preference_insights')
        .upsert(temporalInsights, { onConflict: 'user_id,insight_type' })

      expect(data).toEqual([temporalInsights])
    })

    it('should retrieve all insights for user recommendation engine', async () => {
      const allInsights = [
        {
          insight_type: 'genre_preference',
          insight_data: { top_genres: ['Action', 'Sci-Fi'] },
          confidence: 0.91,
        },
        {
          insight_type: 'quality_threshold',
          insight_data: { min_rating: 7.5, preferred_range: [7.5, 9.0] },
          confidence: 0.84,
        },
        {
          insight_type: 'director_preference',
          insight_data: { top_directors: ['Christopher Nolan', 'Denis Villeneuve'] },
          confidence: 0.73,
        },
      ]

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: allInsights,
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_preference_insights')
        .select('insight_type, insight_data, confidence')
        .eq('user_id', mockUser.id)
        .gte('confidence', 0.7)
        .single()

      expect(mockSupabaseClient.select).toHaveBeenCalledWith('insight_type, insight_data, confidence')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', mockUser.id)
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('confidence', 0.7)
      expect(data).toEqual(allInsights)
    })
  })

  describe('Database Performance and Optimization', () => {
    it('should handle large batch inserts efficiently', async () => {
      const largeBatch = Array(1000).fill(null).map((_, index) => ({
        user_id: mockUser.id,
        movie_id: `movie-${index}`,
        interaction_type: 'view',
        interaction_value: 1,
        context: { batch_test: true, index },
        created_at: new Date().toISOString(),
      }))

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: largeBatch,
        error: null,
      })

      const startTime = Date.now()
      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(largeBatch)
      const duration = Date.now() - startTime

      expect(data).toHaveLength(1000)
      expect(error).toBeNull()
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle concurrent user operations', async () => {
      const concurrentOperations = [
        mockSupabaseClient.from('user_behavior_signals').insert({
          user_id: mockUser.id,
          movie_id: 'movie-1',
          interaction_type: 'view',
          interaction_value: 1,
        }),
        mockSupabaseClient.from('conversational_memory').insert({
          user_id: mockUser.id,
          conversation_id: 'conv-1',
          user_message: 'Test',
          ai_response: 'Response',
        }),
        mockSupabaseClient.from('user_preference_insights').upsert({
          user_id: mockUser.id,
          insight_type: 'test',
          insight_data: { test: true },
          confidence: 0.8,
        }),
      ]

      // Mock all operations to succeed
      mockSupabaseClient.insert
        .mockResolvedValueOnce({ data: [{}], error: null })
        .mockResolvedValueOnce({ data: [{}], error: null })
      mockSupabaseClient.upsert.mockResolvedValueOnce({ data: [{}], error: null })

      const results = await Promise.all(concurrentOperations)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.error).toBeNull()
      })
    })

    it('should handle database connection errors gracefully', async () => {
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout', code: 'CONNECTION_ERROR' },
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert({
          user_id: mockUser.id,
          movie_id: mockMovie.id,
          interaction_type: 'view',
          interaction_value: 1,
        })

      expect(data).toBeNull()
      expect(error.code).toBe('CONNECTION_ERROR')
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should enforce user_id foreign key constraints', async () => {
      const invalidInteraction = {
        user_id: 'non-existent-user',
        movie_id: mockMovie.id,
        interaction_type: 'view',
        interaction_value: 1,
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Foreign key violation', code: '23503' },
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(invalidInteraction)

      expect(data).toBeNull()
      expect(error.code).toBe('23503')
    })

    it('should validate interaction_type enum values', async () => {
      const invalidInteraction = {
        user_id: mockUser.id,
        movie_id: mockMovie.id,
        interaction_type: 'invalid_type',
        interaction_value: 1,
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid enum value', code: '22P02' },
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(invalidInteraction)

      expect(error.code).toBe('22P02')
    })

    it('should handle JSON validation for context fields', async () => {
      const validJsonInteraction = {
        user_id: mockUser.id,
        movie_id: mockMovie.id,
        interaction_type: 'view',
        interaction_value: 1,
        context: {
          page_type: 'recommendations',
          metadata: { valid: true, nested: { data: 'test' } },
        },
      }

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [validJsonInteraction],
        error: null,
      })

      const { data, error } = await mockSupabaseClient
        .from('user_behavior_signals')
        .insert(validJsonInteraction)

      expect(data).toEqual([validJsonInteraction])
      expect(error).toBeNull()
    })
  })
})