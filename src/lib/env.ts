import { z } from 'zod'

const envSchema = z.object({
  // TMDB API
  TMDB_API_KEY: z.string().min(1, 'TMDB API key is required'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),

  // Anthropic API
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required'),

  // Groq API (optional)
  GROQ_API_KEY: z.string().min(1, 'Groq API key is required'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Optional: Override default database assignments
  MOVIE_DEFAULT_DATABASE: z.string().optional(),
  MOVIE_SEARCH_DATABASE: z.string().optional(),
  MOVIE_TRENDING_DATABASE: z.string().optional(),
  MOVIE_RECOMMENDATIONS_DATABASE: z.string().optional(),
  MOVIE_FALLBACK_DATABASE: z.string().optional(),
})

// Cache the parsed environment
let cachedEnv: z.infer<typeof envSchema> | null = null

export function getEnv(): z.infer<typeof envSchema> {
  if (cachedEnv) {
    return cachedEnv
  }

  try {
    cachedEnv = envSchema.parse(process.env)
    return cachedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingKeys = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'))

      if (missingKeys.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missingKeys.join(', ')}\n` +
            'Please check your .env.local file and ensure all required variables are set.'
        )
      }

      const invalidKeys = error.errors
        .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
        .map(err => `${err.path.join('.')}: ${err.message}`)

      if (invalidKeys.length > 0) {
        throw new Error(
          `Invalid environment variables:\n${invalidKeys.join('\n')}\n` +
            'Please check your .env.local file and ensure all variables have valid values.'
        )
      }
    }

    throw error
  }
}

// Individual getters for convenience
export const getSupabaseUrl = () => getEnv().NEXT_PUBLIC_SUPABASE_URL
export const getSupabaseAnonKey = () => getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY
export const getSupabaseServiceRoleKey = () => getEnv().SUPABASE_SERVICE_ROLE_KEY
export const getAnthropicApiKey = () => getEnv().ANTHROPIC_API_KEY
export const getGroqApiKey = () => getEnv().GROQ_API_KEY
export const getTMDBApiKey = () => getEnv().TMDB_API_KEY

// Environment helpers
export const isDevelopment = () => getEnv().NODE_ENV === 'development'
export const isProduction = () => getEnv().NODE_ENV === 'production'
export const isTest = () => getEnv().NODE_ENV === 'test'
