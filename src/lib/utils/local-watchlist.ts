/**
 * Local Watchlist Management
 * 
 * Manages watchlist data in localStorage for local mode users
 */

import { logger } from '@/lib/logger'

export interface LocalWatchlistItem {
  id: string
  movieId: string
  addedAt: string
  watched: boolean
  watchedAt?: string
  rating?: number
  notes?: string
}

const LOCAL_WATCHLIST_KEY = 'cineai_local_watchlist'

/**
 * Get all watchlist items from localStorage
 */
export function getLocalWatchlist(): LocalWatchlistItem[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(LOCAL_WATCHLIST_KEY)
    if (!stored) return []
    
    return JSON.parse(stored) as LocalWatchlistItem[]
  } catch (error) {
    logger.error('Error reading local watchlist', { error })
    return []
  }
}

/**
 * Save watchlist items to localStorage
 */
function saveLocalWatchlist(items: LocalWatchlistItem[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(items))
  } catch (error) {
    logger.error('Error saving local watchlist', { error })
  }
}

/**
 * Add a movie to local watchlist
 */
export function addToLocalWatchlist(movieId: string): LocalWatchlistItem {
  const items = getLocalWatchlist()
  
  // Check if already in watchlist
  const existing = items.find(item => item.movieId === movieId)
  if (existing) {
    return existing
  }
  
  const newItem: LocalWatchlistItem = {
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    movieId,
    addedAt: new Date().toISOString(),
    watched: false
  }
  
  items.push(newItem)
  saveLocalWatchlist(items)
  
  logger.info('Added to local watchlist', { movieId })
  return newItem
}

/**
 * Remove a movie from local watchlist
 */
export function removeFromLocalWatchlist(movieId: string): boolean {
  const items = getLocalWatchlist()
  const filtered = items.filter(item => item.movieId !== movieId)
  
  if (filtered.length === items.length) {
    return false // Item not found
  }
  
  saveLocalWatchlist(filtered)
  logger.info('Removed from local watchlist', { movieId })
  return true
}

/**
 * Mark a movie as watched
 */
export function markAsWatched(movieId: string, rating?: number): LocalWatchlistItem | null {
  const items = getLocalWatchlist()
  const item = items.find(item => item.movieId === movieId)
  
  if (!item) {
    return null
  }
  
  item.watched = true
  item.watchedAt = new Date().toISOString()
  if (rating !== undefined) {
    item.rating = rating
  }
  
  saveLocalWatchlist(items)
  logger.info('Marked as watched', { movieId, rating })
  return item
}

/**
 * Update watchlist item
 */
export function updateLocalWatchlistItem(
  movieId: string, 
  updates: Partial<Omit<LocalWatchlistItem, 'id' | 'movieId' | 'addedAt'>>
): LocalWatchlistItem | null {
  const items = getLocalWatchlist()
  const item = items.find(item => item.movieId === movieId)
  
  if (!item) {
    return null
  }
  
  Object.assign(item, updates)
  saveLocalWatchlist(items)
  
  logger.info('Updated local watchlist item', { movieId, updates })
  return item
}

/**
 * Check if a movie is in watchlist
 */
export function isInLocalWatchlist(movieId: string): boolean {
  const items = getLocalWatchlist()
  return items.some(item => item.movieId === movieId)
}

/**
 * Get filtered watchlist items
 */
export function getFilteredLocalWatchlist(filters?: { watched?: boolean }): LocalWatchlistItem[] {
  let items = getLocalWatchlist()
  
  if (filters?.watched !== undefined) {
    items = items.filter(item => item.watched === filters.watched)
  }
  
  return items
}

/**
 * Clear all local watchlist data
 */
export function clearLocalWatchlist(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(LOCAL_WATCHLIST_KEY)
    logger.info('Cleared local watchlist')
  } catch (error) {
    logger.error('Error clearing local watchlist', { error })
  }
}

