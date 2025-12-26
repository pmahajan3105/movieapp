/**
 * Local Storage Manager
 * 
 * Unified interface for all local mode data management
 */

import { getLocalUser, updateLocalUser, createLocalUser, LocalUser } from './local-user'
import { getLocalWatchlist, addToLocalWatchlist, removeFromLocalWatchlist, markAsWatched, updateLocalWatchlistItem, LocalWatchlistItem } from './local-watchlist'
import { getLocalRatings, addLocalRating, removeLocalRating, LocalRating } from './local-ratings'
import { logger } from '@/lib/logger'

export class LocalStorageManager {
  // User Management
  static getUser(): LocalUser | null {
    return getLocalUser()
  }

  static updateUser(updates: Partial<Omit<LocalUser, 'id' | 'createdAt'>>): LocalUser | null {
    return updateLocalUser(updates)
  }

  static createUser(name: string): LocalUser {
    return createLocalUser(name)
  }

  // Watchlist Management
  static getWatchlist(filters?: { watched?: boolean }): LocalWatchlistItem[] {
    const items = getLocalWatchlist()
    
    if (filters?.watched !== undefined) {
      return items.filter(item => item.watched === filters.watched)
    }
    
    return items
  }

  static addToWatchlist(movieId: string): LocalWatchlistItem {
    return addToLocalWatchlist(movieId)
  }

  static removeFromWatchlist(movieId: string): boolean {
    return removeFromLocalWatchlist(movieId)
  }

  static markMovieAsWatched(movieId: string, rating?: number): LocalWatchlistItem | null {
    return markAsWatched(movieId, rating)
  }

  static updateWatchlistItem(
    movieId: string,
    updates: Partial<Omit<LocalWatchlistItem, 'id' | 'movieId' | 'addedAt'>>
  ): LocalWatchlistItem | null {
    return updateLocalWatchlistItem(movieId, updates)
  }

  static isInWatchlist(movieId: string): boolean {
    const items = getLocalWatchlist()
    return items.some(item => item.movieId === movieId)
  }

  // Ratings Management
  static getRatings(): LocalRating[] {
    return getLocalRatings()
  }

  static addRating(
    movieId: string,
    interested: boolean,
    rating?: number,
    interactionType: string = 'browse'
  ): LocalRating {
    return addLocalRating(movieId, interested, rating, interactionType)
  }

  static removeRating(movieId: string): boolean {
    return removeLocalRating(movieId)
  }

  // Data Export/Import (for backup/restore)
  static exportAllData(): string {
    const data = {
      user: getLocalUser(),
      watchlist: getLocalWatchlist(),
      ratings: getLocalRatings(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
    
    return JSON.stringify(data, null, 2)
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.user) {
        localStorage.setItem('cineai_local_user', JSON.stringify(data.user))
      }
      
      if (data.watchlist) {
        localStorage.setItem('cineai_local_watchlist', JSON.stringify(data.watchlist))
      }
      
      if (data.ratings) {
        localStorage.setItem('cineai_local_ratings', JSON.stringify(data.ratings))
      }
      
      logger.info('Data imported successfully')
      return true
    } catch (error) {
      logger.error('Failed to import data', { error })
      return false
    }
  }

  // Clear all local data
  static clearAllData(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem('cineai_local_user')
    localStorage.removeItem('cineai_local_watchlist')
    localStorage.removeItem('cineai_local_ratings')
    
    logger.info('All local data cleared')
  }

  // Get statistics
  static getStats() {
    const watchlist = getLocalWatchlist()
    const ratings = getLocalRatings()
    
    return {
      totalWatchlistItems: watchlist.length,
      watchedMovies: watchlist.filter(item => item.watched).length,
      unwatchedMovies: watchlist.filter(item => !item.watched).length,
      totalRatings: ratings.length,
      likedMovies: ratings.filter(r => r.interested).length,
      dislikedMovies: ratings.filter(r => !r.interested).length,
    }
  }
}

export default LocalStorageManager

