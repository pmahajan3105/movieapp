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

describe('Watchlist PATCH supports watchlist_id', () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let watchlistId: string

  beforeAll(async () => {
    await supabase.from('movies').delete().eq('id', TEST_MOVIE.id)
    await supabase.from('movies').insert(TEST_MOVIE)
  })

  afterAll(async () => {
    await supabase.from('watchlist').delete().eq('id', watchlistId)
    await supabase.from('movies').delete().eq('id', TEST_MOVIE.id)
  })

  it('can unwatch using watchlist_id', async () => {
    // Add to watchlist and mark watched
    const { data: added } = await supabase
      .from('watchlist')
      .insert({ user_id: TEST_USER_ID, movie_id: TEST_MOVIE.id, watched: true })
      .select('id')
      .single()
    watchlistId = added!.id

    // Call PATCH with watchlist_id only
    const { data: updated, error } = await supabase
      .from('watchlist')
      .update({ watched: false })
      .eq('id', watchlistId)
      .select('watched')
      .single()

    expect(error).toBeNull()
    expect(updated!.watched).toBe(false)
  })
})
