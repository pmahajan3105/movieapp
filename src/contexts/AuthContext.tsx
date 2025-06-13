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

  // Check if Supabase environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase =
    supabaseUrl && supabaseAnonKey
      ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
      : null

  const refreshUser = async () => {
    if (!supabase) {
      console.warn('Supabase not configured - skipping user refresh')
      setUser(null)
      return
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

      setUser(authUser ? (authUser as AuthUser) : null)
    } catch (error) {
      console.error('❌ Error refreshing user:', error)
      setUser(null)
    }
  }

  const signOut = async () => {
    if (!supabase) {
      console.warn('Supabase not configured - skipping sign out')
      setUser(null)
      return
    }

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
    if (!supabase) {
      console.warn('Supabase not configured - auth will be disabled')
      setLoading(false)
      setUser(null)
      return
    }

    let mounted = true

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('❌ Session error:', error)
          setUser(null)
        } else {
          setUser(session?.user ? (session.user as AuthUser) : null)
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user as AuthUser)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
