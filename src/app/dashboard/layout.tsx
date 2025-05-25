'use client'

import { RequireAuth } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Film, List, User } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Movies', href: '/dashboard/movies', icon: Film },
  { name: 'Watchlist', href: '/dashboard/watchlist', icon: List },
  { name: 'Account', href: '/dashboard/account', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const pathname = usePathname()

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        {/* Dashboard navigation */}
        <nav className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-semibold text-gray-900">CineAI</h1>

                {/* Navigation links */}
                <div className="hidden space-x-4 md:flex">
                  {navigation.map(item => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                            ? 'bg-purple-100 text-purple-700'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* User menu */}
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={signOut}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          <div className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              {navigation.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center rounded-md px-3 py-2 text-base font-medium transition-colors ${
                      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </RequireAuth>
  )
}
