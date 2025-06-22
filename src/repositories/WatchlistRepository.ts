import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-generated'
import type { WatchlistItem } from '@/types'
import { MovieRepository } from './MovieRepository'

type DBWatchlistInsert = Database['public']['Tables']['watchlist']['Insert']
type DBWatchlistUpdate = Database['public']['Tables']['watchlist']['Update']

export class WatchlistRepository {
  private movieRepo: MovieRepository

  constructor(private supabase: SupabaseClient<Database>) {
    this.movieRepo = new MovieRepository(supabase)
  }

  async getUserWatchlist(
    userId: string,
    filters?: {
      watched?: boolean
      limit?: number
      offset?: number
    }
  ) {
    let query = this.supabase
      .from('watchlist')
      .select(
        `
        *,
        movies!inner(*)
      `
      )
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (filters?.watched !== undefined) {
      query = query.eq('watched', filters.watched)
    }

    if (filters?.limit && filters?.offset !== undefined) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch watchlist: ${error.message}`)

    // Transform the joined data to match expected structure
    return (data || []).map(item => ({
      ...item,
      movie: item.movies ? this.movieRepo['toDomainMovie'](item.movies) : undefined,
    }))
  }

  async addToWatchlist(userId: string, movieId: string, notes?: string): Promise<WatchlistItem> {
    const watchlistItem: DBWatchlistInsert = {
      user_id: userId,
      movie_id: movieId,
      notes: notes ?? null,
      watched: false,
    }

    const { data, error } = await this.supabase
      .from('watchlist')
      .insert(watchlistItem)
      .select(
        `
        *,
        movies!inner(*)
      `
      )
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Movie already in watchlist')
      }
      throw new Error(`Failed to add to watchlist: ${error.message}`)
    }

    return {
      ...data,
      movie: data.movies ? this.movieRepo['toDomainMovie'](data.movies) : undefined,
    } as WatchlistItem
  }

  async markAsWatched(
    id: string,
    userId: string,
    updates: {
      rating?: number
      notes?: string
    }
  ): Promise<WatchlistItem> {
    const watchlistUpdate: DBWatchlistUpdate = {
      watched: true,
      watched_at: new Date().toISOString(),
      rating: updates.rating ?? null,
      notes: updates.notes ?? null,
    }

    const { data, error } = await this.supabase
      .from('watchlist')
      .update(watchlistUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select(
        `
        *,
        movies!inner(*)
      `
      )
      .single()

    if (error) throw new Error(`Failed to mark as watched: ${error.message}`)

    return {
      ...data,
      movie: data.movies ? this.movieRepo['toDomainMovie'](data.movies) : undefined,
    } as WatchlistItem
  }

  async updateWatchlistItem(
    id: string,
    userId: string,
    updates: {
      watched?: boolean
      rating?: number
      notes?: string
    }
  ): Promise<WatchlistItem> {
    const watchlistUpdate: DBWatchlistUpdate = {}

    if (updates.watched !== undefined) {
      watchlistUpdate.watched = updates.watched
      if (updates.watched) {
        watchlistUpdate.watched_at = new Date().toISOString()
      }
    }

    if (updates.rating !== undefined) {
      watchlistUpdate.rating = updates.rating
    }

    if (updates.notes !== undefined) {
      watchlistUpdate.notes = updates.notes
    }

    const { data, error } = await this.supabase
      .from('watchlist')
      .update(watchlistUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select(
        `
        *,
        movies!inner(*)
      `
      )
      .single()

    if (error) throw new Error(`Failed to update watchlist item: ${error.message}`)

    return {
      ...data,
      movie: data.movies ? this.movieRepo['toDomainMovie'](data.movies) : undefined,
    } as WatchlistItem
  }

  async removeFromWatchlist(userId: string, movieId: string): Promise<void> {
    const { error } = await this.supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId)

    if (error) throw new Error(`Failed to remove from watchlist: ${error.message}`)
  }

  async checkIfInWatchlist(userId: string, movieId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false
      throw new Error(`Failed to check watchlist: ${error.message}`)
    }

    return !!data
  }
}
