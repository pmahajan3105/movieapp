import { createClient } from '@supabase/supabase-js'

// Re-use env vars from existing tests
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

const TEST_USER_ID = '00000000-0000-4000-8000-000000000999'
const TEST_MOVIE = {
  id: 'test-movie-unwatch',
  title: 'Unwatch Me',
  year: 2025,
  genre: ['Action'],
}

// Skip test if environment variables are not properly configured
const shouldRunIntegrationTests = supabaseUrl && 
  supabaseServiceKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseServiceKey.includes('placeholder')

describe('Watchlist PATCH supports watchlist_id', () => {
  beforeAll(() => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping integration tests - Supabase not configured')
    }
  })

  const runTest = shouldRunIntegrationTests ? it : it.skip

  const supabase = shouldRunIntegrationTests ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) : null

  let watchlistId: string

  if (shouldRunIntegrationTests) {
    beforeAll(async () => {
      await supabase!.from('movies').delete().eq('id', TEST_MOVIE.id)
      await supabase!.from('movies').insert(TEST_MOVIE)
    })

    afterAll(async () => {
      await supabase!.from('watchlist').delete().eq('id', watchlistId)
      await supabase!.from('movies').delete().eq('id', TEST_MOVIE.id)
    })
  }

  runTest('can unwatch using watchlist_id', async () => {
    // Add to watchlist and mark watched
    const { data: added, error: insertError } = await supabase!
      .from('watchlist')
      .insert({ user_id: TEST_USER_ID, movie_id: TEST_MOVIE.id, watched: true })
      .select('id')
      .single()

    if (insertError || !added) {
      throw new Error(`Failed to insert watchlist item: ${insertError?.message}`)
    }

    watchlistId = added.id

    // Call PATCH with watchlist_id only
    const { data: updated, error } = await supabase!
      .from('watchlist')
      .update({ watched: false })
      .eq('id', watchlistId)
      .select('watched')
      .single()

    expect(error).toBeNull()
    expect(updated!.watched).toBe(false)
  })
})
