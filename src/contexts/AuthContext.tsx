'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

interface AuthUser extends User {
  onboarding_completed?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const refreshUser = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 refreshUser called')
    }
    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error('❌ Error getting user:', error)
        setUser(null)
        return
      }

      if (authUser) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Auth user found:', authUser.email)
        }
        setUser(authUser as AuthUser)
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📭 No auth user found')
        }
        setUser(null)
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error)
      setUser(null)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 AuthContext useEffect triggered')
    }
    let mounted = true

    const initializeAuth = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ Starting auth initialization...')
      }

      try {
        // Simple session check
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 Getting session...')
        }
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🚫 Component unmounted, aborting')
          }
          return
        }

        if (error) {
          console.error('❌ Session error:', error)
          setUser(null)
        } else if (session?.user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Session found for:', session.user.email)
          }
          setUser(session.user as AuthUser)
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('📭 No session found')
          }
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Auth initialization complete, setting loading to false')
          }
          setLoading(false)
        }
      }
    }

    // Start initialization
    initializeAuth()

    // Set up auth state listener
    if (process.env.NODE_ENV === 'development') {
      console.log('👂 Setting up auth state listener...')
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔔 Auth state change:', event, session?.user?.email || 'no user')
      }

      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ User signed in, updating state')
        }
        setUser(session.user as AuthUser)
      } else if (event === 'SIGNED_OUT') {
        if (process.env.NODE_ENV === 'development') {
          console.log('👋 User signed out, clearing state')
        }
        setUser(null)
      }
    })

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Cleaning up AuthContext')
      }
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = {
    user,
    loading,
    signOut,
    refreshUser,
  }

  // Only log in development to reduce test noise
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 AuthContext state:', {
      user: user?.email || 'null',
      loading,
      timestamp: new Date().toISOString(),
    })
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
