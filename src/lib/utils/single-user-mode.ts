/**
 * Single User Mode Utilities
 * 
 * Provides frictionless local development by bypassing authentication
 * when SINGLE_USER_MODE is enabled.
 */

export interface SingleUserConfig {
  enabled: boolean
  userId: string
}

/**
 * Get single user mode configuration from environment variables
 */
export function getSingleUserConfig(): SingleUserConfig {
  const enabled = process.env.SINGLE_USER_MODE === 'true'
  const userId = process.env.SINGLE_USER_ID || 'default-user'
  
  return {
    enabled,
    userId
  }
}

/**
 * Get the current user ID, either from auth or single user mode
 */
export function getCurrentUserId(authUserId?: string | null): string {
  const config = getSingleUserConfig()
  
  if (config.enabled) {
    return config.userId
  }
  
  if (!authUserId) {
    throw new Error('Authentication required when SINGLE_USER_MODE is disabled')
  }
  
  return authUserId
}

/**
 * Check if single user mode is enabled
 */
export function isSingleUserMode(): boolean {
  return getSingleUserConfig().enabled
}

/**
 * Get user context for API routes
 * Returns either the authenticated user or single user mode user
 */
export function getUserContext(authUserId?: string | null) {
  const config = getSingleUserConfig()
  
  if (config.enabled) {
    return {
      id: config.userId,
      email: 'single-user@local.dev',
      isSingleUser: true
    }
  }
  
  if (!authUserId) {
    throw new Error('Authentication required when SINGLE_USER_MODE is disabled')
  }
  
  return {
    id: authUserId,
    email: 'authenticated@user.com',
    isSingleUser: false
  }
}
