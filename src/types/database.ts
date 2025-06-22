export interface DatabaseMovie {
  id: string
  title: string
  year?: number
  genre: string[]
  director: string[]
  actors: string[]
  plot?: string
  poster_url?: string
  rating?: number // Changed from imdb_rating
  runtime?: number
  imdb_id?: string
  tmdb_id?: number
  created_at: string
  updated_at: string
}

export interface DatabaseWatchlistItem {
  id: string
  user_id: string
  movie_id: string
  added_at: string
  watched: boolean
  watched_at?: string
  notes?: string
  // No rating column (removed as per streamlined scope)
}

export interface DatabaseRating {
  id: string
  user_id: string
  movie_id: string
  interested: boolean // true = like, false = dislike
  interaction_type?: string
  source?: string
  rated_at: string
  // No updated_at column (removed to fix trigger error)
  // No rating column (simplified to like/dislike only)
}

// Updated type exports for the app
export type Movie = DatabaseMovie
export type WatchlistItem = DatabaseWatchlistItem & {
  movies?: Movie // For joined queries
}
export type Rating = DatabaseRating
