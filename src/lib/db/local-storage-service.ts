/**
 * LocalStorageService - Data Access Layer for CineAI Personal Mode
 *
 * Provides all database operations for the local SQLite database.
 * Replaces Supabase client for personal/local mode.
 */

import { getDatabase, databaseExists } from './sqlite-client'
import { v4 as uuidv4 } from 'uuid'
import type { Movie, Rating, WatchlistItem } from '@/types'

// Types for database rows
interface UserProfileRow {
  id: number
  name: string
  created_at: string
  preferences: string
}

interface MovieRow {
  id: string
  tmdb_id: number | null
  imdb_id: string | null
  title: string
  year: number | null
  genre: string | null
  director: string | null
  cast: string | null
  plot: string | null
  poster_url: string | null
  backdrop_url: string | null
  rating: number | null
  runtime: number | null
  popularity: number | null
  source: string
  created_at: string
  updated_at: string
}

interface RatingRow {
  id: string
  movie_id: string
  rating: number | null
  interested: number
  rated_at: string
}

interface WatchlistRow {
  id: string
  movie_id: string
  added_at: string
  watched: number
  watched_at: string | null
  notes: string | null
}

interface InteractionRow {
  id: string
  movie_id: string | null
  interaction_type: string
  metadata: string | null
  created_at: string
}

interface ChatSessionRow {
  id: string
  messages: string
  preferences_extracted: number
  created_at: string
  updated_at: string
}

// Helper to parse JSON fields
function parseJson<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

// Helper to stringify JSON fields
function toJson(value: unknown): string {
  return JSON.stringify(value)
}

