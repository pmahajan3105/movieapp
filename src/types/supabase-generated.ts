export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          messages: Json | null
          preferences_extracted: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          preferences_extracted?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          preferences_extracted?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      movie_embeddings: {
        Row: {
          combined_embedding: string | null
          content_text: string | null
          created_at: string | null
          id: string
          metadata_embedding: string | null
          metadata_text: string | null
          movie_id: string
          plot_embedding: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          combined_embedding?: string | null
          content_text?: string | null
          created_at?: string | null
          id?: string
          metadata_embedding?: string | null
          metadata_text?: string | null
          movie_id: string
          plot_embedding?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          combined_embedding?: string | null
          content_text?: string | null
          created_at?: string | null
          id?: string
          metadata_embedding?: string | null
          metadata_text?: string | null
          movie_id?: string
          plot_embedding?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      movies: {
        Row: {
          created_at: string | null
          director: string[] | null
          genre: string[] | null
          id: string
          imdb_id: string | null
          metadata: Json | null
          omdb_id: string | null
          plot: string | null
          poster_url: string | null
          rating: number | null
          runtime: number | null
          title: string
          tmdb_id: number | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          director?: string[] | null
          genre?: string[] | null
          id?: string
          imdb_id?: string | null
          metadata?: Json | null
          omdb_id?: string | null
          plot?: string | null
          poster_url?: string | null
          rating?: number | null
          runtime?: number | null
          title: string
          tmdb_id?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          director?: string[] | null
          genre?: string[] | null
          id?: string
          imdb_id?: string | null
          metadata?: Json | null
          omdb_id?: string | null
          plot?: string | null
          poster_url?: string | null
          rating?: number | null
          runtime?: number | null
          title?: string
          tmdb_id?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          id: string
          interaction_type: string | null
          interested: boolean
          movie_id: string
          rated_at: string | null
          rating: number | null
          source: string | null
          user_id: string
        }
        Insert: {
          id?: string
          interaction_type?: string | null
          interested: boolean
          movie_id: string
          rated_at?: string | null
          rating?: number | null
          source?: string | null
          user_id: string
        }
        Update: {
          id?: string
          interaction_type?: string | null
          interested?: boolean
          movie_id?: string
          rated_at?: string | null
          rating?: number | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ratings_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
        ]
      }
      recommendation_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          processed_at: string | null
          query_params: Json
          request_type: string
          results: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          query_params?: Json
          request_type?: string
          results?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          query_params?: Json
          request_type?: string
          results?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string | null
          id: string
          movie_id: string
          reason: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          movie_id: string
          reason?: string | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          movie_id?: string
          reason?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recommendations_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
        ]
      }
      user_memories: {
        Row: {
          confidence: number | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          memory_type: string
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          memory_type: string
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          memory_type?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string | null
          id: string
          movie_id: string
          notes: string | null
          rating: number | null
          user_id: string
          watched: boolean | null
          watched_at: string | null
        }
        Insert: {
          added_at?: string | null
          id?: string
          movie_id: string
          notes?: string | null
          rating?: number | null
          user_id: string
          watched?: boolean | null
          watched_at?: string | null
        }
        Update: {
          added_at?: string | null
          id?: string
          movie_id?: string
          notes?: string | null
          rating?: number | null
          user_id?: string
          watched?: boolean | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'watchlist_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { '': string } | { '': unknown }
        Returns: unknown
      }
      cleanup_expired_recommendations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_missing_profiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_simple_recommendations: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          id: string
          title: string
          year: number
          genre: string[]
          director: string[]
          plot: string
          poster_url: string
          rating: number
          runtime: number
          recommendation_score: number
        }[]
      }
      halfvec_avg: {
        Args: { '': number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { '': unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { '': unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { '': unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { '': unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { '': unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { '': unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { '': unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { '': unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { '': unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { '': unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { '': unknown } | { '': unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { '': string } | { '': unknown } | { '': unknown }
        Returns: string
      }
      search_movies_semantic: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          movie_id: string
          title: string
          similarity: number
        }[]
      }
      search_user_memories: {
        Args: {
          user_id_param: string
          query_embedding: string
          memory_types?: string[]
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          memory_type: string
          content: string
          metadata: Json
          confidence: number
          similarity: number
          created_at: string
        }[]
      }
      sparsevec_out: {
        Args: { '': unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { '': unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { '': unknown[] }
        Returns: number
      }
      update_watchlist_rating: {
        Args: { watchlist_id: string; user_id: string; new_rating: number }
        Returns: boolean
      }
      vector_avg: {
        Args: { '': number[] }
        Returns: string
      }
      vector_dims: {
        Args: { '': string } | { '': unknown }
        Returns: number
      }
      vector_norm: {
        Args: { '': string }
        Returns: number
      }
      vector_out: {
        Args: { '': string }
        Returns: unknown
      }
      vector_send: {
        Args: { '': string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { '': unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
