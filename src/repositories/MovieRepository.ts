import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-generated'
import type { Movie } from '@/types'

type DBMovie = Database['public']['Tables']['movies']['Row']
type DBMovieInsert = Database['public']['Tables']['movies']['Insert']

export class MovieRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  // Convert database movie to domain Movie type
  public toDomainMovie(dbMovie: DBMovie): Movie {
    return {
      ...dbMovie,
      poster_url: dbMovie.poster_url ?? undefined,
      plot: dbMovie.plot ?? undefined,
      rating: dbMovie.rating ?? undefined,
      runtime: dbMovie.runtime ?? undefined,
      imdb_id: dbMovie.imdb_id ?? undefined,
      tmdb_id: dbMovie.tmdb_id ?? undefined,
      year: dbMovie.year ?? undefined,
      genre: dbMovie.genre ?? undefined,
      director: dbMovie.director ?? undefined,
      created_at: dbMovie.created_at ?? undefined,
      updated_at: dbMovie.updated_at ?? undefined,
    } as Movie
  }

  // Convert domain Movie to database insert type
  private toDBMovie(movie: Partial<Movie>): Partial<DBMovieInsert> {
    return {
      ...movie,
      poster_url: movie.poster_url === undefined ? null : movie.poster_url,
      plot: movie.plot === undefined ? null : movie.plot,
      rating: movie.rating === undefined ? null : movie.rating,
      runtime: movie.runtime === undefined ? null : movie.runtime,
      imdb_id: movie.imdb_id === undefined ? null : movie.imdb_id,
      tmdb_id: movie.tmdb_id === undefined ? null : movie.tmdb_id,
      year: movie.year === undefined ? null : movie.year,
      genre: movie.genre === undefined ? null : movie.genre,
      director: movie.director === undefined ? null : movie.director,
    }
  }

  async findById(id: string): Promise<Movie | null> {
    const { data, error } = await this.supabase.from('movies').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find movie: ${error.message}`)
    }

    return this.toDomainMovie(data)
  }

  async findByTmdbId(tmdbId: number): Promise<Movie | null> {
    const { data, error } = await this.supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find movie by TMDB ID: ${error.message}`)
    }

    return this.toDomainMovie(data)
  }

  async findByImdbId(imdbId: string): Promise<Movie | null> {
    const { data, error } = await this.supabase
      .from('movies')
      .select('*')
      .eq('imdb_id', imdbId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find movie by IMDB ID: ${error.message}`)
    }

    return this.toDomainMovie(data)
  }

  async create(movie: Omit<Movie, 'id' | 'created_at' | 'updated_at'>): Promise<Movie> {
    const dbMovie = this.toDBMovie(movie) as DBMovieInsert

    const { data, error } = await this.supabase.from('movies').insert(dbMovie).select().single()

    if (error) throw new Error(`Failed to create movie: ${error.message}`)
    return this.toDomainMovie(data)
  }

  async upsert(movie: Omit<Movie, 'id' | 'created_at' | 'updated_at'>): Promise<Movie> {
    const dbMovie = this.toDBMovie(movie) as DBMovieInsert

    const { data, error } = await this.supabase
      .from('movies')
      .upsert(dbMovie, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (error) throw new Error(`Failed to upsert movie: ${error.message}`)
    return this.toDomainMovie(data)
  }

  async update(id: string, updates: Partial<Movie>): Promise<Movie> {
    const dbUpdates = this.toDBMovie(updates)

    const { data, error } = await this.supabase
      .from('movies')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update movie: ${error.message}`)
    return this.toDomainMovie(data)
  }

  async search(
    query: string,
    filters?: {
      genres?: string[]
      yearRange?: { min?: number; max?: number }
      minRating?: number
      maxRating?: number
      limit?: number
      offset?: number
    }
  ): Promise<{ movies: Movie[]; total: number }> {
    let dbQuery = this.supabase.from('movies').select('*', { count: 'exact' })

    if (query) {
      dbQuery = dbQuery.ilike('title', `%${query}%`)
    }

    if (filters?.genres?.length) {
      dbQuery = dbQuery.overlaps('genre', filters.genres)
    }
    if (filters?.yearRange?.min) {
      dbQuery = dbQuery.gte('year', filters.yearRange.min)
    }
    if (filters?.yearRange?.max) {
      dbQuery = dbQuery.lte('year', filters.yearRange.max)
    }
    if (filters?.minRating) {
      dbQuery = dbQuery.gte('rating', filters.minRating)
    }
    if (filters?.maxRating) {
      dbQuery = dbQuery.lte('rating', filters.maxRating)
    }

    const limit = filters?.limit || 20
    const offset = filters?.offset || 0

    const { data, error, count } = await dbQuery
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(`Failed to search movies: ${error.message}`)

    return {
      movies: (data || []).map(movie => this.toDomainMovie(movie)),
      total: count || 0,
    }
  }

  async findOrCreateFromTmdb(
    tmdbId: number,
    movieData: Omit<Movie, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Movie> {
    // First try to find existing movie
    const existing = await this.findByTmdbId(tmdbId)
    if (existing) return existing

    // Create new movie
    return this.create(movieData)
  }
}
