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
import { logger } from '@/lib/logger'

export function NavigationHeader() {
  const { user, isLoading, signOut } = useAuth()
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
      logger.error('Error signing out', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Handle search navigation
  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`)
    setIsMobileMenuOpen(false)
  }

  const navItems = [
    { label: 'AI Recommended', href: '/dashboard', icon: Sparkles },
    { label: 'Movies', href: '/dashboard/movies', icon: Film },
    { label: 'Watchlist', href: '/dashboard/watchlist', icon: List },
    { label: 'Watched', href: '/dashboard/watched', icon: CheckCircle },
    { label: 'Preferences', href: '/dashboard/settings', icon: Settings },
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
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-slate-50 to-blue-50 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-purple-600 group-hover:text-purple-700 transition-colors" />
              <div className="absolute -inset-1 bg-purple-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              CineAI
            </span>
          </Link>

          {/* Center Section - Search */}
          {user && (
            <div className="flex-1 max-w-2xl mx-8 hidden lg:block">
              <SearchInterface onSearch={handleSearch} />
            </div>
          )}

          {/* Right Section - User */}
          <div className="flex items-center space-x-4">
            {/* Search for smaller screens */}
            {user && (
              <div className="lg:hidden">
                <SearchInterface onSearch={handleSearch} />
              </div>
            )}

            {/* User Section */}
            {isLoading ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center space-x-3 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 text-sm shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-all duration-200 min-h-[44px] touch-manipulation"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden font-medium text-slate-700 sm:block max-w-[120px] truncate">
                    {userDisplayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>

                {isAccountDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-3 w-56 rounded-xl bg-white/95 backdrop-blur-md py-2 shadow-xl ring-1 ring-slate-200">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="truncate font-medium text-slate-900">{userDisplayName}</div>
                      <div className="truncate text-sm text-slate-500">{user.email}</div>
                    </div>
                    <Link
                      href="/dashboard/account"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setIsAccountDropdownOpen(false)}
                    >
                      <Settings className="mr-3 h-4 w-4 text-slate-400" />
                      Account Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <LogOut className="mr-3 h-4 w-4 text-slate-400" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            {user && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-lg p-2 text-slate-600 hover:bg-white/50 hover:text-slate-900 lg:hidden min-h-[44px] min-w-[44px] touch-manipulation transition-colors"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        {user && (
          <div className="border-t border-slate-200/50 bg-white/30 backdrop-blur-sm">
            <nav className="flex space-x-1 px-2 py-3 overflow-x-auto scrollbar-hide">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Mobile Menu */}
        {user && isMobileMenuOpen && (
          <div className="border-t border-slate-200/50 bg-white/95 backdrop-blur-md lg:hidden">
            <nav className="space-y-1 px-4 py-4">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200 touch-manipulation min-h-[44px] ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
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
