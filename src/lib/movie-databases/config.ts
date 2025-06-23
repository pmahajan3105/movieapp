// Movie Database Management System
// Centralized configuration for all movie data providers

import { logger } from '../logger'

export type MovieProvider = 'tmdb' | 'local'

export interface MovieDatabaseConfig {
  id: string
  name: string
  provider: MovieProvider
  description: string
  apiUrl: string
  requiresApiKey: boolean
  capabilities: DatabaseCapability[]
  costPer1kRequests: number
  rateLimit: {
    requestsPerSecond: number
    requestsPerDay: number
  }
  recommended: boolean
  dataQuality: {
    metadata: number // 1-10 rating
    images: number // 1-10 rating
    freshness: number // 1-10 rating
    coverage: number // 1-10 rating
  }
}

export type DatabaseCapability =
  | 'search'
  | 'trending'
  | 'detailed-info'
  | 'images'
  | 'trailers'
  | 'reviews'
  | 'similar-movies'
  | 'genre-filtering'
  | 'year-filtering'
  | 'real-time'
  | 'free-tier'

// Available Movie Databases Configuration
export const AVAILABLE_MOVIE_DATABASES: Record<string, MovieDatabaseConfig> = {
  // The Movie Database (TMDB) - Primary
  tmdb: {
    id: 'tmdb',
    name: 'The Movie Database (TMDB)',
    provider: 'tmdb',
    description:
      'Comprehensive movie database with trending, detailed metadata, and excellent image quality',
    apiUrl: 'https://api.themoviedb.org/3',
    requiresApiKey: true,
    capabilities: [
      'search',
      'trending',
      'detailed-info',
      'images',
      'trailers',
      'reviews',
      'similar-movies',
      'genre-filtering',
      'year-filtering',
      'real-time',
      'free-tier',
    ],
    costPer1kRequests: 0, // Free tier
    rateLimit: {
      requestsPerSecond: 40,
      requestsPerDay: 1000000,
    },
    recommended: true,
    dataQuality: {
      metadata: 9,
      images: 10,
      freshness: 9,
      coverage: 9,
    },
  },

  // Local Database - Fallback
  local: {
    id: 'local',
    name: 'Local Database',
    provider: 'local',
    description: 'Movies stored in our Supabase database - fast but limited selection',
    apiUrl: 'internal',
    requiresApiKey: false,
    capabilities: ['search', 'detailed-info', 'genre-filtering', 'year-filtering'],
    costPer1kRequests: 0,
    rateLimit: {
      requestsPerSecond: 100,
      requestsPerDay: 1000000,
    },
    recommended: false,
    dataQuality: {
      metadata: 8,
      images: 7,
      freshness: 4,
      coverage: 3,
    },
  },
}

// Database Selection Logic
export class MovieDatabaseSelector {
  private defaultDatabase: string
  private taskSpecificDatabases: Record<string, string>

  constructor() {
    // Load from environment or use defaults - prioritize TMDB
    this.defaultDatabase = process.env.MOVIE_DEFAULT_DATABASE || 'tmdb'
    this.taskSpecificDatabases = {
      search: process.env.MOVIE_SEARCH_DATABASE || 'tmdb',
      trending: process.env.MOVIE_TRENDING_DATABASE || 'tmdb',
      recommendations: process.env.MOVIE_RECOMMENDATIONS_DATABASE || 'tmdb',
      detailed_info: process.env.MOVIE_DETAILS_DATABASE || 'tmdb',
      fallback: process.env.MOVIE_FALLBACK_DATABASE || 'local',
    }
  }

  // Get database for specific task
  getDatabaseForTask(task: string): MovieDatabaseConfig {
    const databaseId = this.taskSpecificDatabases[task] || this.defaultDatabase
    const database = AVAILABLE_MOVIE_DATABASES[databaseId]

    if (!database) {
      logger.warn(`Database ${databaseId} not found, falling back to default`, {
        requestedDatabase: databaseId,
        task,
        availableDatabases: Object.keys(AVAILABLE_MOVIE_DATABASES),
      })
      const fallbackDatabase =
        AVAILABLE_MOVIE_DATABASES[this.defaultDatabase] || AVAILABLE_MOVIE_DATABASES['tmdb']
      if (!fallbackDatabase) {
        throw new Error(
          `No valid databases available. Check AVAILABLE_MOVIE_DATABASES configuration.`
        )
      }
      return fallbackDatabase
    }

    return database
  }

