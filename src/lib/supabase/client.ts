// Browser client for client components (consolidated from browser-client.ts)
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../../types/supabase-generated'
import type {
  UserProfile,
  Movie,
  WatchlistItem,
  Rating,
  Recommendation,
  UserProfileInsert,
  UserProfileUpdate,
  MovieInsert,
  RatingInsert,
  RecommendationInsert,
} from './types'

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []

          return document.cookie
            .split('; ')
            .filter(Boolean)
            .map(cookie => {
              const [name, ...rest] = cookie.split('=')
              return {
                name: name || '',
                value: decodeURIComponent(rest.join('=') || ''),
              }
            })
            .filter(cookie => cookie.name) // Filter out cookies without names
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return

          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${encodeURIComponent(value)}`
            if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
            if (options?.path) cookie += `; path=${options.path}`
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
            if (options?.secure) cookie += '; secure'
            document.cookie = cookie
          })
        },
      },
    }
  )
}

// Singleton client for client components
export const supabase = createBrowserSupabaseClient()

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
    async updatePreferences(
      preferences: Database['public']['Tables']['user_profiles']['Row']['preferences']
    ): Promise<UserProfile> {
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
     * Get movie by OMDB ID
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
        .upsert(movie, { onConflict: 'omdb_id' })
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

  // RATINGS (formerly SWIPES)
  ratings: {
    /**
     * Create a rating/interaction
     */
    async create(rating: RatingInsert): Promise<Rating> {
      const { data, error } = await supabase.from('ratings').insert(rating).select().single()

      if (error) throw error
      return data
    },

    /**
     * Get rating history for current user
     */
    async getHistory(limit = 100): Promise<Rating[]> {
      const { data, error } = await supabase
        .from('ratings')
        .select(
          `
          *,
          movies (*)
        `
        )
        .order('rated_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },

    /**
     * Check if user has rated a specific movie
     */
    async checkRating(movieId: string): Promise<Rating | null> {
      const { data, error } = await supabase
        .from('ratings')
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
     * Get current user's watchlist
     */
    async get(): Promise<WatchlistItem[]> {
      const { data, error } = await supabase
        .from('watchlist')
        .select(
          `
          *,
          movies (*)
        `
        )
        .order('added_at', { ascending: false })

      if (error) throw error
      return data || []
    },

    /**
     * Add movie to watchlist
     */
    async add(movieId: string, userId: string): Promise<WatchlistItem> {
      const { data, error } = await supabase
        .from('watchlist')
        .insert({ movie_id: movieId, user_id: userId })
        .select()
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
     * Mark movie as watched with optional rating and notes
     */
    async markWatched(movieId: string, rating?: number, notes?: string): Promise<WatchlistItem> {
      const { data, error } = await supabase
        .from('watchlist')
        .update({
          watched: true,
          watched_at: new Date().toISOString(),
          rating,
          notes,
        })
        .eq('movie_id', movieId)
        .select()
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
        .select()
        .single()

      if (error) throw error
      return data
    },
  },

  // RECOMMENDATIONS
  recommendations: {
    /**
     * Get recommendation queue for current user
     */
    async getQueue(limit = 20): Promise<Recommendation[]> {
      const { data, error } = await supabase
        .from('recommendations')
        .select(
          `
          *,
          movies (*)
        `
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },

    /**
     * Add batch of recommendations
     */
    async addBatch(recommendations: RecommendationInsert[]): Promise<Recommendation[]> {
      const { data, error } = await supabase
        .from('recommendations')
        .insert(recommendations)
        .select()

      if (error) throw error
      return data || []
    },

    /**
     * Remove recommendation by id
     */
    async remove(id: string): Promise<void> {
      const { error } = await supabase.from('recommendations').delete().eq('id', id)

      if (error) throw error
    },

    /**
     * Clear old recommendations (older than 7 days)
     */
    async clearOld(): Promise<void> {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { error } = await supabase
        .from('recommendations')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString())

      if (error) throw error
    },
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
    try {
      const user = await auth.getUser()
      return !!user
    } catch {
      return false
    }
  },

  /**
   * Get current user ID or null if not authenticated
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const user = await auth.getUser()
      return user?.id || null
    } catch {
      return null
    }
  },

  /**
   * Handle and format Supabase errors consistently
   */
  handleError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as Error).message
    }
    return 'An unexpected error occurred'
  },
}
