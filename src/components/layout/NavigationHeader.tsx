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
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Ensure client-side hydration is complete before rendering user-dependent content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get user display name from the profile data in AuthContext
  const getUserDisplayName = () => {
    if (!user) return ''

    // First try to get from profile data
    if (user.profile?.full_name && user.profile.full_name.trim()) {
      return user.profile.full_name.trim()
    }

    // Fallback to email username, but make it more user-friendly
    if (user.email) {
      const emailUsername = user.email.split('@')[0]
      if (emailUsername) {
        // Capitalize first letter and replace dots/underscores with spaces
        return emailUsername
          .replace(/[._]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
    }

    return 'Account'
  }

  const userDisplayName = getUserDisplayName()

  // Handle clicks outside dropdown
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

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Handle search navigation
  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`)
    setIsMobileMenuOpen(false)
  }

  const navItems = [
    { label: 'Movies', href: '/dashboard/movies', icon: Film },
    { label: 'Watchlist', href: '/dashboard/watchlist', icon: List },
    { label: 'Watched', href: '/dashboard/watched', icon: CheckCircle },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  // Don't render user-dependent content until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">CineAI</span>
            </Link>

            {/* Loading placeholder */}
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <span className="text-xl font-bold text-gray-900">CineAI</span>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden items-center space-x-8 md:flex">
            {user &&
              navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    pathname === item.href
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
          </nav>

          {/* Search and User Section */}
          <div className="flex items-center space-x-4">
            {/* Search - Hide on mobile */}
            {user && (
              <div className="hidden md:block">
                <SearchInterface onSearch={handleSearch} />
              </div>
            )}

            {/* User Section */}
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center space-x-2 rounded-md px-2 py-1 text-sm text-gray-700 hover:text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="hidden font-medium sm:block">{userDisplayName}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isAccountDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-white py-1 shadow-lg">
                    <div className="border-b px-4 py-2 text-sm text-gray-700">
                      <div className="truncate font-medium">{userDisplayName}</div>
                      <div className="truncate text-xs text-gray-500">{user.email}</div>
                    </div>
                    <Link
                      href="/dashboard/account"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsAccountDropdownOpen(false)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-purple-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            {user && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-md p-2 text-gray-600 hover:bg-purple-50 hover:text-purple-600 md:hidden"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {user && isMobileMenuOpen && (
          <div className="border-t bg-white py-4 md:hidden">
            {/* Mobile Search */}
            <div className="mb-4 px-4">
              <SearchInterface onSearch={handleSearch} />
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-2 px-4">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    pathname === item.href
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
