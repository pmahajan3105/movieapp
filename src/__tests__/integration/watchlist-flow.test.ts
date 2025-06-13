/**
 * Integration test for the core watchlist functionality:
 * Add movie → watchlist appears → mark watched → moves to watched list & rating saved
 */

import { createClient } from '@supabase/supabase-js'

// Mock environment variables for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

// Create a test user for isolated testing
const TEST_USER_ID = 'test-user-watchlist-flow'
const TEST_MOVIE = {
  id: 'test-movie-123',
  title: 'Test Movie',
  year: 2024,
  genre: ['Action'],
  tmdb_id: 550, // Fight Club for reliable TMDB data
  poster_url: 'https://image.tmdb.org/t/p/w500/test.jpg',
  plot: 'Test movie plot',
  director: ['Test Director'],
  actors: ['Test Actor 1', 'Test Actor 2'],
  runtime: 120,
}

interface WatchlistItemWithMovie {
  id: string
  user_id: string
  movie_id: string
  watched: boolean
  rating?: number
  notes?: string
  watched_at?: string
  movies: {
    id: string
    title: string
    year?: number
    genre?: string[]
    tmdb_id?: number
    poster_url?: string
    plot?: string
    director?: string[]
    actors?: string[]
    runtime?: number
  }
}

describe('Watchlist Integration Flow', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    // Create Supabase client with service role for testing
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  })

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData()

    // Insert test movie
    await supabase.from('movies').insert(TEST_MOVIE)
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  async function cleanupTestData() {
    // Remove test watchlist entries
    await supabase.from('watchlist').delete().eq('user_id', TEST_USER_ID)

    // Remove test movie
    await supabase.from('movies').delete().eq('id', TEST_MOVIE.id)
  }

  test('Complete watchlist flow: add → watch → rate', async () => {
    // Step 1: Add movie to watchlist
    console.log('🎬 Step 1: Adding movie to watchlist...')

    const { data: addedItem, error: addError } = await supabase
      .from('watchlist')
      .insert({
        user_id: TEST_USER_ID,
        movie_id: TEST_MOVIE.id,
        watched: false,
        notes: 'Looking forward to watching this!',
      })
      .select('*')
      .single()

    expect(addError).toBeNull()
    expect(addedItem).toBeDefined()

    if (addedItem) {
      expect(addedItem.watched).toBe(false)
      expect(addedItem.notes).toBe('Looking forward to watching this!')
    }

    // Step 2: Verify movie appears in unwatched watchlist
    console.log('📋 Step 2: Verifying movie appears in watchlist...')

    const { data: unwatchedMovies, error: fetchError } = await supabase
      .from('watchlist')
      .select(
        `
        *,
        movies (*)
      `
      )
      .eq('user_id', TEST_USER_ID)
      .eq('watched', false)

    expect(fetchError).toBeNull()
    expect(unwatchedMovies).toBeDefined()

    if (unwatchedMovies) {
      const typedMovies = unwatchedMovies as unknown as WatchlistItemWithMovie[]
      expect(typedMovies).toHaveLength(1)
      expect(typedMovies[0]?.movies?.title).toBe(TEST_MOVIE.title)
      expect(typedMovies[0]?.movies?.year).toBe(TEST_MOVIE.year)
    }

    // Step 3: Mark movie as watched with rating
    console.log('✅ Step 3: Marking movie as watched with rating...')

    const testRating = 4
    const watchedNotes = 'Great movie! Loved the action sequences.'

    const { data: updatedItem, error: updateError } = await supabase
      .from('watchlist')
      .update({
        watched: true,
        rating: testRating,
        notes: watchedNotes,
        watched_at: new Date().toISOString(),
      })
      .eq('user_id', TEST_USER_ID)
      .eq('movie_id', TEST_MOVIE.id)
      .select('*')
      .single()

    expect(updateError).toBeNull()
    expect(updatedItem).toBeDefined()

    if (updatedItem) {
      expect(updatedItem.watched).toBe(true)
      expect(updatedItem.rating).toBe(testRating)
      expect(updatedItem.notes).toBe(watchedNotes)
      expect(updatedItem.watched_at).toBeDefined()
    }

    // Step 4: Verify movie appears in watched list with correct rating
    console.log('🎯 Step 4: Verifying movie appears in watched list...')

    const { data: watchedMovies, error: watchedFetchError } = await supabase
      .from('watchlist')
      .select(
        `
        *,
        movies (*)
      `
      )
      .eq('user_id', TEST_USER_ID)
      .eq('watched', true)

    expect(watchedFetchError).toBeNull()
    expect(watchedMovies).toBeDefined()

    if (watchedMovies) {
      const typedWatchedMovies = watchedMovies as unknown as WatchlistItemWithMovie[]
      expect(typedWatchedMovies).toHaveLength(1)
      expect(typedWatchedMovies[0]?.rating).toBe(testRating)
      expect(typedWatchedMovies[0]?.notes).toBe(watchedNotes)
      expect(typedWatchedMovies[0]?.movies?.title).toBe(TEST_MOVIE.title)
    }

    // Step 5: Verify movie no longer appears in unwatched list
    console.log('🔍 Step 5: Verifying movie no longer in unwatched list...')

    const { data: stillUnwatched, error: stillUnwatchedError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('watched', false)

    expect(stillUnwatchedError).toBeNull()
    expect(stillUnwatched).toBeDefined()

    if (stillUnwatched) {
      expect(stillUnwatched).toHaveLength(0)
    }

    console.log('✨ Watchlist flow test completed successfully!')
  })

  test('Rating validation: should accept ratings 1-5', async () => {
    // Add movie to watchlist first
    const { error: insertError } = await supabase.from('watchlist').insert({
      user_id: TEST_USER_ID,
      movie_id: TEST_MOVIE.id,
      watched: false,
    })

    expect(insertError).toBeNull()

    // Test valid ratings (1-5)
    for (const rating of [1, 2, 3, 4, 5]) {
      const { error } = await supabase
        .from('watchlist')
        .update({
          watched: true,
          rating: rating,
          watched_at: new Date().toISOString(),
        })
        .eq('user_id', TEST_USER_ID)
        .eq('movie_id', TEST_MOVIE.id)

      expect(error).toBeNull()
    }
  })

  test('Remove movie from watchlist', async () => {
    // Add movie to watchlist
    const { error: insertError } = await supabase.from('watchlist').insert({
      user_id: TEST_USER_ID,
      movie_id: TEST_MOVIE.id,
      watched: false,
    })

    expect(insertError).toBeNull()

    // Remove movie from watchlist
    const { error: deleteError } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', TEST_USER_ID)
      .eq('movie_id', TEST_MOVIE.id)

    expect(deleteError).toBeNull()

    // Verify movie is removed
    const { data: remainingItems, error: fetchError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', TEST_USER_ID)

    expect(fetchError).toBeNull()
    expect(remainingItems).toBeDefined()

    if (remainingItems) {
      expect(remainingItems).toHaveLength(0)
    }
  })
})
