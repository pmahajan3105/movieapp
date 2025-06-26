import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from '../../types/supabase-generated'

// Server client for server components and API routes
export const createServerClient = cache(async () => {
  // MUST await for dynamic cookies API
  const cookieStore = await cookies()

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              /* called from a Server Component – safe to ignore */
            }
          })
        },
      },
    }
  )
})
