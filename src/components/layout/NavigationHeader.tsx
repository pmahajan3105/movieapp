'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Film,
  LogOut,
  Sparkles,
  Menu,
  X,
  User,
  List,
  ChevronDown,
  CheckCircle,
  Settings,
} from 'lucide-react'
import { SearchInterface } from '@/components/search/SearchInterface'

export function NavigationHeader() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const [userDisplayName, setUserDisplayName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load user's full name from database
  useEffect(() => {
    const loadUserDisplayName = async () => {
      if (!user) {
        setUserDisplayName('')
        return
      }

      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.profile?.full_name) {
            setUserDisplayName(data.profile.full_name)
          } else {
            // Fallback to email username
            setUserDisplayName(user.email?.split('@')[0] || 'Account')
          }
        } else {
          // Fallback to email username if API fails
          setUserDisplayName(user.email?.split('@')[0] || 'Account')
        }
      } catch (error) {
        console.error('Error loading user display name:', error)
        // Fallback to email username
        setUserDisplayName(user.email?.split('@')[0] || 'Account')
      }
    }

    loadUserDisplayName()
  }, [user])

  // Listen for name updates from account page
  useEffect(() => {
    const handleNameUpdate = (event: CustomEvent) => {
      const { fullName } = event.detail
      if (fullName) {
        setUserDisplayName(fullName)
      }
    }

    window.addEventListener('userNameUpdated', handleNameUpdate as EventListener)
    return () => {
      window.removeEventListener('userNameUpdated', handleNameUpdate as EventListener)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Don't show navigation on auth pages or landing page
  if (loading || !user || pathname === '/' || pathname.startsWith('/auth')) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Handle search navigation
  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`)
    setIsMobileMenuOpen(false)
  }

  const navigation = [
    {
      name: 'Movies',
      href: '/dashboard/movies',
      icon: Film,
      current: pathname.startsWith('/dashboard/movies'),
    },
    {
      name: 'Watchlist',
      href: '/dashboard/watchlist',
      icon: List,
      current: pathname.startsWith('/dashboard/watchlist'),
    },
    {
      name: 'Watched',
      href: '/dashboard/watched',
      icon: CheckCircle,
      current: pathname.startsWith('/dashboard/watched'),
    },
    {
      name: 'Preferences',
      href: '/dashboard/settings',
      icon: Settings,
      current: pathname.startsWith('/dashboard/settings'),
    },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Logo */}
            <Link href="/dashboard" className="ml-4 flex items-center space-x-2 lg:ml-0">
              <div className="flex items-center space-x-1">
                <Film className="h-8 w-8 text-blue-600" />
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
                CineAI
              </span>
            </Link>
          </div>

          {/* Center - Desktop Search */}
          <div className="mx-8 hidden max-w-lg flex-1 items-center lg:flex">
            <SearchInterface
              onSearch={handleSearch}
              placeholder="Search movies..."
              showAutocomplete={true}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Desktop Navigation */}
            <div className="hidden items-center space-x-4 lg:flex">
              {navigation.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}

              {/* Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{userDisplayName || 'Account'}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {isAccountDropdownOpen && (
                  <div className="ring-opacity-5 absolute right-0 z-50 mt-2 w-48 rounded-md bg-white ring-1 shadow-lg ring-black">
                    <div className="py-1">
                      <Link
                        href="/dashboard/account"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsAccountDropdownOpen(false)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Account Settings
                      </Link>
                      <button
                        onClick={() => {
                          setIsAccountDropdownOpen(false)
                          handleSignOut()
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white lg:hidden">
          {/* Mobile Search */}
          <div className="border-b border-gray-200 p-4">
            <SearchInterface
              onSearch={handleSearch}
              placeholder="Search movies..."
              showAutocomplete={false}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mobile Navigation Links */}
          <div className="p-2">
            {navigation.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`mb-2 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium ${
                    item.current
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}

            {/* Mobile Account Links */}
            <div className="mt-2 border-t border-gray-200 pt-2">
              <div className="px-3 py-2 text-sm text-gray-500">
                Signed in as: <span className="font-medium">{userDisplayName || 'Account'}</span>
              </div>
              <Link
                href="/dashboard/account"
                className="mb-2 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  handleSignOut()
                }}
                className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
