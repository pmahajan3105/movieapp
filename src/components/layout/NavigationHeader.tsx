'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Film, LogOut, Sparkles, Menu, X, User, List, ChevronDown, CheckCircle } from 'lucide-react'
import { SearchInterface } from '@/components/search/SearchInterface'

export function NavigationHeader() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/')
      }
    } catch (error) {
      console.error('Sign out error:', error)
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
      name: 'Recommendations',
      href: '/dashboard/recommendations',
      icon: Sparkles,
      current: pathname.startsWith('/dashboard/recommendations'),
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
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2 ml-4 lg:ml-0">
              <div className="flex items-center space-x-1">
                <Film className="h-8 w-8 text-blue-600" />
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CineAI
              </span>
            </Link>
          </div>

          {/* Center - Desktop Search */}
          <div className="hidden lg:flex items-center flex-1 max-w-lg mx-8">
            <SearchInterface
              onSearch={handleSearch}
              placeholder="Search movies..."
              showAutocomplete={true}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              {navigation.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}

              {/* Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.email?.split('@')[0] || 'Account'}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {isAccountDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link
                        href="/dashboard/account"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsAccountDropdownOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Account Settings
                      </Link>
                      <button
                        onClick={() => {
                          setIsAccountDropdownOpen(false)
                          handleSignOut()
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
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
        <div className="lg:hidden border-t border-gray-200 bg-white">
          {/* Mobile Search */}
          <div className="p-4 border-b border-gray-200">
            <SearchInterface
              onSearch={handleSearch}
              placeholder="Search movies..."
              showAutocomplete={false}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className={`flex items-center w-full px-3 py-2 rounded-md text-sm font-medium mb-2 ${
                    item.current 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}

            {/* Mobile Account Links */}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <Link
                href="/dashboard/account"
                className="flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 mb-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-4 w-4 mr-2" />
                Account Settings
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  handleSignOut()
                }}
                className="flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
