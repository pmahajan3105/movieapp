import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRequiredEnvVar } from '@/lib/utils/env-validation'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next()

  const supabase = createServerClient(
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        /**
         * Supabase SSR helper expects getAll / setAll pattern.
         * We proxy those to NextRequest/NextResponse cookies APIs.
         */
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Ensure we have a response object to attach cookies to
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  
  // Get current session for auth checks
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  // Redirect authenticated users from home page to dashboard
  if (pathname === '/' && session?.user && !error) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check authentication only for dashboard routes
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isWatchlistRoute = pathname.startsWith('/watchlist') && pathname !== '/watchlist'

  // Only check auth for dashboard and specific protected routes
  if (isDashboardRoute || isWatchlistRoute) {
    // If no valid session/user, redirect to login
    if (!session?.user || error) {
      const loginUrl = new URL('/auth/login', request.url)

      // Add return URL for after login
      if (pathname !== '/auth/login') {
        loginUrl.searchParams.set('next', pathname)
      }

      return NextResponse.redirect(loginUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match home page and protected routes
     * Skip all API routes except specific ones that need auth
     */
    '/',
    '/dashboard/:path*',
    '/watchlist/:path*',
  ],
}
