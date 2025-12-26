/**
 * Local Ratings Management
 * 
 * Manages movie ratings in localStorage for local mode users
 */

import { logger } from '@/lib/logger'

export interface LocalRating {
  id: string
  movieId: string
  rating?: number
  interested: boolean
  interactionType: string
  ratedAt: string
}

const LOCAL_RATINGS_KEY = 'cineai_local_ratings'

/**
 * Get all ratings from localStorage
 */
export function getLocalRatings(): LocalRating[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(LOCAL_RATINGS_KEY)
    if (!stored) return []
    
    return JSON.parse(stored) as LocalRating[]
  } catch (error) {
    logger.error('Error reading local ratings', { error })
    return []
  }
}

/**
 * Save ratings to localStorage
 */
function saveLocalRatings(ratings: LocalRating[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(ratings))
  } catch (error) {
    logger.error('Error saving local ratings', { error })
  }
}

/**
 * Add or update a rating
 */
export function addLocalRating(
  movieId: string,
  interested: boolean,
  rating?: number,
  interactionType: string = 'browse'
): LocalRating {
  const ratings = getLocalRatings()
  
  // Check if already rated
  const existingIndex = ratings.findIndex(r => r.movieId === movieId)
  
  const existingRating = existingIndex >= 0 ? ratings[existingIndex] : null
  const ratingData: LocalRating = {
    id: existingRating?.id ?? `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    movieId,
    rating,
    interested,
    interactionType,
    ratedAt: new Date().toISOString()
  }
  
  if (existingIndex >= 0) {
    ratings[existingIndex] = ratingData
  } else {
    ratings.push(ratingData)
  }
  
  saveLocalRatings(ratings)
  logger.info('Added/updated local rating', { movieId, interested, rating })
  
  return ratingData
}

/**
 * Get rating for a specific movie
 */
export function getLocalRating(movieId: string): LocalRating | null {
  const ratings = getLocalRatings()
  return ratings.find(r => r.movieId === movieId) || null
}

/**
 * Remove a rating
 */
export function removeLocalRating(movieId: string): boolean {
  const ratings = getLocalRatings()
  const filtered = ratings.filter(r => r.movieId !== movieId)
  
  if (filtered.length === ratings.length) {
    return false // Rating not found
  }
  
  saveLocalRatings(filtered)
  logger.info('Removed local rating', { movieId })
  return true
}

/**
 * Clear all local ratings
 */
export function clearLocalRatings(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(LOCAL_RATINGS_KEY)
    logger.info('Cleared local ratings')
  } catch (error) {
    logger.error('Error clearing local ratings', { error })
  }
}

