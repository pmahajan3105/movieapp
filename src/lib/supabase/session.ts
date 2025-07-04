import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

/**
 * Safely seeds the Supabase JS client with a cached session taken from the auth cookie.
 *
 * This prevents an unnecessary round-trip to Supabase when the user reloads the page –
 * the SDK will already have an access & refresh token pair in memory so it can refresh
 * in the background. If the cookie is malformed we fail silently.
 *
 * @param supabase        A browser Supabase client instance
 * @param supabaseCookieName  The auth cookie name e.g. `sb-project-ref-auth-token`
 */
export async function hydrateSessionFromCookie(
  supabase: SupabaseClient,
  supabaseCookieName: string
): Promise<void> {
  // Ensure we're running in the browser – `document` is not available on the server.
  if (typeof document === 'undefined') return
  if (!supabase || !supabaseCookieName) return

  try {
    const rawCookie = document.cookie
      .split('; ')
      .find(c => c.startsWith(`${supabaseCookieName}=`))
      ?.split('=')[1]

    if (!rawCookie) return // no auth cookie yet

    // Supabase v2 prefixes JSON with "base64-" – strip it then decode
    const encoded = rawCookie.startsWith('base64-') ? rawCookie.slice(7) : rawCookie

    // Cookie is URL-encoded – decode first
    const decodedUri = decodeURIComponent(encoded)

    // Convert to regular base64 (atob does not accept URL-safe charset or bad padding)
    const padded = decodedUri.replace(/-/g, '+').replace(/_/g, '/')
    const fixedPad = padded + '='.repeat((4 - (padded.length % 4)) % 4)

    // Use atob if available otherwise Buffer decoding (Jest / Node environment)
     
    // @ts-ignore – atob is not defined in Node typings
    const decodeBase64 =
      typeof atob === 'function'
        ? (str: string) => atob(str)
        : (str: string) => Buffer.from(str, 'base64').toString('binary')

    let parsed: Partial<{
      currentAccessToken: string
      currentRefreshToken: string
    }> | null = null

    try {
      parsed = JSON.parse(decodeBase64(fixedPad))
    } catch {
      // Fallback regex extraction if JSON.parse fails (e.g., malformed padding)
      try {
        const rawDecoded = Buffer.from(fixedPad, 'base64').toString('utf8')
        const match = /"currentAccessToken":"([^"]+)"[\s\S]*?"currentRefreshToken":"([^"]+)"/.exec(
          rawDecoded
        )
        if (match) {
          parsed = {
            currentAccessToken: match[1],
            currentRefreshToken: match[2],
          }
        }
      } catch {
        // silent
      }
    }

    if (parsed?.currentAccessToken && parsed?.currentRefreshToken) {
      await supabase.auth.setSession({
        access_token: parsed.currentAccessToken,
        refresh_token: parsed.currentRefreshToken,
      })
      logger.debug('Supabase session seeded from cookie', {
        cookie: supabaseCookieName,
        userSet: true,
      })
    }
  } catch (err) {
    logger.warn('Failed to hydrate session from cookie', {
      cookie: supabaseCookieName,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Wraps a promise in a timeout so UI isn't blocked forever when a network call hangs.
 *
 * @param promise  The promise to race against the timeout
 * @param ms       Timeout in milliseconds (default 10s)
 */
export function promiseWithTimeout<T>(promise: Promise<T>, ms = 10_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)

    promise
      .then(value => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(err => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

export function clearAuthCookie(supabaseCookieName: string) {
  if (typeof document === 'undefined') return
  if (!supabaseCookieName) return

  // Setting an expired cookie immediately removes it in browsers & jsdom
  document.cookie = `${supabaseCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=lax`
  // Fallback: explicitly strip cookie from document.cookie string (jsdom quirk)
  if (document.cookie.includes(supabaseCookieName)) {
    const filtered = document.cookie
      .split('; ')
      .filter(c => !c.startsWith(`${supabaseCookieName}=`))
      .join('; ')
    document.cookie = filtered
  }
  logger.debug('Auth cookie cleared', { cookie: supabaseCookieName })
}
