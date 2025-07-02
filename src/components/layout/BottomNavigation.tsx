'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Film, 
  Search, 
  User, 
  BookMarked,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number | string
}

export const BottomNavigation: React.FC = () => {
  const { user } = useAuth()
  const pathname = usePathname()

  // Only show on mobile and for authenticated users
  if (!user) return null

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: Home,
    },
    {
      href: '/dashboard/movies',
      label: 'Movies',
      icon: Film,
    },
    {
      href: '/search',
      label: 'Search',
      icon: Search,
    },
    {
      href: '/dashboard/watchlist',
      label: 'Watchlist',
      icon: BookMarked,
    },
    {
      href: '/dashboard/recommendations',
      label: 'For You',
      icon: Sparkles,
    }
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-20 md:hidden" />
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors touch-manipulation',
                  active
                    ? 'text-primary bg-primary/5'
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                )}
              >
                <div className="relative">
                  <Icon 
                    className={cn(
                      'h-5 w-5 transition-all duration-200',
                      active ? 'scale-110' : 'scale-100'
                    )} 
                  />
                  {item.badge && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {item.badge}
                    </div>
                  )}
                </div>
                <span className={cn(
                  'transition-all duration-200',
                  active ? 'opacity-100 font-semibold' : 'opacity-70'
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Hook to manage bottom navigation state
export const useBottomNavigation = () => {
  const pathname = usePathname()
  const { user } = useAuth()

  const shouldShow = Boolean(user && typeof window !== 'undefined' && window.innerWidth < 768)
  
  return {
    shouldShow,
    currentPath: pathname
  }
}