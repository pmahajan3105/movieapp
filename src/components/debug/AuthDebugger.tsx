'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Key } from 'lucide-react'

interface AuthCheckResult {
  timestamp: string
  userFromContext: {
    id?: string
    email?: string
    exists: boolean
  }
  apiResponse?: {
    status: number
    ok: boolean
    success?: boolean
    error?: string
    headers: Record<string, string>
  }
  cookies?: string
  localStorage?: {
    hasSupabaseAuth: boolean
    keys: string[]
  }
  error?: string
  message?: string
}

export function AuthDebugger() {
  const { user, isLoading } = useAuth()
  const [authCheck, setAuthCheck] = useState<AuthCheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkAuth = useCallback(async () => {
    setIsChecking(true)
    try {
      // Test the watchlist endpoint
      const response = await fetch('/api/watchlist')
      const data = await response.json()

      const authStatus = {
        timestamp: new Date().toISOString(),
        userFromContext: {
          id: user?.id,
          email: user?.email,
          exists: !!user,
        },
        apiResponse: {
          status: response.status,
          ok: response.ok,
          success: data.success,
          error: data.error,
          headers: Object.fromEntries(response.headers.entries()),
        },
        cookies: document.cookie,
        localStorage: {
          hasSupabaseAuth: !!localStorage.getItem('sb-auth-token'),
          keys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth')),
        },
      }

      console.log('🔍 Auth check result:', authStatus)
      setAuthCheck(authStatus)
    } catch (error) {
      const errorStatus = {
        timestamp: new Date().toISOString(),
        error: 'Network Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        userFromContext: {
          id: user?.id,
          email: user?.email,
          exists: !!user,
        },
      }

      console.error('🔍 Auth check error:', errorStatus)
      setAuthCheck(errorStatus)
    } finally {
      setIsChecking(false)
    }
  }, [user])

  useEffect(() => {
    // Auto-check on mount
    if (!isLoading) {
      checkAuth()
    }
  }, [isLoading, user, checkAuth])

  if (isLoading) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p>Loading authentication...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Authentication Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Status */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
          {user ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">User Authenticated</p>
                <p className="text-sm text-green-600">
                  {user.email} (ID: {user.id?.slice(0, 8)}...)
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-red-800">No User Found</p>
                <p className="text-sm text-red-600">User context is null</p>
              </div>
            </>
          )}
        </div>

        {/* Test Button */}
        <Button onClick={checkAuth} disabled={isChecking} className="w-full">
          {isChecking ? 'Checking...' : 'Test Authentication'}
        </Button>

        {/* Auth Check Results */}
        {authCheck && (
          <div className="space-y-3">
            <h4 className="font-medium">Authentication Test Results:</h4>

            {/* API Response Status */}
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                {authCheck.apiResponse?.ok ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">API Response: {authCheck.apiResponse?.status}</span>
              </div>

              {authCheck.apiResponse?.error && (
                <p className="mb-2 text-sm text-red-600">Error: {authCheck.apiResponse.error}</p>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  View Full Response
                </summary>
                <pre className="mt-2 overflow-auto rounded border bg-white p-2 text-xs">
                  {JSON.stringify(authCheck.apiResponse, null, 2)}
                </pre>
              </details>
            </div>

            {/* Storage Info */}
            <div className="rounded-lg bg-gray-50 p-3">
              <h5 className="mb-2 font-medium">Authentication Storage:</h5>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Cookies:</span>
                  {authCheck.cookies ? ' Present' : ' None'}
                </p>
                <p>
                  <span className="font-medium">LocalStorage Auth Keys:</span>
                  {authCheck.localStorage?.keys?.length || 0}
                </p>
                {authCheck.localStorage?.keys?.map((key: string) => (
                  <p key={key} className="ml-4 text-gray-600">
                    • {key}
                  </p>
                ))}
              </div>
            </div>

            {/* Timestamp */}
            <p className="text-xs text-gray-500">Last checked: {authCheck.timestamp}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = '/auth/login')}
          >
            Go to Login
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
