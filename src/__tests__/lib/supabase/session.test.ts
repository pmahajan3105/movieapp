import {
  hydrateSessionFromCookie,
  promiseWithTimeout,
  clearAuthCookie,
} from '@/lib/supabase/session'
import type { SupabaseClient } from '@supabase/supabase-js'

// Utility to create a base64-url string
const toBase64Url = (obj: unknown) => {
  const json = JSON.stringify(obj)
  const base64 = Buffer.from(json).toString('base64')
  // Convert to URL-safe base64 (remove padding, replace +/ with -_ )
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('supabase session helpers', () => {
  const cookieName = 'sb-test-auth-token'
  let mockSetSession: jest.Mock
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockSetSession = jest.fn().mockResolvedValue(undefined)
    // @ts-expect-error – we only need auth.setSession for these tests
    mockSupabase = { auth: { setSession: mockSetSession } }
    // Ensure a clean cookie jar
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;`
  })

  it('hydrates session when valid cookie is present', async () => {
    const payload = { currentAccessToken: 'access', currentRefreshToken: 'refresh' }
    const cookieValue = `base64-${toBase64Url(payload)}`
    document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}`

    await hydrateSessionFromCookie(mockSupabase, cookieName)

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    })
  })

  it('does not throw when cookie is malformed', async () => {
    // Malformed cookie (not base64)
    document.cookie = `${cookieName}=not-a-valid-cookie`
    await expect(hydrateSessionFromCookie(mockSupabase, cookieName)).resolves.not.toThrow()
    expect(mockSetSession).not.toHaveBeenCalled()
  })

  it('promiseWithTimeout resolves when promise finishes in time', async () => {
    const result = await promiseWithTimeout(Promise.resolve('ok'), 50)
    expect(result).toBe('ok')
  })

  it('promiseWithTimeout rejects when promise exceeds timeout', async () => {
    const slow = new Promise(resolve => setTimeout(() => resolve('late'), 100))
    await expect(promiseWithTimeout(slow, 10)).rejects.toThrow('timeout')
  })

  it('clearAuthCookie removes auth token', () => {
    const testCookie = `${cookieName}=value`
    document.cookie = testCookie

    clearAuthCookie(cookieName)

    // After clearing, cookie string should not include the auth token name
    expect(document.cookie.includes(cookieName)).toBe(false)
  })
})
