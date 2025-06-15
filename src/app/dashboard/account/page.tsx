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
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('')
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  const loadUserProfile = useCallback(async () => {
    try {
      // First, try to fetch the full profile from the database
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.profile) {
          // Use database data if available
          setUserName(data.profile.full_name || user?.email?.split('@')[0] || '')
          setProfileData({
            email: data.profile.email || user?.email || '',
            createdAt: data.profile.createdAt || user?.created_at || '',
            lastSignIn: user?.last_sign_in_at || '',
          })
          return
        }
      }

      // Fallback to auth data if API call fails
      setUserName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '')
      setProfileData({
        email: user?.email || '',
        createdAt: user?.created_at || '',
        lastSignIn: user?.last_sign_in_at || '',
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      // Fallback to auth data on error
      setUserName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '')
      setProfileData({
        email: user?.email || '',
        createdAt: user?.created_at || '',
        lastSignIn: user?.last_sign_in_at || '',
      })
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadUserProfile().finally(() => {
        setLoading(false)
      })
    }
  }, [user, loadUserProfile])

  const handleSaveName = async () => {
    if (!userName.trim()) {
      showToast('Name cannot be empty', 'error')
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

      if (response.ok) {
        showToast('Name updated successfully!', 'success')
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to update name', 'error')
      }
    } catch (error) {
      console.error('Error updating name:', error)
      showToast('Failed to update name', 'error')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-6" />
        </div>

        {/* Profile Information Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg p-4 shadow-lg transition-all duration-300',
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your profile information</p>
        </div>
        <Settings className="h-6 w-6 text-gray-400" />
      </div>

      {/* Profile Information */}
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

      {/* Preferences Link */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Settings className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-700">Movie Preferences</h3>
            <p className="mb-4 text-gray-500">
              Manage your movie preferences and AI learning settings in the dedicated Preferences
              section.
            </p>
            <Button asChild>
              <a href="/dashboard/settings">Go to Preferences</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
