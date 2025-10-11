/**
 * Local User Management
 * 
 * Manages local users who don't need authentication.
 * Data is stored in localStorage and used with single user mode.
 */

import { logger } from '@/lib/logger'

export interface LocalUser {
  id: string
  name: string
  createdAt: string
  lastUsed: string
}

const LOCAL_USER_KEY = 'cineai_local_user'

/**
 * Generate a unique user ID for local users
 */
function generateLocalUserId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Check if we're in local/single user mode
 */
export function isLocalMode(): boolean {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return process.env.SINGLE_USER_MODE === 'true'
  }
  
  // Check Next.js public env var
  return process.env.NEXT_PUBLIC_SINGLE_USER_MODE === 'true' || 
         process.env.SINGLE_USER_MODE === 'true'
}

/**
 * Get the current local user from localStorage
 */
export function getLocalUser(): LocalUser | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(LOCAL_USER_KEY)
    if (!stored) return null
    
    const user = JSON.parse(stored) as LocalUser
    
    // Update last used timestamp
    user.lastUsed = new Date().toISOString()
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user))
    
    return user
  } catch (error) {
    logger.error('Error reading local user', { error })
    return null
  }
}

/**
 * Create a new local user
 */
export function createLocalUser(name: string): LocalUser {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create local user on server')
  }
  
  const user: LocalUser = {
    id: generateLocalUserId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString()
  }
  
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user))
    logger.info('Created local user', { userId: user.id, name: user.name })
    return user
  } catch (error) {
    logger.error('Error creating local user', { error })
    throw error
  }
}

/**
 * Update local user information
 */
export function updateLocalUser(updates: Partial<Omit<LocalUser, 'id' | 'createdAt'>>): LocalUser | null {
  const currentUser = getLocalUser()
  if (!currentUser) return null
  
  const updatedUser: LocalUser = {
    ...currentUser,
    ...updates,
    lastUsed: new Date().toISOString()
  }
  
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser))
    logger.info('Updated local user', { userId: updatedUser.id })
    return updatedUser
  } catch (error) {
    logger.error('Error updating local user', { error })
    return null
  }
}

/**
 * Clear local user data (logout)
 */
export function clearLocalUser(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(LOCAL_USER_KEY)
    logger.info('Cleared local user')
  } catch (error) {
    logger.error('Error clearing local user', { error })
  }
}

/**
 * Check if a local user exists
 */
export function hasLocalUser(): boolean {
  return getLocalUser() !== null
}

