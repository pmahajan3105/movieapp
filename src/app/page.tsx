'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // User is authenticated, redirect to dashboard
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="mb-6 text-6xl font-bold text-white">
            🎬{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              CineAI
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-300">
            Your Personal AI Movie Recommendation Assistant
          </p>
        </header>

        {/* Hero Section */}
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">
            Discover Movies You&apos;ll Actually Love
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-300">
            Have a natural conversation with our AI about your movie taste. CineAI learns your
            preferences and recommends films perfectly tailored to your unique style.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/auth/login">
              <Button
                size="lg"
                className="bg-purple-600 px-8 py-3 text-lg text-white hover:bg-purple-700"
              >
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white px-8 py-3 text-lg text-white hover:bg-white hover:text-purple-900"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mb-16 grid max-w-6xl gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
            <div className="mb-4 text-4xl">🤖</div>
            <h3 className="mb-3 text-xl font-semibold text-white">AI-Powered Chat</h3>
            <p className="text-gray-300">
              Have natural conversations about movies. Our AI understands your taste and asks the
              right questions.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
            <div className="mb-4 text-4xl">🎯</div>
            <h3 className="mb-3 text-xl font-semibold text-white">Smart Recommendations</h3>
            <p className="text-gray-300">
              Get personalized movie suggestions based on your unique preferences, mood, and viewing
              context.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
            <div className="mb-4 text-4xl">💫</div>
            <h3 className="mb-3 text-xl font-semibold text-white">Discover & Track</h3>
            <p className="text-gray-300">
              Swipe through recommendations, build your watchlist, and discover hidden gems
              you&apos;ll love.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="mb-8 text-3xl font-bold text-white">How CineAI Works</h3>
          <div className="grid gap-6 text-left md:grid-cols-3">
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 font-bold text-white">
                1
              </div>
              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">Chat About Movies</h4>
                <p className="text-gray-300">
                  Tell our AI about movies you love, genres you enjoy, and your viewing preferences.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                2
              </div>
              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">Get Recommendations</h4>
                <p className="text-gray-300">
                  Swipe through personalized movie recommendations tailored to your taste.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                3
              </div>
              <div>
                <h4 className="mb-2 text-lg font-semibold text-white">Build Your List</h4>
                <p className="text-gray-300">
                  Save movies to your watchlist and track what you&apos;ve watched.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
