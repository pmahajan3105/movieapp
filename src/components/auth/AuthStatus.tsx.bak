'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export function AuthStatus() {
  const { user, isSessionValid, refreshUser, isLoading, signOut } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshUser()
    } catch (error) {
      console.error('Failed to refresh session:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Checking authentication...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <AlertCircle className="h-4 w-4 text-orange-500" />
        <span>Not signed in</span>
      </div>
    )
  }

  if (!isSessionValid) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-orange-600">
          <AlertCircle className="h-4 w-4" />
          <span>Session expired</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 px-2"
          >
            {isRefreshing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              signOut()
              window.location.href = '/auth/login'
            }}
            className="h-7 px-2 text-red-600 hover:text-red-700"
          >
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span>Signed in as {user.email}</span>
    </div>
  )
}
