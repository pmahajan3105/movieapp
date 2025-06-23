'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Calendar, Clock, Settings, AlertCircle, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileData {
  email?: string
  createdAt?: string
  lastSignIn?: string
}

interface ToastMessage {
  message: string
  type: 'success' | 'error'
}

export default function AccountPage() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('')
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  // Load user data from AuthContext
  useEffect(() => {
    if (user) {
      // Set user name from profile data in AuthContext
      setUserName(user.profile?.full_name || user.email?.split('@')[0] || '')

      // Set other profile data
      setProfileData({
        email: user.email || '',
        createdAt: user.created_at || '',
        lastSignIn: user.last_sign_in_at || '',
      })

      setLoading(false)
      console.log('✅ User profile loaded from AuthContext:', {
        fullName: user.profile?.full_name,
        email: user.email,
        hasProfile: !!user.profile,
      })
    }
  }, [user])

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 3000)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [toast])

  const handleSaveName = async () => {
    if (!user || !userName.trim()) {
      showToast('Please enter a valid name', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: userName.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast('Name updated successfully!', 'success')

        // Reload the profile data in AuthContext
        await refreshUser()

        console.log('✅ Profile updated and reloaded')
      } else {
        throw new Error(data.error || 'Failed to update name')
      }
    } catch (error) {
      console.error('❌ Error updating name:', error)
      showToast(
        error instanceof Error ? error.message : 'Failed to update name. Please try again.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="mb-8">
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg',
            toast.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your personal information and account preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Your basic account information and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                />
                <Button onClick={handleSaveName} disabled={saving} size="sm">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={profileData?.email || ''} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                Member Since:{' '}
                {profileData?.createdAt ? formatDate(profileData.createdAt) : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                Last Active:{' '}
                {profileData?.lastSignIn ? formatDateTime(profileData.lastSignIn) : 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Actions
          </CardTitle>
          <CardDescription>Manage your account and data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900">Data & Privacy</h3>
              <p className="mt-1 text-sm text-gray-600">
                Your account data is stored securely and used only to provide movie recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
