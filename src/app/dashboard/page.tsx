'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, Zap, Users, TrendingUp } from 'lucide-react'
import { MovieSpotlight, CategoryRow, QuickRateCard } from '@/components/movies'
import { ChatBar } from '@/components/chat'
import { Button } from '@/components/ui/button'
import type { 
  DailySpotlight, 
  BrowseCategory, 
  Movie, 
  DashboardState 
} from '@/types'

const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Blade Runner 2049',
    year: 2017,
    genre: ['Sci-Fi', 'Drama', 'Thriller'],
    director: ['Denis Villeneuve'],
    cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas'],
    plot: 'Young Blade Runner K discovers a secret that could change the course of humanity.',
    poster_url: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    rating: 8.0,
    runtime: 164,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'The Matrix',
    year: 1999,
    genre: ['Sci-Fi', 'Action'],
    director: ['The Wachowskis'],
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    plot: 'A computer programmer discovers reality as he knows it is actually a simulation.',
    poster_url: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    rating: 8.7,
    runtime: 136,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Interstellar',
    year: 2014,
    genre: ['Sci-Fi', 'Drama', 'Adventure'],
    director: ['Christopher Nolan'],
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    plot: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity&apos;s survival.',
    poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    rating: 8.6,
    runtime: 169,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

const MOCK_SPOTLIGHTS: DailySpotlight[] = [
  {
    id: '1',
    user_id: 'user-1',
    movie_id: '1',
    movie: MOCK_MOVIES[0],
    position: 1,
    ai_reason: 'Based on your love for visually stunning sci-fi films and appreciation for deep philosophical themes, this Denis Villeneuve masterpiece combines breathtaking cinematography with thought-provoking questions about humanity and identity.',
    confidence_score: 0.95,
    generated_date: new Date().toISOString().split('T')[0],
    viewed: false,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'user-1',
    movie_id: '2',
    movie: MOCK_MOVIES[1],
    position: 2,
    ai_reason: 'Your interest in groundbreaking cinema and innovative storytelling makes this a perfect match. The Matrix revolutionized action films and explores themes of reality and consciousness that align with your viewing preferences.',
    confidence_score: 0.87,
    generated_date: new Date().toISOString().split('T')[0],
    viewed: false,
    created_at: new Date().toISOString()
  }
]