  // Get default database
  getDefaultDatabase(): MovieDatabaseConfig {
    const database =
      AVAILABLE_MOVIE_DATABASES[this.defaultDatabase] || AVAILABLE_MOVIE_DATABASES['tmdb']
    if (!database) {
      throw new Error(
        `No valid default database available. Check AVAILABLE_MOVIE_DATABASES configuration.`
      )
    }
    return database
  }

  // Get all available databases
  getAvailableDatabases(): MovieDatabaseConfig[] {
    return Object.values(AVAILABLE_MOVIE_DATABASES)
  }

  // Get databases by provider
  getDatabasesByProvider(provider: MovieProvider): MovieDatabaseConfig[] {
    return Object.values(AVAILABLE_MOVIE_DATABASES).filter(db => db.provider === provider)
  }

  // Get recommended databases
  getRecommendedDatabases(): MovieDatabaseConfig[] {
    return Object.values(AVAILABLE_MOVIE_DATABASES).filter(db => db.recommended)
  }

  // Check if database supports capability
  supportsCapability(databaseId: string, capability: DatabaseCapability): boolean {
    const database = AVAILABLE_MOVIE_DATABASES[databaseId]
    return database?.capabilities.includes(capability) || false
  }

  // Set database for specific task (runtime configuration)
  setDatabaseForTask(task: string, databaseId: string): void {
    if (!AVAILABLE_MOVIE_DATABASES[databaseId]) {
      throw new Error(`Database ${databaseId} not found`)
    }
    this.taskSpecificDatabases[task] = databaseId
  }

  // Get best database for capability
  getBestDatabaseForCapability(capability: DatabaseCapability): MovieDatabaseConfig {
    const supportingDatabases = Object.values(AVAILABLE_MOVIE_DATABASES)
      .filter(db => db.capabilities.includes(capability))
      .sort((a, b) => {
        // Sort by recommendation first, then by data quality
        if (a.recommended && !b.recommended) return -1
        if (!a.recommended && b.recommended) return 1

        const aScore =
          (a.dataQuality.metadata + a.dataQuality.freshness + a.dataQuality.coverage) / 3
        const bScore =
          (b.dataQuality.metadata + b.dataQuality.freshness + b.dataQuality.coverage) / 3

        return bScore - aScore
      })

    return supportingDatabases[0] || this.getDefaultDatabase()
  }

  // Check which API keys are configured
  checkApiKeyConfiguration(): { [key: string]: boolean } {
    return {
      tmdb: !!process.env.TMDB_API_KEY,
    }
  }
}

// Helper functions
export function getDatabaseForTask(task: string): MovieDatabaseConfig {
  return databaseSelector.getDatabaseForTask(task)
}

export function getDefaultDatabase(): MovieDatabaseConfig {
  return databaseSelector.getDefaultDatabase()
}

export function supportsCapability(databaseId: string, capability: DatabaseCapability): boolean {
  return databaseSelector.supportsCapability(databaseId, capability)
}

export function getBestDatabaseForCapability(capability: DatabaseCapability): MovieDatabaseConfig {
  return databaseSelector.getBestDatabaseForCapability(capability)
}

// Global database selector instance
export const databaseSelector = new MovieDatabaseSelector()

// Database status checker
export async function checkDatabasesHealth(): Promise<{
  [key: string]: { status: 'healthy' | 'error' | 'missing-key'; message: string }
}> {
  const results: {
    [key: string]: { status: 'healthy' | 'error' | 'missing-key'; message: string }
  } = {}

  // Check TMDB
  if (!process.env.TMDB_API_KEY) {
    results.tmdb = { status: 'missing-key', message: 'TMDB_API_KEY not configured' }
  } else {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`
      )
      if (response.ok) {
        results.tmdb = { status: 'healthy', message: 'TMDB API is accessible' }
      } else {
        results.tmdb = { status: 'error', message: `TMDB API error: ${response.status}` }
      }
    } catch (error) {
      results.tmdb = { status: 'error', message: `TMDB connection error: ${error}` }
    }
  }

  // Local database is always healthy
  results.local = { status: 'healthy', message: 'Local database is always available' }

  return results
}
