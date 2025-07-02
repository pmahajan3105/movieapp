'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase as browserClient } from '@/lib/supabase/browser-client'
import {
  hydrateSessionFromCookie,
  promiseWithTimeout,
  clearAuthCookie,
} from '@/lib/supabase/session'
import { logger } from '@/lib/logger'
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
  const userUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Debounced user update to prevent rapid auth state changes
  const debouncedSetUser = useCallback((newUser: AuthUser | null) => {
    if (userUpdateTimeoutRef.current) {
      clearTimeout(userUpdateTimeoutRef.current)
    }
    
    userUpdateTimeoutRef.current = setTimeout(() => {
      setUser(newUser)
      setIsLoading(false)
    }, 100) // 100ms debounce
  }, [])

  const loadUserProfile = React.useCallback(
    async (authUser: User): Promise<AuthUser> => {
      if (!supabase) return authUser as AuthUser

      try {
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          logger.warn('Error loading user profile', { message: error.message })
        }

        return {
          ...authUser,
          profile: userProfile || undefined,
        }
      } catch (error) {
        logger.error('Error loading user profile', {
          error: error instanceof Error ? error.message : String(error),
        })
        return authUser as AuthUser
      }
    },
    [supabase]
  )

  const reloadProfile = useCallback(async () => {
    if (!user || !supabase) return
    try {
      const enrichedUser = await loadUserProfile(user)
      debouncedSetUser(enrichedUser)
      logger.debug('Profile reloaded successfully')
    } catch (error) {
      logger.error('Error reloading profile', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [user, supabase, debouncedSetUser])

  const signOut = useCallback(async () => {
    if (!supabase) return
    try {
      await supabase.auth.signOut()
      setUser(null)
      await clearAuthCookie(supabaseCookieName)
    } catch (error) {
      logger.error('Error signing out', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      logger.warn('Supabase not configured - auth will be disabled')
      setIsLoading(false)
      return
    }

    let authSubscription:
      | ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription']
      | null = null

    const initAuth = async () => {
      // Seed from cookie first so getSession has something cached
      await hydrateSessionFromCookie(supabase, supabaseCookieName)

      try {
        const { data } = await promiseWithTimeout(supabase.auth.getSession())
        logger.debug('getSession priming call result', {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        })

        if (data.session?.user) {
          const enriched = await loadUserProfile(data.session.user)
          debouncedSetUser(enriched)
        } else {
          debouncedSetUser(null)
        }
      } catch (e) {
        logger.warn('getSession priming call failed', {
          error: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setIsLoading(false)
      }

      // Subscribe to ongoing auth changes
      authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
        logger.debug('Auth state change', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
        })

        try {
          if (session?.user) {
            const enrichedUser = await loadUserProfile(session.user)
            debouncedSetUser(enrichedUser)
          } else {
            debouncedSetUser(null)
          }
        } catch (err) {
          logger.error('Error handling auth state change', {
            error: err instanceof Error ? err.message : String(err),
          })
          debouncedSetUser(null)
        }
      }).data.subscription
    }

    initAuth()

    return () => {
      authSubscription?.unsubscribe()
      if (userUpdateTimeoutRef.current) {
        clearTimeout(userUpdateTimeoutRef.current)
      }
    }
  }, [supabase, loadUserProfile, supabaseCookieName, debouncedSetUser])

  const value = React.useMemo(() => ({
    user,
    isLoading,
    signOut,
    refreshUser: reloadProfile,
    isSessionValid: !!user,
  }), [user, isLoading, signOut, reloadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
