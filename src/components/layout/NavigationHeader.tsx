'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Film, List, Home, LogOut, User, Sparkles, Menu, X, Search } from 'lucide-react'
import { SearchInterface } from '@/components/search/SearchInterface'
import { useState } from 'react'

export function NavigationHeader() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: pathname === '/dashboard',
    },
    {
      name: 'Search',
      href: '/search',
      icon: Search,
      current: pathname === '/search',
    },
    {
      name: 'My Watchlist',
      href: '/watchlist',
      icon: List,
      current: pathname === '/watchlist',
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

            {/* Search Bar - Desktop Only */}
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

            {/* User Menu */}
            <div className="hidden items-center space-x-4 md:flex">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="max-w-32 truncate">{user.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
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
                  onSearch={query => {
                    handleSearch(query)
                    setIsMobileMenuOpen(false)
                  }}
                  placeholder="Search movies..."
                  showAutocomplete={false} // Simplified for mobile
                  className="w-full"
                />
              </div>

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
              <div className="border-t border-gray-200 pb-3 pt-4">
                <div className="flex items-center space-x-3 px-4">
                  <div className="flex-shrink-0">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium text-gray-800">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 px-4">
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
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
