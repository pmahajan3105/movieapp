import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../../types/supabase-generated'

// Browser client for client components
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []

          return document.cookie
            .split('; ')
            .filter(Boolean)
            .map(cookie => {
              const [name, ...rest] = cookie.split('=')
              return {
                name: name || '',
                value: decodeURIComponent(rest.join('=') || ''),
              }
            })
            .filter(cookie => cookie.name) // Filter out cookies without names
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return

          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${encodeURIComponent(value)}`
            if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
            if (options?.path) cookie += `; path=${options.path}`
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
            if (options?.secure) cookie += '; secure'
            document.cookie = cookie
          })
        },
      },
    }
  )
}

// Singleton client for client components
export const supabase = createBrowserSupabaseClient()
