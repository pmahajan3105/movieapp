import { z } from 'zod'

// Environment validation schema
const envSchema = z.object({
  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Valid Supabase URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Site URL for proper auth redirects
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // External APIs
  TMDB_API_KEY: z.string().min(1, 'TMDB API key is required'),

  // AI APIs - Primary: Anthropic Claude
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AI Model Configuration (optional)
  AI_DEFAULT_MODEL: z.string().default('claude-3-7-sonnet-20250219'),
  AI_CHAT_MODEL: z.string().default('claude-3-7-sonnet-20250219'),
  AI_FAST_MODEL: z.string().default('claude-3-5-haiku-20241022'),

  // Development
  DEVELOPMENT_LOGGING: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
})

// Type for validated environment variables
export type Environment = z.infer<typeof envSchema>

// Global environment validation result
let validatedEnv: Environment | null = null

/**
 * Get validated environment variables
 * Validates once and caches the result
 */
export function getEnv(): Environment {
  if (validatedEnv) {
    return validatedEnv
  }

  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n')
      throw new Error(`Environment validation failed:\n${missingVars}`)
    }
    throw error
  }
}

// Convenience getters for common environment variables
export const isDevelopment = () => getEnv().NODE_ENV === 'development'
export const isProduction = () => getEnv().NODE_ENV === 'production'
export const isTest = () => getEnv().NODE_ENV === 'test'

export const getSupabaseUrl = () => getEnv().NEXT_PUBLIC_SUPABASE_URL
export const getSupabaseAnonKey = () => getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY
export const getSupabaseServiceRoleKey = () => getEnv().SUPABASE_SERVICE_ROLE_KEY

export const getTmdbApiKey = () => getEnv().TMDB_API_KEY
export const getAnthropicApiKey = () => getEnv().ANTHROPIC_API_KEY

export const getSiteUrl = () => getEnv().NEXT_PUBLIC_SITE_URL

// AI Model getters
export const getAIDefaultModel = () => getEnv().AI_DEFAULT_MODEL
export const getAIChatModel = () => getEnv().AI_CHAT_MODEL
export const getAIFastModel = () => getEnv().AI_FAST_MODEL

// Environment check helpers (using function form to avoid conflicts)
export const isDev = () => getEnv().NODE_ENV === 'development'
export const isProd = () => getEnv().NODE_ENV === 'production'
