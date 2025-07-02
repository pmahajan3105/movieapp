import { Page } from '@playwright/test'

// Test user profiles
export const TEST_USERS = {
  defaultUser: {
    id: 'test-user-1',
    email: 'test@cineai.com',
    name: 'Test User',
    preferences: {
      genres: ['Action', 'Sci-Fi', 'Thriller'],
      dislikedGenres: ['Horror', 'Romance'],
      preferredRating: 'PG-13',
      preferredDecade: '2010s'
    }
  },
  powerUser: {
    id: 'power-user-1',
    email: 'poweruser@cineai.com',
    name: 'Power User',
    preferences: {
      genres: ['Drama', 'Comedy', 'Documentary'],
      dislikedGenres: ['Action'],
      preferredRating: 'R',
      preferredDecade: '1990s'
    }
  }
}

// Mock movie data
export const MOCK_MOVIES = [
  {
    id: '1',
    title: 'Inception',
    overview: 'A thief who steals corporate secrets through dream-sharing technology...',
    poster_url: 'https://image.tmdb.org/t/p/w500/inception.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/w1280/inception_backdrop.jpg',
    release_date: '2010-07-16',
    vote_average: 8.8,
    vote_count: 35000,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    runtime: 148,
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Marion Cotillard', 'Tom Hardy'],
    confidence_score: 0.95,
    reasoning: 'Perfect match for your love of mind-bending sci-fi thrillers',
    explanation: {
      why_recommended: 'Based on your preference for complex narratives and sci-fi themes',
      match_factors: ['Director preference', 'Genre alignment', 'High ratings'],
      confidence: 95
    }
  },
  {
    id: '2', 
    title: 'The Matrix',
    overview: 'A computer programmer discovers that reality as he knows it is a simulation...',
    poster_url: 'https://image.tmdb.org/t/p/w500/matrix.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/w1280/matrix_backdrop.jpg',
    release_date: '1999-03-31',
    vote_average: 8.7,
    vote_count: 25000,
    genres: ['Action', 'Sci-Fi'],
    runtime: 136,
    director: 'The Wachowskis',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    confidence_score: 0.92,
    reasoning: 'Classic sci-fi action that matches your taste profile',
    explanation: {
      why_recommended: 'Groundbreaking sci-fi action that defined a generation',
      match_factors: ['Genre match', 'Cultural impact', 'Action sequences'],
      confidence: 92
    }
  },
  {
    id: '3',
    title: 'Interstellar',
    overview: 'A team of explorers travel through a wormhole in space...',
    poster_url: 'https://image.tmdb.org/t/p/w500/interstellar.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/w1280/interstellar_backdrop.jpg',
    release_date: '2014-11-07',
    vote_average: 8.6,
    vote_count: 30000,
    genres: ['Sci-Fi', 'Drama'],
    runtime: 169,
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    confidence_score: 0.89,
    reasoning: 'Epic space drama with emotional depth',
    explanation: {
      why_recommended: 'Combines hard sci-fi concepts with human emotion',
      match_factors: ['Director familiarity', 'Complex themes', 'Visual spectacle'],
      confidence: 89
    }
  }
]

// Mock API responses
export const MOCK_API_RESPONSES = {
  movies: {
    success: true,
    data: MOCK_MOVIES,
    total: MOCK_MOVIES.length,
    pagination: {
      currentPage: 1,
      hasMore: false,
      totalPages: 1
    },
    source: 'smart-recommendations',
    vectorEnhanced: true
  },
  
  search: {
    success: true,
    data: MOCK_MOVIES.filter(movie => movie.title.toLowerCase().includes('inception')),
    total: 1,
    query: 'inception',
    suggestions: ['Inception', 'Interstellar', 'The Matrix']
  },
  
  watchlist: {
    success: true,
    data: [MOCK_MOVIES[0]], // Inception in watchlist
    total: 1
  },
  
  aiChat: {
    success: true,
    response: "Based on your preferences for sci-fi thrillers, I'd recommend Inception. It's a mind-bending film about dreams within dreams, directed by Christopher Nolan. The complex narrative and stunning visuals make it perfect for someone who enjoys thought-provoking cinema.",
    movieSuggestions: [MOCK_MOVIES[0]],
    conversationId: 'test-conversation-1'
  }
}

// Voice interaction mocks
export const VOICE_MOCKS = {
  transcriptions: {
    'show me action movies': 'Looking for action movies...',
    'add to watchlist': 'Adding to your watchlist...',
    'what about comedy': 'Here are some comedy recommendations...',
    'remove from watchlist': 'Removing from watchlist...'
  },
  
  responses: {
    'I want action movies': "Here are some great action movies I think you'd enjoy. I've selected these based on your viewing history and preferences.",
    'tell me about inception': "Inception is a 2010 sci-fi thriller directed by Christopher Nolan. It follows Dom Cobb, a thief who enters people's dreams to steal secrets. The film explores themes of reality, memory, and the subconscious mind.",
    'show my watchlist': "You currently have 3 movies in your watchlist: Inception, The Matrix, and Interstellar. Would you like me to recommend something similar?"
  }
}

