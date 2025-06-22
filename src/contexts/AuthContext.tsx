'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

  const loadUserProfile = async (authUser: User): Promise<AuthUser> => {
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
  }

  const reloadProfile = async () => {
    if (!user || !supabase) return
    try {
      const enrichedUser = await loadUserProfile(user)
      setUser(enrichedUser)
      logger.debug('Profile reloaded successfully')
    } catch (error) {
      logger.error('Error reloading profile', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const signOut = async () => {
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
  }

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
          setUser(enriched)
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
            setUser(enrichedUser)
          } else {
            setUser(null)
          }
        } catch (err) {
          logger.error('Error handling auth state change', {
            error: err instanceof Error ? err.message : String(err),
          })
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
