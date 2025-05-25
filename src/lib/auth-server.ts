import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Get the authenticated user from a Next.js API route
 * Returns null if no user is authenticated
 */
export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // In API routes, we typically don't need to set cookies
            // but this is required by the interface
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

/**
 * Get the authenticated user ID from a Next.js API route
 * Returns null if no user is authenticated
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const user = await getAuthenticatedUser()
  return user?.id || null
}

/**
 * Require authentication in an API route
 * Throws an error if no user is authenticated
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
} 