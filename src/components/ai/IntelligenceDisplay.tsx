'use client'

import { useState, useEffect } from 'react'
import { analyzeCompleteUserBehavior, type UserBehaviorProfile } from '@/lib/ai/behavioral-analysis'
// import { movieMemoryService } from '@/lib/mem0/client' // Disabled - package removed
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

// interface MovieMemory {
//   id: string
//   text?: string
//   memory?: string
//   categories?: string[]
//   metadata?: Record<string, unknown>
//   created_at?: string
//   updated_at?: string
// }

interface IntelligenceDisplayProps {
  className?: string
  onClose?: () => void
}

export function IntelligenceDisplay({ className = '', onClose }: IntelligenceDisplayProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [behaviorProfile, setBehaviorProfile] = useState<UserBehaviorProfile | null>(null)
  const [memories, setMemories] = useState<
    Array<{ memory: string; created_at: string; category: string }>
  >([])
  const [activeTab, setActiveTab] = useState<'overview' | 'ratings' | 'behavior' | 'memories'>(
    'overview'
  )

  useEffect(() => {
    if (user?.id) {
      loadIntelligenceData()
    }
  }, [user?.id])

  const loadIntelligenceData = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      // Load behavioral analysis (memory service disabled)
      const profile = await analyzeCompleteUserBehavior(user.id)

      setBehaviorProfile(profile)
      // Memory data disabled - package removed
      setMemories([])
    } catch (error) {
      console.error('Failed to load intelligence data:', error)
      setError(
        'Unable to analyze movie intelligence. You might need to rate some movies or use the chat to tell the AI your preferences.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    loadIntelligenceData()
  }

  if (!user?.id) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-primary">🧠 Your Movie Intelligence</h2>
          <p className="text-base-content/70">
            Sign in to see what we&apos;ve learned about your movie preferences!
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <span className="loading loading-spinner loading-md text-primary"></span>
            <span>Analyzing your movie intelligence...</span>
          </div>
          <progress
            className="progress progress-primary mt-4 w-full"
            value="70"
            max="100"
          ></progress>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="alert alert-warning">
            <div className="flex-1">
              <div>
                <h3 className="font-bold">⚠️ No Intelligence Data Yet</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
          <div className="card-actions mt-4 justify-center">
            <button onClick={handleRefresh} className="btn btn-primary">
              Try Again
            </button>
            <a href="/dashboard/movies" className="btn btn-outline">
              Rate Some Movies
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Show helpful message when no data but no error
  if (
    !isLoading &&
    !error &&
    (!behaviorProfile ||
      (behaviorProfile.rating_patterns.total_ratings === 0 &&
        behaviorProfile.watchlist_patterns.completion_rate === 0 &&
        memories.length === 0))
  ) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title text-primary mb-4 justify-center text-2xl">
            🧠 Your Movie Intelligence
          </h2>

          <div className="alert alert-info mb-6">
            <span className="text-lg">🎬 No Data Yet - Let&apos;s Get Started!</span>
          </div>

          <p className="text-base-content/70 mb-6">Your movie intelligence will grow as you:</p>

          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 text-left">
              <span className="badge badge-primary">⭐</span>
              <span>Rate movies you&apos;ve watched</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="badge badge-secondary">📝</span>
              <span>Tell the AI your preferences in chat</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="badge badge-accent">📋</span>
              <span>Add movies to your watchlist</span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Link href="/dashboard/movies" className="btn btn-primary">
              Browse Movies
            </Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn btn-outline"
            >
              Chat with AI
            </button>
          </div>
        </div>
      </div>
    )
  }

  const hasNoData =
    !behaviorProfile ||
    (behaviorProfile.rating_patterns.total_ratings === 0 &&
      behaviorProfile.watchlist_patterns.completion_rate === 0 &&
      memories.length === 0)

  if (hasNoData) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body text-center">
          <div className="mb-4">
            <div className="mb-4 text-6xl">🎬</div>
            <h2 className="card-title text-primary mb-2 justify-center text-2xl">
              Start Your Movie Journey!
            </h2>
            <p className="text-base-content/70 mb-6">
              We need some data to analyze your preferences and build your intelligence profile.
            </p>
          </div>

          <div className="steps steps-vertical lg:steps-horizontal mb-8 w-full">
            <div className="step step-primary">Rate Movies</div>
            <div className="step">Build Watchlist</div>
            <div className="step">Get Insights</div>
          </div>

          <div className="card-actions justify-center gap-4">
            <a href="/dashboard/movies" className="btn btn-primary">
              📊 Rate Movies
            </a>
            <a href="/dashboard" className="btn btn-secondary">
              🤖 Chat with AI
            </a>
            <button onClick={handleRefresh} className="btn btn-outline btn-sm">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="card-title text-primary text-2xl">🧠 Your Movie Intelligence</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="btn btn-ghost btn-sm"
              disabled={isLoading}
              title="Refresh intelligence data"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>🔄 Refresh</>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`tab ${activeTab === 'ratings' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ Ratings
          </button>
          <button
            className={`tab ${activeTab === 'behavior' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('behavior')}
          >
            🎬 Behavior
          </button>
          <button
            className={`tab ${activeTab === 'memories' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('memories')}
          >
            🧩 Memories
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && behaviorProfile && (
          <div className="space-y-6">
            <div className="stats stats-vertical lg:stats-horizontal w-full shadow">
              <div className="stat">
                <div className="stat-title">Movies Rated</div>
                <div className="stat-value text-primary">
                  {behaviorProfile.rating_patterns.total_ratings}
                </div>
                <div className="stat-desc">
                  Average: {behaviorProfile.rating_patterns.average_rating}⭐
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Watchlist Completion</div>
                <div className="stat-value text-secondary">
                  {behaviorProfile.watchlist_patterns.completion_rate}%
                </div>
                <div className="stat-desc">
                  Time to watch: {behaviorProfile.watchlist_patterns.average_time_to_watch} days
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Viewing Velocity</div>
                <div className="stat-value text-accent">
                  {behaviorProfile.temporal_patterns.recent_viewing_velocity}
                </div>
                <div className="stat-desc">movies per week</div>
              </div>
            </div>

            <div className="alert alert-info">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <h3 className="font-bold">Taste Profile</h3>
                    <p className="text-sm">
                      Your taste consistency is{' '}
                      <strong>
                        {Math.round(
                          behaviorProfile.intelligence_insights.taste_consistency_score * 100
                        )}
                        %
                      </strong>{' '}
                      (
                      {behaviorProfile.intelligence_insights.taste_consistency_score > 0.7
                        ? 'very predictable'
                        : 'diverse tastes'}
                      ). Quality threshold:{' '}
                      <strong>{behaviorProfile.intelligence_insights.quality_threshold}⭐</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ratings Tab */}
        {activeTab === 'ratings' && behaviorProfile && (
          <div className="space-y-6">
            {behaviorProfile.rating_patterns.five_star_movies.length > 0 && (
              <div className="card bg-success/10 border-success/20 border">
                <div className="card-body">
                  <h3 className="card-title text-success">⭐⭐⭐⭐⭐ Movies You Love</h3>
                  <div className="flex flex-wrap gap-2">
                    {behaviorProfile.rating_patterns.five_star_movies
                      .slice(0, 6)
                      .map((pattern, index) => (
                        <div key={index} className="badge badge-success badge-outline">
                          {pattern.movie.title} ({pattern.movie.year})
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {behaviorProfile.rating_patterns.one_star_movies.length > 0 && (
              <div className="card bg-error/10 border-error/20 border">
                <div className="card-body">
                  <h3 className="card-title text-error">⭐ Movies You Disliked</h3>
                  <div className="flex flex-wrap gap-2">
                    {behaviorProfile.rating_patterns.one_star_movies
                      .slice(0, 4)
                      .map((pattern, index) => (
                        <div key={index} className="badge badge-error badge-outline">
                          {pattern.movie.title} ({pattern.movie.year})
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">Top Rated Genres</h3>
                <div className="space-y-2">
                  {Array.from(behaviorProfile.rating_patterns.genre_rating_averages.entries())
                    .filter(([, rating]) => rating >= 4.0)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([genre, rating]) => (
                      <div key={genre} className="flex items-center justify-between">
                        <span className="font-medium">{genre}</span>
                        <div className="badge badge-primary">{rating}⭐</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Behavior Tab */}
        {activeTab === 'behavior' && behaviorProfile && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="card bg-primary/10 border-primary/20 border">
                <div className="card-body">
                  <h3 className="card-title text-primary">Weekend Preferences</h3>
                  <div className="flex flex-wrap gap-1">
                    {behaviorProfile.temporal_patterns.weekend_genres.map(genre => (
                      <div key={genre} className="badge badge-primary badge-sm">
                        {genre}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card bg-secondary/10 border-secondary/20 border">
                <div className="card-body">
                  <h3 className="card-title text-secondary">Weekday Preferences</h3>
                  <div className="flex flex-wrap gap-1">
                    {behaviorProfile.temporal_patterns.weekday_genres.map(genre => (
                      <div key={genre} className="badge badge-secondary badge-sm">
                        {genre}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {behaviorProfile.watchlist_patterns.impulse_watches.length > 0 && (
              <div className="card bg-warning/10 border-warning/20 border">
                <div className="card-body">
                  <h3 className="card-title text-warning">
                    ⚡ Impulse Watches
                    <div className="badge badge-warning badge-sm">Watched within 48 hours</div>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {behaviorProfile.watchlist_patterns.impulse_watches
                      .slice(0, 4)
                      .map((pattern, index) => (
                        <div key={index} className="badge badge-warning badge-outline">
                          {pattern.movie.title}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {behaviorProfile.watchlist_patterns.abandoned_movies.length > 0 && (
              <div className="card bg-base-300">
                <div className="card-body">
                  <h3 className="card-title">
                    📚 Abandoned Watchlist
                    <div className="badge badge-neutral badge-sm">Added but never watched</div>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {behaviorProfile.watchlist_patterns.abandoned_movies
                      .slice(0, 4)
                      .map((pattern, index) => (
                        <div key={index} className="badge badge-neutral badge-outline">
                          {pattern.movie.title}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Memories Tab */}
        {activeTab === 'memories' && (
          <div className="space-y-4">
            {memories.length === 0 ? (
              <div className="text-base-content/70 py-8 text-center">
                <p>
                  No memories collected yet. Start rating movies and chatting to build your
                  intelligence profile!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {memories.slice(0, 20).map((memory, index) => (
                  <div key={index} className="card bg-base-200 card-compact">
                    <div className="card-body">
                      <div className="flex items-start justify-between gap-3">
                        <p className="flex-1 text-sm">{memory.memory}</p>
                        <div className="flex flex-col items-end gap-1">
                          <div className="badge badge-primary badge-xs">{memory.category}</div>
                          <span className="text-base-content/60 text-xs">
                            {new Date(memory.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card-actions mt-6 justify-end">
          <button
            onClick={loadIntelligenceData}
            className="btn btn-primary btn-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Refreshing...
              </>
            ) : (
              <>🔄 Refresh Intelligence</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