// Error scenarios
export const ERROR_SCENARIOS = {
  apiError: {
    status: 500,
    response: { error: 'Internal server error', code: 'INTERNAL_ERROR' }
  },
  
  networkError: {
    status: 0,
    response: null
  },
  
  authError: {
    status: 401,
    response: { error: 'Unauthorized', code: 'AUTH_ERROR' }
  },
  
  rateLimitError: {
    status: 429,
    response: { error: 'Too many requests', retryAfter: 60 }
  }
}

// Helper functions for test setup
export class TestDataHelper {
  static async setupAuthenticatedUser(page: Page, user = TEST_USERS.defaultUser) {
    await page.addInitScript((userData) => {
      localStorage.setItem('supabase.auth.token', 'mock-auth-token')
      localStorage.setItem('user-profile', JSON.stringify(userData))
      
      // Mock user session
      window.__TEST_USER__ = userData
    }, user)
  }
  
  static async setupApiMocks(page: Page) {
    await page.route('**/api/movies**', async route => {
      const url = route.request().url()
      
      if (url.includes('search')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_API_RESPONSES.search)
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_API_RESPONSES.movies)
        })
      }
    })
    
    await page.route('**/api/watchlist**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_API_RESPONSES.watchlist)
      })
    })
    
    await page.route('**/api/ai/chat**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_API_RESPONSES.aiChat)
      })
    })
  }
  
  static async setupVoiceMocks(page: Page) {
    await page.addInitScript((mocks) => {
      // Mock Speech Recognition
      window.SpeechRecognition = class MockSpeechRecognition {
        onstart = null
        onresult = null
        onerror = null
        onend = null
        continuous = true
        interimResults = true
        
        start() {
          if (this.onstart) this.onstart()
          
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript: 'show me action movies' },
                  isFinal: true
                }]
              })
            }
          }, 1000)
        }
        
        stop() {
          if (this.onend) this.onend()
        }
        
        abort() {
          if (this.onend) this.onend()
        }
      }
      
      window.webkitSpeechRecognition = window.SpeechRecognition
      
      // Mock Speech Synthesis
      window.speechSynthesis = {
        speak: (utterance) => {
          console.log('TTS:', utterance.text)
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [
          { name: 'English US', lang: 'en-US', default: true }
        ],
        speaking: false,
        pending: false,
        paused: false
      }
      
      // Mock getUserMedia
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve(new MediaStream())
      }
      
      // Store mocks for access
      window.__VOICE_MOCKS__ = mocks
    }, VOICE_MOCKS)
  }
  
  static async setupErrorScenario(page: Page, scenario: keyof typeof ERROR_SCENARIOS) {
    const errorConfig = ERROR_SCENARIOS[scenario]
    
    await page.route('**/api/**', route => {
      route.fulfill({
        status: errorConfig.status,
        contentType: 'application/json',
        body: JSON.stringify(errorConfig.response)
      })
    })
  }
  
  static async setupPerformanceMonitoring(page: Page) {
    await page.addInitScript(() => {
      // Track performance metrics
      window.__PERFORMANCE_METRICS__ = {
        navigationStart: Date.now(),
        loadTimes: {},
        apiCalls: []
      }
      
      // Intercept API calls for timing
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const start = Date.now()
        try {
          const response = await originalFetch(...args)
          const duration = Date.now() - start
          window.__PERFORMANCE_METRICS__.apiCalls.push({
            url: args[0],
            duration,
            status: response.status
          })
          return response
        } catch (error) {
          const duration = Date.now() - start
          window.__PERFORMANCE_METRICS__.apiCalls.push({
            url: args[0],
            duration,
            error: error.message
          })
          throw error
        }
      }
    })
  }
  
  static async getPerformanceMetrics(page: Page) {
    return await page.evaluate(() => window.__PERFORMANCE_METRICS__)
  }
  
  static async simulateSlowNetwork(page: Page, delay = 3000) {
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, delay))
      route.continue()
    })
  }
  
  static async simulateOffline(page: Page) {
    await page.context().setOffline(true)
  }
  
  static async goOnline(page: Page) {
    await page.context().setOffline(false)
  }
}

// Test assertions helpers
export class TestAssertions {
  static async assertMovieCardVisible(page: Page, movieTitle?: string) {
    const movieCard = page.locator('[data-testid="movie-card"]')
    await movieCard.first().waitFor({ state: 'visible', timeout: 10000 })
    
    if (movieTitle) {
      await page.locator(`[data-testid="movie-card"]:has-text("${movieTitle}")`).waitFor({ state: 'visible' })
    }
  }
  
  static async assertLoadingState(page: Page) {
    const loadingIndicator = page.locator('.loading, [data-testid="loading"], [data-testid="skeleton"]')
    await loadingIndicator.first().waitFor({ state: 'visible', timeout: 5000 })
  }
  
  static async assertErrorState(page: Page, errorMessage?: string) {
    const errorElement = page.locator('[data-testid="error"], .error, text=error')
    await errorElement.first().waitFor({ state: 'visible', timeout: 10000 })
    
    if (errorMessage) {
      await page.locator(`text=${errorMessage}`).waitFor({ state: 'visible' })
    }
  }
  
  static async assertToastMessage(page: Page, message: string) {
    await page.locator(`text=${message}`).waitFor({ state: 'visible', timeout: 5000 })
  }
}