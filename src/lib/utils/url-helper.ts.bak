/**
 * URL Helper for Supabase Authentication Redirects
 * Ensures magic links and OAuth flows work correctly in all environments
 */

/**
 * Gets the current site URL based on environment
 * Works for local development, Vercel previews, and production
 */
export function getSiteURL(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL || // Set this to your site URL in production
    process.env.NEXT_PUBLIC_VERCEL_URL || // Automatically set by Vercel
    process.env.VERCEL_URL || // Fallback for Vercel environments
    getLocalDevelopmentURL() // Smart localhost detection

  // Make sure to include `https://` when not localhost
  url = url.startsWith('http') ? url : `https://${url}`

  // Remove trailing slash for consistency
  url = url.endsWith('/') ? url.slice(0, -1) : url

  return url
}

/**
 * Detects the correct localhost URL for development
 * Handles different ports that Next.js might use
 */
function getLocalDevelopmentURL(): string {
  // In browser environment, use window.location
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }

  // In server environment, try to detect the actual running port
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || '3000'
    return `http://localhost:${port}`
  }

  return 'http://localhost:3000'
}

/**
 * Gets the callback URL for authentication redirects
 * @param path - The path to redirect to after auth (default: '/auth/callback')
 * @returns Complete callback URL
 */
export function getAuthCallbackURL(path: string = '/auth/callback'): string {
  const baseURL = getSiteURL()
  const callbackPath = path.startsWith('/') ? path : `/${path}`
  return `${baseURL}${callbackPath}`
}

/**
 * Gets redirect URL for post-authentication navigation
 * @param path - The path to redirect to (default: '/dashboard')
 * @returns Complete redirect URL
 */
export function getRedirectURL(path: string = '/dashboard'): string {
  const baseURL = getSiteURL()
  const redirectPath = path.startsWith('/') ? path : `/${path}`
  return `${baseURL}${redirectPath}`
}

/**
 * Debug function to log current URL configuration
 * Useful for troubleshooting in different environments
 */
export function debugURLConfig(): void {
  console.log('🔍 URL Configuration Debug:')
  console.log('- NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET')
  console.log('- NEXT_PUBLIC_VERCEL_URL:', process.env.NEXT_PUBLIC_VERCEL_URL || 'NOT SET')
  console.log('- VERCEL_URL:', process.env.VERCEL_URL || 'NOT SET')
  console.log('- PORT:', process.env.PORT || 'NOT SET')
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'NOT SET')

  if (typeof window !== 'undefined') {
    console.log('- Current Browser URL:', `${window.location.protocol}//${window.location.host}`)
  }

  console.log('- Computed Site URL:', getSiteURL())
  console.log('- Auth Callback URL:', getAuthCallbackURL())
  console.log('- Default Redirect URL:', getRedirectURL())
}

/**
 * Validates if a URL is allowed for redirects (security check)
 * @param url - URL to validate
 * @returns true if URL is safe to redirect to
 */
export function isValidRedirectURL(url: string): boolean {
  try {
    const parsedURL = new URL(url)
    const siteURL = new URL(getSiteURL())

    // Allow same origin redirects
    if (parsedURL.origin === siteURL.origin) {
      return true
    }

    // Allow localhost for development (any port)
    if (parsedURL.hostname === 'localhost' && process.env.NODE_ENV === 'development') {
      return true
    }

    // Allow Vercel preview URLs
    if (parsedURL.hostname.includes('vercel.app')) {
      return true
    }

    return false
  } catch {
    return false
  }
}
