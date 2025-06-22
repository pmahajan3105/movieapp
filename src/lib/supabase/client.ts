import { createBrowserClient } from '@supabase/ssr'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from './types'
import type {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Movie,
  MovieInsert,
  Swipe,
  SwipeInsert,
  WatchlistItem,
  RecommendationQueueItem,
  RecommendationQueueInsert,
} from './types'

// Browser client for client components
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton client for client components
export const supabase = createBrowserSupabaseClient()

// Server client for server components and API routes
export const createServerClient = cache(async () => {
  // MUST await for dynamic cookies API
  const cookieStore = await cookies()

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              /* called from a Server Component – safe to ignore */
            }
          })
        },
      },
    }
  )
})

// ============================================================================
// AUTH HELPERS
// ============================================================================

export const auth = {
  /**
   * Sign in with email and OTP
   */
  async signInWithOtp(email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) throw error
    return data
  },

  /**
   * Verify OTP and complete sign in
   */
  async verifyOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) throw error
    return data
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /**
   * Get current user
   */
  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  /**
   * Get current session
   */
  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}

// ============================================================================
// DATABASE HELPERS WITH RLS
// ============================================================================

export const db = {
  // USER PROFILES
  userProfiles: {
    /**
     * Get current user's profile
     */
    async getCurrent(): Promise<UserProfile | null> {
      const { data, error } = await supabase.from('user_profiles').select('*').single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },

    /**
     * Create user profile (typically called after sign up)
     */
    async create(profile: UserProfileInsert): Promise<UserProfile> {
      const { data, error } = await supabase.from('user_profiles').insert(profile).select().single()

      if (error) throw error
      return data
    },

    /**
     * Update current user's profile
     */
    async update(updates: UserProfileUpdate): Promise<UserProfile> {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .select()
        .single()

      if (error) throw error
      return data
    },

    /**
     * Update user preferences
     */
    async updatePreferences(preferences: Record<string, unknown>): Promise<UserProfile> {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          preferences,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
  },

  // MOVIES
  movies: {
    /**
     * Get movie by ID
     */
    async getById(id: string): Promise<Movie | null> {
      const { data, error } = await supabase.from('movies').select('*').eq('id', id).single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },

    /**
     * Get movie by OMDb ID
     */
    async getByOmdbId(omdbId: string): Promise<Movie | null> {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('omdb_id', omdbId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },

    /**
     * Create or update movie
     */
    async upsert(movie: MovieInsert): Promise<Movie> {
      const { data, error } = await supabase
        .from('movies')
        .upsert(movie, { onConflict: 'tmdb_id' })
        .select()
        .single()

      if (error) throw error
      return data
    },

    /**
     * Search movies by title
     */
    async searchByTitle(title: string, limit = 10): Promise<Movie[]> {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .ilike('title', `%${title}%`)
        .limit(limit)

      if (error) throw error
      return data || []
    },
  },

  // SWIPES
  swipes: {
    /**
     * Record a swipe action
     */
    async create(swipe: SwipeInsert): Promise<Swipe> {
      const { data, error } = await supabase.from('swipes').insert(swipe).select().single()

      if (error) throw error
      return data
    },

    /**
     * Get user's swipe history
     */
    async getHistory(limit = 100): Promise<Swipe[]> {
      const { data, error } = await supabase
        .from('swipes')
        .select('*, movies(*)')
        .order('swiped_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },

    /**
     * Check if user has swiped on a movie
     */
    async checkSwipe(movieId: string): Promise<Swipe | null> {
      const { data, error } = await supabase
        .from('swipes')
        .select('*')
        .eq('movie_id', movieId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  },

  // WATCHLIST
  watchlist: {
    /**
     * Get user's watchlist
     */
    async get(): Promise<WatchlistItem[]> {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*, movies(*)')
        .order('added_at', { ascending: false })

      if (error) throw error
      return data || []
    },

    /**
     * Add movie to watchlist
     */
    async add(movieId: string): Promise<WatchlistItem> {
      const { data, error } = await supabase
        .from('watchlist')
        .insert({ movie_id: movieId })
        .select('*, movies(*)')
        .single()

      if (error) throw error
      return data
    },

    /**
     * Remove movie from watchlist
     */
    async remove(movieId: string): Promise<void> {
      const { error } = await supabase.from('watchlist').delete().eq('movie_id', movieId)

      if (error) throw error
    },

    /**
     * Mark movie as watched
     */
    async markWatched(movieId: string, rating?: number, notes?: string): Promise<WatchlistItem> {
      const { data, error } = await supabase
        .from('watchlist')
        .update({
          watched: true,
          rating,
          notes,
          watched_at: new Date().toISOString(),
        })
        .eq('movie_id', movieId)
        .select('*, movies(*)')
        .single()

      if (error) throw error
      return data
    },

    /**
     * Update watchlist item
     */
    async update(movieId: string, updates: Partial<WatchlistItem>): Promise<WatchlistItem> {
      const { data, error } = await supabase
        .from('watchlist')
        .update(updates)
        .eq('movie_id', movieId)
        .select('*, movies(*)')
        .single()

      if (error) throw error
      return data
    },
  },

  // RECOMMENDATION QUEUE
  recommendations: {
    /**
     * Get user's recommendation queue
     */
    async getQueue(limit = 20): Promise<RecommendationQueueItem[]> {
      const { data, error } = await supabase
        .from('recommendation_queue')
        .select('*, movies(*)')
        .is('consumed_at', null)
        .order('position', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data || []
    },

    /**
     * Add recommendations to queue
     */
    async addBatch(
      recommendations: RecommendationQueueInsert[]
    ): Promise<RecommendationQueueItem[]> {
      const { data, error } = await supabase
        .from('recommendation_queue')
        .insert(recommendations)
        .select('*, movies(*)')

      if (error) throw error
      return data || []
    },

    /**
     * Mark recommendation as consumed
     */
    async markConsumed(id: string): Promise<void> {
      const { error } = await supabase
        .from('recommendation_queue')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },

    /**
     * Clear old consumed recommendations
     */
    async clearConsumed(): Promise<void> {
      const { error } = await supabase
        .from('recommendation_queue')
        .delete()
        .not('consumed_at', 'is', null)

      if (error) throw error
    },
  },
}

// ============================================================================
// ROW LEVEL SECURITY HELPERS
// ============================================================================

export const rls = {
  /**
   * Enable RLS on all tables (run this during setup)
   */
  async enableAllTables() {
    const tables = ['user_profiles', 'swipes', 'watchlist', 'recommendation_queue']

    for (const table of tables) {
      const { error } = await supabase.rpc('enable_rls', { table_name: table })
      if (error) console.error(`Failed to enable RLS on ${table}:`, error)
    }
  },

  /**
   * Create RLS policies for user data isolation
   */
  async createPolicies() {
    // This would typically be done via SQL migrations
    // But we can provide the SQL here for reference
    const policies = `
      -- User profiles: users can only access their own profile
      CREATE POLICY "Users can view own profile" ON user_profiles
        FOR SELECT USING (auth.uid() = id);
      
      CREATE POLICY "Users can update own profile" ON user_profiles
        FOR UPDATE USING (auth.uid() = id);
      
      -- Swipes: users can only access their own swipes
      CREATE POLICY "Users can view own swipes" ON swipes
        FOR ALL USING (auth.uid() = user_id);
      
      -- Watchlist: users can only access their own watchlist
      CREATE POLICY "Users can manage own watchlist" ON watchlist
        FOR ALL USING (auth.uid() = user_id);
      
      -- Recommendations: users can only access their own recommendations
      CREATE POLICY "Users can view own recommendations" ON recommendation_queue
        FOR ALL USING (auth.uid() = user_id);
      
      -- Movies: readable by all authenticated users
      CREATE POLICY "Movies are viewable by authenticated users" ON movies
        FOR SELECT USING (auth.role() = 'authenticated');
    `

    console.log('RLS Policies SQL:', policies)
    return policies
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const utils = {
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return !!session
  },

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id || null
  },

  /**
   * Handle Supabase errors
   */
  handleError(error: unknown): string {
    const err = error as { code?: string; message?: string }
    if (err?.code === 'PGRST116') {
      return 'No data found'
    }
    if (err?.code === '23505') {
      return 'This record already exists'
    }
    if (err?.code === '23503') {
      return 'Referenced record does not exist'
    }
    return err?.message || 'An unknown error occurred'
  },
}
