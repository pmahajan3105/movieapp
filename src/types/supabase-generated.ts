// Minimal stub for Supabase generated types used in tests & type imports.
// Replace with real generated definitions via `supabase gen types typescript --local` in production.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    >
  }
}

// Helper mapped types used throughout codebase
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
