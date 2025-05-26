'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white max-w-4xl mx-auto">
          {/* Header */}
          <h1 className="text-6xl font-bold mb-6">
            🎬 CineAI
          </h1>
          <p className="text-xl mb-8 opacity-90">
            Your Personal AI Movie Recommendation Assistant
          </p>

          {/* Hero Description */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-6">
              Discover Movies You&apos;ll Actually Love
            </h2>
            <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
              Have a natural conversation with our AI about your movie taste. CineAI learns your
              preferences and recommends films perfectly tailored to your unique style.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link 
                href="/auth/login" 
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
              <Link 
                href="/auth/login" 
                className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Chat</h3>
              <p className="opacity-80">
                Have natural conversations about movies. Our AI understands your taste and asks the
                right questions.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-3">Smart Recommendations</h3>
              <p className="opacity-80">
                Get personalized movie suggestions based on your unique preferences, mood, and viewing
                context.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">💫</div>
              <h3 className="text-xl font-bold mb-3">Discover & Track</h3>
              <p className="opacity-80">
                Swipe through recommendations, build your watchlist, and discover hidden gems
                you&apos;ll love.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-8">How CineAI Works</h3>
            <div className="flex flex-col lg:flex-row justify-center items-center gap-8">
              <div className="flex-1 text-center">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-4 mx-auto">1</div>
                <h4 className="text-lg font-semibold mb-2">Chat About Movies</h4>
                <p className="text-sm opacity-80">
                  Tell our AI about movies you love and your viewing preferences.
                </p>
              </div>
              <div className="hidden lg:block text-2xl">→</div>
              <div className="flex-1 text-center">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-4 mx-auto">2</div>
                <h4 className="text-lg font-semibold mb-2">Get Recommendations</h4>
                <p className="text-sm opacity-80">
                  Swipe through personalized movie recommendations.
                </p>
              </div>
              <div className="hidden lg:block text-2xl">→</div>
              <div className="flex-1 text-center">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-4 mx-auto">3</div>
                <h4 className="text-lg font-semibold mb-2">Build Your List</h4>
                <p className="text-sm opacity-80">
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
