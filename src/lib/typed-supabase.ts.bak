import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-generated'

// Typed Supabase client – use this when you don't need SSR cookie magic
// In server components / API routes that need cookies, continue to use
// createServerClient from src/lib/supabase/client.ts

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type SupabaseClient = typeof supabase