const MOCK_CATEGORIES: BrowseCategory[] = [
  {
    id: '1',
    user_id: 'user-1',
    category_name: 'Mind-Bending Sci-Fi',
    ai_description: 'Films that challenge perception and explore the nature of reality, perfect for viewers who enjoy thought-provoking narratives',
    movie_ids: ['1', '2', '3'],
    movies: MOCK_MOVIES,
    generated_date: new Date().toISOString().split('T')[0],
    position: 1,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'user-1',
    category_name: 'Visually Stunning Epics',
    ai_description: 'Cinematographically magnificent films that showcase the art of visual storytelling',
    movie_ids: ['1', '3'],
    movies: [MOCK_MOVIES[0], MOCK_MOVIES[2]],
    generated_date: new Date().toISOString().split('T')[0],
    position: 2,
    created_at: new Date().toISOString()
  }
]

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<DashboardState>({
    spotlights: MOCK_SPOTLIGHTS,
    categories: MOCK_CATEGORIES,
    selectedMovie: null,
    chatHistory: [],
    quickRateMovies: [],
    isQuickRateMode: false
  })
  const [isChatLoading, setIsChatLoading] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on onboarding status
      if (user.onboarding_completed) {
        router.push('/dashboard/swipe')
      } else {
        router.push('/dashboard/preferences')
      }
    } else if (!loading && !user) {
      // Not authenticated, redirect to login
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleRate = (movieId: string, interested: boolean, rating?: number) => {
    console.log('Rating movie:', { movieId, interested, rating })
    // TODO: Implement API call to save rating
  }

  const handleAddToWatchlist = (movieId: string) => {
    console.log('Adding to watchlist:', movieId)
    // TODO: Implement API call to add to watchlist
  }

  const handleChatMessage = async (message: string) => {
    setIsChatLoading(true)
    console.log('Chat message:', message)
    // TODO: Implement AI chat API call
    
    // Simulate API delay
    setTimeout(() => {
      setIsChatLoading(false)
    }, 2000)
  }

  const handleStartQuickRate = () => {
    setState(prev => ({
      ...prev,
      isQuickRateMode: true,
      quickRateMovies: MOCK_MOVIES.slice(0, 10) // Get 10 movies for quick rating
    }))
  }

  const handleQuickRateMovie = (interested: boolean) => {
    setState(prev => {
      const currentMovie = prev.quickRateMovies[0]
      if (currentMovie) {
        handleRate(currentMovie.id, interested)
      }

      const remainingMovies = prev.quickRateMovies.slice(1)
      
      if (remainingMovies.length === 0) {
        // Quick rate session complete
        return {
          ...prev,
          isQuickRateMode: false,
          quickRateMovies: []
        }
      }

      return {
        ...prev,
        quickRateMovies: remainingMovies
      }
    })
  }

  const currentQuickRateMovie = state.quickRateMovies[0]
  const quickRateProgress = state.quickRateMovies.length > 0 
    ? ((10 - state.quickRateMovies.length) / 10) * 100 
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="pb-20"> {/* Bottom padding for chat bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Discover Your Next Favorite Movie
            </h1>
            <p className="text-gray-600">
              AI-curated recommendations based on your unique taste
            </p>
          </div>

          {/* Quick Rate Mode */}
          {state.isQuickRateMode && currentQuickRateMovie ? (
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-gray-900">Quick Rate</h2>
                    <span className="text-sm text-gray-600">
                      {10 - state.quickRateMovies.length + 1} of 10
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${quickRateProgress}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <QuickRateCard
                    movie={currentQuickRateMovie}
                    onRate={handleQuickRateMovie}
                    className="max-w-md"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Daily Spotlights */}
              <section className="mb-12">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-500" />
                      Today&apos;s Spotlights
                    </h2>
                    <p className="text-gray-600 mt-1">
                      5 hand-picked movies just for you
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleStartQuickRate}
                    variant="outline"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Quick Rate
                  </Button>
                </div>

                <div className="space-y-6">
                  {state.spotlights.map((spotlight) => (
                    <MovieSpotlight
                      key={spotlight.id}
                      spotlight={spotlight}
                      onRate={handleRate}
                      onAddToWatchlist={handleAddToWatchlist}
                    />
                  ))}
                </div>
              </section>

              {/* Browse Categories */}
              <section className="mb-12">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                    Browse Categories
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Explore curated collections tailored to your taste
                  </p>
                </div>

                <div className="space-y-8">
                  {state.categories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      movies={category.movies || []}
                      onMovieClick={(movie) => setState(prev => ({ ...prev, selectedMovie: movie }))}
                      onRate={handleRate}
                    />
                  ))}
                </div>
              </section>

              {/* Getting Started Banner (if no interactions yet) */}
              <section className="mb-12">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 rounded-full p-3">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-purple-900 mb-2">
                        New here? Let&apos;s find your taste!
                      </h3>
                      <p className="text-purple-800 mb-4">
                        The more you interact, the better our recommendations become. 
                        Try the Quick Rate mode or chat with our AI to get started.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleStartQuickRate}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Start Quick Rating
                        </Button>
                        <Button
                          variant="outline"
                          className="border-purple-300 text-purple-600 hover:bg-purple-50"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Chat with AI
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Chat Bar */}
      <ChatBar
        onSendMessage={handleChatMessage}
        isLoading={isChatLoading}
        placeholder="Ask for recommendations, describe your mood, or chat about movies... 🍿"
      />
    </div>
  )
} 