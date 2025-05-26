'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { AuthDebugger } from '@/components/debug/AuthDebugger'
import { toast } from 'react-hot-toast'
import { Film, Sparkles, List, Brain, Target, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-base-100 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
          <p className="mt-4 text-center text-sm text-base-content/70">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-base-content">Welcome to CineAI! 🎬</h1>
          <p className="text-base-content/70">Chat with our AI to discover your perfect movies</p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/movies" className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer shadow-lg">
            <div className="card-body text-center">
              <Film className="h-8 w-8 mx-auto text-primary mb-2" />
              <h3 className="card-title justify-center text-lg">Browse Movies</h3>
              <p className="text-base-content/70 text-sm">Explore our movie collection</p>
            </div>
          </Link>

          <Link href="/dashboard/recommendations" className="card bg-gradient-to-br from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 transition-all cursor-pointer shadow-lg border border-primary/20">
            <div className="card-body text-center">
              <div className="flex justify-center items-center gap-1 mb-2">
                <Brain className="h-8 w-8 text-primary" />
                <Sparkles className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="card-title justify-center text-lg text-primary">AI Recommendations</h3>
              <p className="text-base-content/70 text-sm">Personalized suggestions with explanations</p>
              <div className="badge badge-primary badge-sm mt-2">
                <Target className="h-3 w-3 mr-1" />
                Smart Picks
              </div>
            </div>
          </Link>

          <Link href="/dashboard/watchlist" className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer shadow-lg">
            <div className="card-body text-center">
              <List className="h-8 w-8 mx-auto text-primary mb-2" />
              <h3 className="card-title justify-center text-lg">My Watchlist</h3>
              <p className="text-base-content/70 text-sm">Movies saved for later</p>
            </div>
          </Link>

          <Link href="/dashboard/watched" className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer shadow-lg">
            <div className="card-body text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
              <h3 className="card-title justify-center text-lg">Watched Movies</h3>
              <p className="text-base-content/70 text-sm">Your viewing history</p>
            </div>
          </Link>
        </div>

        {/* Debug Section - Temporary */}
        <section className="mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 font-medium">🔧 Debug Mode: Authentication Troubleshooter</p>
            <p className="text-yellow-700 text-sm">This will help us fix the delete functionality issue.</p>
          </div>
          <AuthDebugger />
        </section>

        {/* AI Chat Section */}
        <section>
          <div className="card bg-base-200 shadow-xl mx-auto max-w-4xl">
            <div className="card-body">
              <div className="card-title flex items-center justify-center gap-2 text-xl mb-4">
                <div className="badge badge-success badge-xs"></div>
                Chat with CineAI
              </div>
              <p className="text-center text-base-content/70 mb-6">
                Tell me what kind of movies you&apos;re looking for and I&apos;ll help you discover amazing films!
              </p>
              <div className="h-[600px] overflow-hidden rounded-lg">
                <ChatInterface
                  onPreferencesExtracted={preferences => {
                    console.log('Preferences learned:', preferences)
                    // Show success message and suggest next steps
                    setTimeout(() => {
                      toast.success('🎯 Preferences saved! Check out your personalized movies!')
                    }, 500)
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
