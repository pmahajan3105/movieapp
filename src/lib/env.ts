import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),

  // OMDB API
  OMDB_API_KEY: z.string().min(1, 'OMDB API key is required'),

  // Groq AI
  GROQ_API_KEY: z.string().min(1, 'Groq API key is required'),

  // App URLs
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url('Invalid site URL')
    .optional()
    .default('http://localhost:3000'),

  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentError'
  }
}

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env

  try {
    _env = envSchema.parse(process.env)
    return _env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n')
      throw new EnvironmentError(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env.local file.`
      )
    }
    throw error
  }
}

// Validate environment on module load in non-test environments
if (process.env.NODE_ENV !== 'test') {
  try {
    getEnv()
  } catch (error) {
    if (error instanceof EnvironmentError) {
      console.error('❌ Environment validation failed:')
      console.error(error.message)
      if (process.env.NODE_ENV !== 'development') {
        process.exit(1)
      }
    }
  }
}

// Helper functions for specific environment variables
export const isDevelopment = () => getEnv().NODE_ENV === 'development'
export const isProduction = () => getEnv().NODE_ENV === 'production'
export const isTest = () => getEnv().NODE_ENV === 'test'

export const getSupabaseUrl = () => getEnv().NEXT_PUBLIC_SUPABASE_URL
export const getSupabaseAnonKey = () => getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY
export const getOMDBApiKey = () => getEnv().OMDB_API_KEY
export const getGroqApiKey = () => getEnv().GROQ_API_KEY
export const getSiteUrl = () => getEnv().NEXT_PUBLIC_SITE_URL
