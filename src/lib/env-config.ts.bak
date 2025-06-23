// Environment configuration with validation and type safety

import { logger } from './logger'

const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

// Validate required environment variables
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

// Optional environment variable with default
function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

// Supabase configuration
export const supabaseConfig = {
  url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
} as const

// AI service configurations
export const aiConfig = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY, // Optional for some features
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY, // Optional for some features
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY, // Optional for movie data
  },
} as const

// Logging configuration
export const loggingConfig = {
  level: isDev ? 'debug' : 'error',
  enableConsole: isDev,
  enableRemote: isProd,
} as const

// App configuration
export const appConfig = {
  isDev,
  isProd,
  baseUrl: optionalEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000'),
  version: optionalEnv('NEXT_PUBLIC_APP_VERSION', '0.1.0'),
} as const

// Export combined config
export const config = {
  app: appConfig,
  supabase: supabaseConfig,
  ai: aiConfig,
  logging: loggingConfig,
} as const

// Validate configuration on import
try {
  // This will throw if required env vars are missing
  void config.supabase.url
  void config.supabase.anonKey
} catch (error) {
  logger.error('Environment configuration error', {
    error: error instanceof Error ? error.message : String(error),
    missingVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].filter(
      key => !process.env[key]
    ),
  })
  throw error
}
