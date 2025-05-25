'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Film, LogOut, Sparkles, Menu, X, User, List, ChevronDown } from 'lucide-react'
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
      name: 'Watchlist',
      href: '/dashboard/watchlist',
      icon: List,
      current: pathname.startsWith('/dashboard/watchlist'),
    },
  ]

  return (
    <>
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Film className="h-8 w-8 text-purple-600" />
                  <Sparkles className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-xl font-bold text-gray-900">CineAI</span>
              </Link>
            </div>

            {/* Unified Search Bar - Desktop */}
            <div className="mx-8 hidden max-w-lg flex-1 lg:flex">
              <SearchInterface
                onSearch={handleSearch}
                placeholder="Search movies..."
                showAutocomplete={true}
                className="w-full"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden space-x-8 md:flex">
              {navigation.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors ${
                      item.current
                        ? 'border-purple-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Account Dropdown - Desktop */}
            <div className="hidden md:flex relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email?.split('@')[0] || 'Account'}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>

              {/* Dropdown Menu */}
              {isAccountDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-white py-1 shadow-lg z-50">
                  <Link
                    href="/dashboard/account"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsAccountDropdownOpen(false)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Account Settings
                  </Link>
                  <hr className="my-1" />
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
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              {/* Mobile Search */}
              <div className="border-b border-gray-200 px-4 py-3">
                <SearchInterface
                  onSearch={handleSearch}
                  placeholder="Search movies..."
                  showAutocomplete={false}
                  className="w-full"
                />
              </div>

              {/* Mobile Navigation Links */}
              <div className="space-y-1 pb-3 pt-2">
                {navigation.map(item => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium transition-colors ${
                        item.current
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <Icon className="mr-3 h-4 w-4" />
                        {item.name}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Mobile Account Section */}
              <div className="border-t border-gray-200 pb-3 pt-4">
                <div className="px-4 space-y-2">
                  <Link
                    href="/dashboard/account"
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Account Settings
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      handleSignOut()
                    }} 
                    className="w-full justify-start"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
