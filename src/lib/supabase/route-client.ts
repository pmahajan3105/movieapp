import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { Database } from './types'

/**
 * Create a Supabase client inside a Next.js API Route.
 * Handles per-request cookies so auth/session continues to work.
 *
 * Usage (inside route handler):
 * ```ts
 * import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
 * const supabase = createRouteSupabaseClient(request)
 * ```
 */
export function createRouteSupabaseClient(request: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          /* API routes don't mutate cookies */
        },
        remove() {
          /* API routes don't mutate cookies */
        },
      },
    }
  )
} 