import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

/**
 * Utility functions for user authentication and management in API routes
 */

/**
 * Get the authenticated user ID from a request
 */
export async function getUserId(requestOrClient: NextRequest | SupabaseClient<any>): Promise<string | null> {
  try {
    // If a Supabase client is passed directly, use it; otherwise create one from the incoming request
    const supabase: SupabaseClient =
      // Rough duck-typing check – Supabase clients have an `auth` property
      (requestOrClient as SupabaseClient).auth ?
        (requestOrClient as SupabaseClient) :
        // Build a route handler client from the request's cookies
        createRouteHandlerClient({ cookies: () => Promise.resolve((requestOrClient as NextRequest).cookies as any) }) as any
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user.id
  } catch (error) {
    logger.authError('getting user ID', error as Error)
    return null
  }
}

/**
 * Get the authenticated user with profile information
 */
export async function getUserWithProfile(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => Promise.resolve(request.cookies as any) }) as any
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { user: null, profile: null, error: authError }
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    return { 
      user, 
      profile: profile || null, 
      error: profileError 
    }
  } catch (error) {
    logger.authError('getting user with profile', error as Error)
    return { user: null, profile: null, error }
  }
}

/**
 * Require authentication for an API route
 */
export async function requireAuth(request: NextRequest) {
  const userId = await getUserId(request)
  
  if (!userId) {
    throw new Error('Authentication required')
  }
  
  return userId
}

/**
 * Get user preferences from profile
 */
export async function getUserPreferences(request: NextRequest) {
  try {
    const { user, profile } = await getUserWithProfile(request)
    
    if (!user || !profile) {
      return null
    }
    
    return {
      favorite_genres: profile.favorite_genres || [],
      favorite_directors: profile.favorite_directors || [],
      quality_threshold: profile.quality_threshold || 7.0,
      onboarding_completed: profile.onboarding_completed || false,
    }
  } catch (error) {
    logger.error('Error getting user preferences', { error })
    return null
  }
}