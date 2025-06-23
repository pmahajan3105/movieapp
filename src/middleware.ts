import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check authentication only for dashboard routes
  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isWatchlistRoute = pathname.startsWith('/watchlist') && pathname !== '/watchlist'

  // Only check auth for dashboard and specific protected routes
  if (isDashboardRoute || isWatchlistRoute) {
    // Get user session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // If no user, redirect to login
    if (!user || error) {
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
     * Match dashboard and protected routes only
     * Skip all API routes except specific ones that need auth
     */
    '/dashboard/:path*',
    '/watchlist/:path*',
  ],
}
