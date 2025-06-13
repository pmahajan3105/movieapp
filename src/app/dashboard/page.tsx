'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { IntelligenceDisplay } from '@/components/ai/IntelligenceDisplay'
import { Film, Sparkles, List, Brain, CheckCircle, BarChart3, Zap } from 'lucide-react'

export default function DashboardPage() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="bg-base-100 flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
          <p className="text-base-content/70 mt-4 text-center text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-base-100 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-base-content mb-2 text-3xl font-bold">Welcome to CineAI! 🎬</h1>
          <p className="text-base-content/70">Chat with our AI to discover your perfect movies</p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/movies"
            className="card from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20 cursor-pointer border bg-gradient-to-br shadow-lg transition-all"
          >
            <div className="card-body text-center">
              <div className="mb-2 flex items-center justify-center gap-1">
                <Film className="text-primary h-8 w-8" />
                <Brain className="text-secondary h-5 w-5" />
              </div>
              <h3 className="card-title text-primary justify-center text-lg">Smart Movies</h3>
              <p className="text-base-content/70 text-sm">
                AI-powered recommendations with explanations
              </p>
              <div className="mt-2 flex justify-center gap-1">
                <div className="badge badge-primary badge-sm">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI Enhanced
                </div>
                <div className="badge badge-outline badge-sm">
                  <Zap className="mr-1 h-3 w-3" />
                  Real-time
                </div>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/watchlist"
            className="card bg-base-200 hover:bg-base-300 cursor-pointer shadow-lg transition-colors"
          >
            <div className="card-body text-center">
              <List className="text-primary mx-auto mb-2 h-8 w-8" />
              <h3 className="card-title justify-center text-lg">My Watchlist</h3>
              <p className="text-base-content/70 text-sm">Movies saved for later</p>
            </div>
          </Link>

          <Link
            href="/dashboard/watched"
            className="card bg-base-200 hover:bg-base-300 cursor-pointer shadow-lg transition-colors"
          >
            <div className="card-body text-center">
              <CheckCircle className="text-success mx-auto mb-2 h-8 w-8" />
              <h3 className="card-title justify-center text-lg">Watched Movies</h3>
              <p className="text-base-content/70 text-sm">Your viewing history</p>
            </div>
          </Link>
        </div>

        {/* AI Chat Section */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="mb-4 text-center">
              <h2 className="card-title text-primary mb-2 justify-center text-2xl">
                <Brain className="mr-2 h-6 w-6" />
                Chat with CineAI
              </h2>
              <p className="text-base-content/70">
                Tell me about movies you love, genres you enjoy, or what you&apos;re in the mood
                for. I&apos;ll learn your preferences and provide personalized recommendations!
              </p>
            </div>
            <div className="mx-auto max-w-4xl">
              <ChatInterface />
            </div>
          </div>
        </div>

        {/* Movie Intelligence Section */}
        <section>
          <div className="card bg-base-200 mx-auto max-w-4xl shadow-xl">
            <div className="card-body">
              <div className="card-title mb-4 flex items-center justify-center gap-2 text-xl">
                <BarChart3 className="text-primary h-6 w-6" />
                Your Movie Intelligence
                <div className="badge badge-primary badge-sm">AI Insights</div>
              </div>
              <p className="text-base-content/70 mb-6 text-center">
                Behavioral analysis and personalized insights based on your viewing patterns
              </p>
              <div className="rounded-lg">
                <IntelligenceDisplay />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
