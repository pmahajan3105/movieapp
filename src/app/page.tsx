'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { isLoading } = useAuth()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="hero bg-base-200 min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // This component should only render if user is not authenticated
  // (authenticated users are redirected by middleware)

  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-4xl">
          <h1 className="text-6xl font-bold">🎬 CineAI</h1>
          <p className="py-6 text-xl">Your Personal AI Movie Recommendation Assistant</p>

          <div className="mb-12">
            <h2 className="mb-6 text-4xl font-bold">Discover Movies You&apos;ll Actually Love</h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg">
              Have a natural conversation with our AI about your movie taste. CineAI learns your
              preferences and recommends films perfectly tailored to your unique style.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/auth/login" className="btn btn-primary">
                Get Started
              </Link>
              <Link href="/auth/login" className="btn btn-outline">
                Sign In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="mb-4 text-4xl">🤖</div>
                <h3 className="card-title">AI-Powered Chat</h3>
                <p>
                  Have natural conversations about movies. Our AI understands your taste and asks
                  the right questions.
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="mb-4 text-4xl">🎯</div>
                <h3 className="card-title">Smart Recommendations</h3>
                <p>
                  Get personalized movie suggestions based on your unique preferences, mood, and
                  viewing context.
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="mb-4 text-4xl">💫</div>
                <h3 className="card-title">Discover & Track</h3>
                <p>
                  Swipe through recommendations, build your watchlist, and discover hidden gems
                  you&apos;ll love.
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-16">
            <h3 className="mb-8 text-3xl font-bold">How CineAI Works</h3>
            <ul className="steps steps-vertical lg:steps-horizontal">
              <li className="step step-primary">
                <div className="p-4">
                  <h4 className="mb-2 text-lg font-semibold">Chat About Movies</h4>
                  <p className="text-sm">
                    Tell our AI about movies you love and your viewing preferences.
                  </p>
                </div>
              </li>
              <li className="step step-primary">
                <div className="p-4">
                  <h4 className="mb-2 text-lg font-semibold">Get Recommendations</h4>
                  <p className="text-sm">Swipe through personalized movie recommendations.</p>
                </div>
              </li>
              <li className="step">
                <div className="p-4">
                  <h4 className="mb-2 text-lg font-semibold">Build Your List</h4>
                  <p className="text-sm">
                    Save movies to your watchlist and track what you&apos;ve watched.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
