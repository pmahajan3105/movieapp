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
import { isSingleUserMode, getSingleUserConfig } from '@/lib/utils/single-user-mode'
import { 
  isLocalMode, 
  getLocalUser, 
  createLocalUser, 
  hasLocalUser,
  type LocalUser 
} from '@/lib/utils/local-user'

interface AuthUser extends User {
  profile?: UserProfile
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isSessionValid: boolean
  isLocalMode: boolean
  needsLocalSetup: boolean
  createLocalUserAccount: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsLocalSetup, setNeedsLocalSetup] = useState(false)
  const userUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Treat undefined or placeholder strings as missing configuration to avoid hanging auth
  const hasValidSupabaseConfig = Boolean(
    supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined'
  )

  const supabase = hasValidSupabaseConfig ? browserClient : null

  // Check if single user mode is enabled
  const singleUserMode = isSingleUserMode()
  const singleUserConfig = getSingleUserConfig()
  const localMode = isLocalMode()

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
      // Don't set isLoading to false here - it should be set synchronously
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

  const createLocalUserAccount = useCallback(async (name: string) => {
    if (!localMode) {
      throw new Error('Local mode is not enabled')
    }

    try {
      const localUser = createLocalUser(name)
      
      const authUser: AuthUser = {
        id: localUser.id,
        email: `${localUser.id}@local.cineai`,
        user_metadata: { name: localUser.name },
        app_metadata: {},
        aud: 'authenticated',
        created_at: localUser.createdAt,
      } as AuthUser
      
      setUser(authUser)
      setNeedsLocalSetup(false)
      logger.info('Local user account created', { userId: localUser.id, name: localUser.name })
    } catch (error) {
      logger.error('Error creating local user account', { error })
      throw error
    }
  }, [localMode])

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
    // Handle local mode (frictionless local usage)
    if (localMode) {
      logger.info('Local mode enabled - checking for local user')
      
      const localUser = getLocalUser()
      
      if (localUser) {
        // User exists, log them in
        logger.info('Found local user', { userId: localUser.id, name: localUser.name })
        const authUser: AuthUser = {
          id: localUser.id,
          email: `${localUser.id}@local.cineai`,
          user_metadata: { name: localUser.name },
          app_metadata: {},
          aud: 'authenticated',
          created_at: localUser.createdAt,
        } as AuthUser
        
        setUser(authUser)
        setNeedsLocalSetup(false)
        setIsLoading(false)
      } else {
        // No user exists, show welcome screen
        logger.info('No local user found - showing welcome screen')
        setUser(null)
        setNeedsLocalSetup(true)
        setIsLoading(false)
      }
      return
    }

    // Handle single user mode (for testing/development)
    if (singleUserMode) {
      logger.info('Single user mode enabled - bypassing authentication')
      const singleUser: AuthUser = {
        id: singleUserConfig.userId,
        email: 'single-user@local.dev',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        isSingleUser: true
      } as AuthUser & { isSingleUser: boolean }
      
      setUser(singleUser)
      setNeedsLocalSetup(false)
      setIsLoading(false)
      return
    }

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
          // For the very first load we want user to be available before we flip the loading flag
          setUser(enriched)
        } else {
          setUser(null)
        }
        // Loading finished only after user (or null) has been committed
        setIsLoading(false)
      } catch (e) {
        logger.warn('getSession priming call failed', {
          error: e instanceof Error ? e.message : String(e),
        })
        // Set loading to false even if auth check failed
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
          // Ensure loading is false after auth state change is processed
          setIsLoading(false)
        } catch (err) {
          logger.error('Error handling auth state change', {
            error: err instanceof Error ? err.message : String(err),
          })
          debouncedSetUser(null)
          setIsLoading(false)
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
    isLocalMode: localMode,
    needsLocalSetup,
    createLocalUserAccount,
  }), [user, isLoading, signOut, reloadProfile, localMode, needsLocalSetup, createLocalUserAccount])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
