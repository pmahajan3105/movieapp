'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase as browserClient } from '@/lib/supabase/browser-client'
import type { UserProfile } from '@/lib/supabase/browser-client'

interface AuthUser extends User {
  profile?: UserProfile
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isSessionValid: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Treat undefined or placeholder strings as missing configuration to avoid hanging auth
  const hasValidSupabaseConfig = Boolean(
    supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined'
  )

  const supabase = hasValidSupabaseConfig ? browserClient : null

  const supabaseCookieName = supabaseUrl
    ? `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
    : ''

  const hydrateSessionFromCookie = async () => {
    if (!supabase || !supabaseCookieName) return
    try {
      const raw = document.cookie
        .split('; ') // cookie string
        .find(c => c.startsWith(`${supabaseCookieName}=`))
        ?.split('=')[1]

      if (!raw) return // no cookie yet

      // Supabase v2 prefixes JSON with "base64-" – strip it, then decodeURIComponent
      const encoded = raw.startsWith('base64-') ? raw.slice(7) : raw

      // Cookie is URL-encoded; decode first
      const decodedUri = decodeURIComponent(encoded)

      // Adjust base64 padding and URL-safe chars before atob
      const padded = decodedUri.replace(/-/g, '+').replace(/_/g, '/')
      const fixPad = padded + '==='.slice((padded.length + 3) % 4)

      const parsed = JSON.parse(atob(fixPad)) as {
        currentAccessToken?: string
        currentRefreshToken?: string
      }

      if (parsed.currentAccessToken && parsed.currentRefreshToken) {
        // Seed the session; ignore error (will refresh later)
        await supabase.auth.setSession({
          access_token: parsed.currentAccessToken,
          refresh_token: parsed.currentRefreshToken,
        })
        console.log('🪄 Supabase session seeded from cookies')
      }
    } catch (err) {
      console.warn('⚠️ Failed to hydrate session from cookie', err)
    }
  }

  const loadUserProfile = async (authUser: User): Promise<AuthUser> => {
    if (!supabase) return authUser as AuthUser

    try {
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error loading user profile:', error.message)
      }

      return {
        ...authUser,
        profile: userProfile || undefined,
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      return authUser as AuthUser
    }
  }

  const reloadProfile = async () => {
    if (!user || !supabase) return
    try {
      const enrichedUser = await loadUserProfile(user)
      setUser(enrichedUser)
      console.log('🔄 Profile reloaded successfully')
    } catch (error) {
      console.error('❌ Error reloading profile:', error)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('❌ Error signing out:', error)
    }
  }

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not configured - auth will be disabled')
      setIsLoading(false)
      return
    }

    let authSubscription:
      | ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription']
      | null = null

    const initAuth = async () => {
      // Seed from cookie first so getSession has something cached
      await hydrateSessionFromCookie()

      const getSessionWithTimeout = async <T,>(promise: Promise<T>, ms = 10000): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
        ])

      try {
        const { data } = await getSessionWithTimeout(supabase.auth.getSession())
        console.log('🔍 getSession priming call result', {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        })

        if (data.session?.user) {
          const enriched = await loadUserProfile(data.session.user)
          setUser(enriched)
        }
      } catch (e) {
        console.warn('⚠️ getSession priming call failed', e)
      } finally {
        setIsLoading(false)
      }

      // Subscribe to ongoing auth changes
      authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
        console.log('🔄 AuthContext: Auth state change:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
        })

        try {
          if (session?.user) {
            const enrichedUser = await loadUserProfile(session.user)
            setUser(enrichedUser)
          } else {
            setUser(null)
          }
        } catch (err) {
          console.error('❌ Error handling auth state change:', err)
          setUser(null)
        } finally {
          setIsLoading(false)
        }
      }).data.subscription
    }

    initAuth()

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [supabase])

  const value = {
    user,
    isLoading,
    signOut,
    refreshUser: reloadProfile,
    isSessionValid: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