// Convert MovieRow to Movie type
function rowToMovie(row: MovieRow): Movie {
  return {
    id: row.id,
    tmdb_id: row.tmdb_id ?? undefined,
    imdb_id: row.imdb_id ?? undefined,
    title: row.title,
    year: row.year,
    genre: parseJson<string[]>(row.genre, []),
    director: parseJson<string[]>(row.director, []),
    cast: parseJson<string[]>(row.cast, []),
    plot: row.plot ?? undefined,
    poster_url: row.poster_url ?? undefined,
    backdrop_url: row.backdrop_url ?? undefined,
    rating: row.rating ?? undefined,
    runtime: row.runtime ?? undefined,
    popularity: row.popularity ?? undefined,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Local Storage Service
 * Singleton service for all database operations
 */
class LocalStorageServiceClass {
  // ==================== User Profile ====================

  getUserProfile(): { name: string; preferences: Record<string, unknown> } | null {
    if (!databaseExists()) return null

    const db = getDatabase()
    const row = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as
      | UserProfileRow
      | undefined

    if (!row) return null

    return {
      name: row.name,
      preferences: parseJson<Record<string, unknown>>(row.preferences, {}),
    }
  }

  updateUserProfile(data: {
    name?: string
    preferences?: Record<string, unknown>
  }): { name: string; preferences: Record<string, unknown> } {
    const db = getDatabase()

    if (data.name !== undefined) {
      db.prepare('UPDATE user_profile SET name = ? WHERE id = 1').run(data.name)
    }

    if (data.preferences !== undefined) {
      db.prepare('UPDATE user_profile SET preferences = ? WHERE id = 1').run(
        toJson(data.preferences)
      )
    }

    return this.getUserProfile()!
  }

  createUserProfile(name: string): void {
    const db = getDatabase()
    db.prepare('INSERT OR REPLACE INTO user_profile (id, name, preferences) VALUES (1, ?, ?)').run(
      name,
      '{}'
    )
  }

  // ==================== Movies ====================

  getMovies(options?: {
    limit?: number
    offset?: number
    query?: string
    genres?: string[]
    topRated?: boolean
  }): { movies: Movie[]; total: number } {
    const db = getDatabase()
    const params: unknown[] = []

    let whereClause = '1=1'

    if (options?.query) {
      whereClause += ' AND title LIKE ?'
      params.push(`%${options.query}%`)
    }

    if (options?.genres && options.genres.length > 0) {
      // SQLite JSON contains check
      const genreConditions = options.genres.map(() => "genre LIKE ?").join(' OR ')
      whereClause += ` AND (${genreConditions})`
      options.genres.forEach((g) => params.push(`%"${g}"%`))
    }

    // Get total count
    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM movies WHERE ${whereClause}`)
      .get(...params) as { count: number }
    const total = countRow.count

    // Build order clause
    let orderClause = 'popularity DESC NULLS LAST'
    if (options?.topRated) {
      orderClause = 'rating DESC NULLS LAST'
    }

    // Get movies with pagination
    const limit = options?.limit || 20
    const offset = options?.offset || 0

    const rows = db
      .prepare(
        `SELECT * FROM movies WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as MovieRow[]

    return {
      movies: rows.map(rowToMovie),
      total,
    }
  }

  getMovieById(id: string): Movie | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as MovieRow | undefined
    return row ? rowToMovie(row) : null
  }

  // Alias for getMovieById
  getMovie(id: string): Movie | null {
    return this.getMovieById(id)
  }

  getMovieByTmdbId(tmdbId: number): Movie | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdbId) as
      | MovieRow
      | undefined
    return row ? rowToMovie(row) : null
  }

  upsertMovie(movie: Partial<Movie> & { title: string }): Movie {
    const db = getDatabase()
    const id = movie.id || uuidv4()
    const now = new Date().toISOString()

    // Check if movie exists by tmdb_id or id
    let existing: MovieRow | undefined
    if (movie.tmdb_id) {
      existing = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(movie.tmdb_id) as
        | MovieRow
        | undefined
    }
    if (!existing && movie.id) {
      existing = db.prepare('SELECT * FROM movies WHERE id = ?').get(movie.id) as
        | MovieRow
        | undefined
    }

    if (existing) {
      // Update existing
      db.prepare(
        `UPDATE movies SET
          title = COALESCE(?, title),
          year = COALESCE(?, year),
          genre = COALESCE(?, genre),
          director = COALESCE(?, director),
          cast = COALESCE(?, cast),
          plot = COALESCE(?, plot),
          poster_url = COALESCE(?, poster_url),
          backdrop_url = COALESCE(?, backdrop_url),
          rating = COALESCE(?, rating),
          runtime = COALESCE(?, runtime),
          popularity = COALESCE(?, popularity),
          imdb_id = COALESCE(?, imdb_id),
          updated_at = ?
        WHERE id = ?`
      ).run(
        movie.title,
        movie.year ?? null,
        movie.genre ? toJson(movie.genre) : null,
        movie.director ? toJson(movie.director) : null,
        movie.cast ? toJson(movie.cast) : null,
        movie.plot ?? null,
        movie.poster_url ?? null,
        movie.backdrop_url ?? null,
        movie.rating ?? null,
        movie.runtime ?? null,
        movie.popularity ?? null,
        movie.imdb_id ?? null,
        now,
        existing.id
      )
      return this.getMovieById(existing.id)!
    } else {
      // Insert new
      db.prepare(
        `INSERT INTO movies (id, tmdb_id, imdb_id, title, year, genre, director, cast, plot, poster_url, backdrop_url, rating, runtime, popularity, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        movie.tmdb_id ?? null,
        movie.imdb_id ?? null,
        movie.title,
        movie.year ?? null,
        movie.genre ? toJson(movie.genre) : null,
        movie.director ? toJson(movie.director) : null,
        movie.cast ? toJson(movie.cast) : null,
        movie.plot ?? null,
        movie.poster_url ?? null,
        movie.backdrop_url ?? null,
        movie.rating ?? null,
        movie.runtime ?? null,
        movie.popularity ?? null,
        movie.source || 'tmdb',
        now,
        now
      )
      return this.getMovieById(id)!
    }
  }

  // ==================== Ratings ====================

  getRatings(): Array<Rating & { movie?: Movie }> {
    const db = getDatabase()
    const rows = db
      .prepare(
        `SELECT r.*, m.title, m.year, m.tmdb_id as movie_tmdb_id
       FROM ratings r
       LEFT JOIN movies m ON r.movie_id = m.id
       ORDER BY r.rated_at DESC`
      )
      .all() as Array<RatingRow & { title: string; year: number; movie_tmdb_id: number }>

    return rows.map((row) => ({
      id: row.id,
      user_id: 'local-user',
      movie_id: row.movie_id,
      rating: row.rating ?? undefined,
      interested: row.interested === 1,
      rated_at: row.rated_at,
      movie: row.title
        ? {
            id: row.movie_id,
            title: row.title,
            year: row.year,
            tmdb_id: row.movie_tmdb_id,
          }
        : undefined,
    }))
  }

  getRatingForMovie(movieId: string): Rating | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM ratings WHERE movie_id = ?').get(movieId) as
      | RatingRow
      | undefined

    if (!row) return null

    return {
      id: row.id,
      user_id: 'local-user',
      movie_id: row.movie_id,
      rating: row.rating ?? undefined,
      interested: row.interested === 1,
      rated_at: row.rated_at,
    }
  }

  upsertRating(
    movieId: string,
    data: { rating?: number; interested?: boolean }
  ): Rating {
    const db = getDatabase()
    const existing = this.getRatingForMovie(movieId)
    const now = new Date().toISOString()

    if (existing) {
      db.prepare(
        `UPDATE ratings SET
          rating = COALESCE(?, rating),
          interested = COALESCE(?, interested),
          rated_at = ?
        WHERE movie_id = ?`
      ).run(data.rating ?? null, data.interested !== undefined ? (data.interested ? 1 : 0) : null, now, movieId)
    } else {
      const id = uuidv4()
      db.prepare(
        `INSERT INTO ratings (id, movie_id, rating, interested, rated_at)
        VALUES (?, ?, ?, ?, ?)`
      ).run(id, movieId, data.rating ?? null, data.interested !== false ? 1 : 0, now)
    }

    return this.getRatingForMovie(movieId)!
  }

  deleteRating(movieId: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM ratings WHERE movie_id = ?').run(movieId)
  }

  // ==================== Watchlist ====================

  getWatchlist(): Array<WatchlistItem & { movie?: Movie }> {
    const db = getDatabase()
    const rows = db
      .prepare(
        `SELECT w.*, m.title, m.year, m.poster_url, m.tmdb_id as movie_tmdb_id, m.genre, m.rating as movie_rating
       FROM watchlist w
       LEFT JOIN movies m ON w.movie_id = m.id
       ORDER BY w.added_at DESC`
      )
      .all() as Array<
      WatchlistRow & {
        title: string
        year: number
        poster_url: string
        movie_tmdb_id: number
        genre: string
        movie_rating: number
      }
    >

    return rows.map((row) => ({
      id: row.id,
      user_id: 'local-user',
      movie_id: row.movie_id,
      added_at: row.added_at,
      watched: row.watched === 1,
      watched_at: row.watched_at ?? undefined,
      notes: row.notes ?? undefined,
      movie: row.title
        ? {
            id: row.movie_id,
            title: row.title,
            year: row.year,
            poster_url: row.poster_url,
            tmdb_id: row.movie_tmdb_id,
            genre: parseJson<string[]>(row.genre, []),
            rating: row.movie_rating,
          }
        : undefined,
    }))
  }

  getWatchlistItem(movieId: string): WatchlistItem | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM watchlist WHERE movie_id = ?').get(movieId) as
      | WatchlistRow
      | undefined

    if (!row) return null

    return {
      id: row.id,
      user_id: 'local-user',
      movie_id: row.movie_id,
      added_at: row.added_at,
      watched: row.watched === 1,
      watched_at: row.watched_at ?? undefined,
      notes: row.notes ?? undefined,
    }
  }

  addToWatchlist(movieId: string, notes?: string): WatchlistItem {
    const db = getDatabase()
    const existing = this.getWatchlistItem(movieId)

    if (existing) {
      return existing
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO watchlist (id, movie_id, added_at, watched, notes)
      VALUES (?, ?, ?, 0, ?)`
    ).run(id, movieId, now, notes ?? null)

    return this.getWatchlistItem(movieId)!
  }

  removeFromWatchlist(movieId: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM watchlist WHERE movie_id = ?').run(movieId)
  }

  markWatched(movieId: string, watched: boolean = true): WatchlistItem | null {
    const db = getDatabase()
    const now = new Date().toISOString()

    db.prepare(
      `UPDATE watchlist SET watched = ?, watched_at = ? WHERE movie_id = ?`
    ).run(watched ? 1 : 0, watched ? now : null, movieId)

    return this.getWatchlistItem(movieId)
  }

  // ==================== Interactions ====================

  recordInteraction(
    type: string,
    movieId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO user_interactions (id, movie_id, interaction_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)`
    ).run(id, movieId ?? null, type, metadata ? toJson(metadata) : null, now)
  }

  getRecentInteractions(
    days: number = 30
  ): Array<{ type: string; movie_id: string | null; metadata: Record<string, unknown>; created_at: string }> {
    const db = getDatabase()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const rows = db
      .prepare(
        `SELECT * FROM user_interactions
       WHERE created_at >= ?
       ORDER BY created_at DESC`
      )
      .all(cutoff.toISOString()) as InteractionRow[]

    return rows.map((row) => ({
      type: row.interaction_type,
      movie_id: row.movie_id,
      metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
      created_at: row.created_at,
    }))
  }

  // Get interactions with optional limit
  getInteractions(limit: number = 100): Array<{
    id: string
    interaction_type: string
    movie_id: string | null
    metadata: Record<string, unknown>
    created_at: string
  }> {
    const db = getDatabase()

    const rows = db
      .prepare(
        `SELECT * FROM user_interactions
       ORDER BY created_at DESC
       LIMIT ?`
      )
      .all(limit) as InteractionRow[]

    return rows.map((row) => ({
      id: row.id,
      interaction_type: row.interaction_type,
      movie_id: row.movie_id,
      metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
      created_at: row.created_at,
    }))
  }

  // ==================== Chat Sessions ====================

  getChatSession(sessionId: string): {
    id: string
    messages: Array<{ role: string; content: string }>
    preferencesExtracted: boolean
  } | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(sessionId) as
      | ChatSessionRow
      | undefined

    if (!row) return null

    return {
      id: row.id,
      messages: parseJson<Array<{ role: string; content: string }>>(row.messages, []),
      preferencesExtracted: row.preferences_extracted === 1,
    }
  }

  createChatSession(): string {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO chat_sessions (id, messages, preferences_extracted, created_at, updated_at)
      VALUES (?, '[]', 0, ?, ?)`
    ).run(id, now, now)

    return id
  }

  updateChatSession(
    sessionId: string,
    data: {
      messages?: Array<{ role: string; content: string }>
      preferencesExtracted?: boolean
    }
  ): void {
    const db = getDatabase()
    const now = new Date().toISOString()

    if (data.messages !== undefined) {
      db.prepare('UPDATE chat_sessions SET messages = ?, updated_at = ? WHERE id = ?').run(
        toJson(data.messages),
        now,
        sessionId
      )
    }

    if (data.preferencesExtracted !== undefined) {
      db.prepare(
        'UPDATE chat_sessions SET preferences_extracted = ?, updated_at = ? WHERE id = ?'
      ).run(data.preferencesExtracted ? 1 : 0, now, sessionId)
    }
  }

  // ==================== Stats & Utilities ====================

  getStats(): {
    totalMovies: number
    totalRatings: number
    watchlistCount: number
    interactionCount: number
  } {
    const db = getDatabase()

    const movies = db.prepare('SELECT COUNT(*) as count FROM movies').get() as { count: number }
    const ratings = db.prepare('SELECT COUNT(*) as count FROM ratings').get() as { count: number }
    const watchlist = db.prepare('SELECT COUNT(*) as count FROM watchlist').get() as {
      count: number
    }
    const interactions = db.prepare('SELECT COUNT(*) as count FROM user_interactions').get() as {
      count: number
    }

    return {
      totalMovies: movies.count,
      totalRatings: ratings.count,
      watchlistCount: watchlist.count,
      interactionCount: interactions.count,
    }
  }

  // Get genre preferences based on ratings
  getGenrePreferences(): Map<string, number> {
    const db = getDatabase()
    const preferences = new Map<string, number>()

    const rows = db
      .prepare(
        `SELECT m.genre, r.rating, r.interested
       FROM ratings r
       JOIN movies m ON r.movie_id = m.id
       WHERE m.genre IS NOT NULL`
      )
      .all() as Array<{ genre: string; rating: number | null; interested: number }>

    for (const row of rows) {
      const genres = parseJson<string[]>(row.genre, [])
      const weight = row.rating ? (row.rating - 1) / 4 : row.interested ? 0.5 : 0

      for (const genre of genres) {
        preferences.set(genre, (preferences.get(genre) || 0) + weight)
      }
    }

    // Normalize
    const max = Math.max(...Array.from(preferences.values()), 1)
    for (const [genre, weight] of preferences) {
      preferences.set(genre, weight / max)
    }

    return preferences
  }
}

// Export singleton instance
export const LocalStorageService = new LocalStorageServiceClass()

// Export for testing
export { LocalStorageServiceClass }
