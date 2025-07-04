export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_usage_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          estimated_cost: number | null
          id: string
          metadata: Json | null
          movie_id: string | null
          operation: string
          requests_count: number | null
          service: string
          success: boolean | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          movie_id?: string | null
          operation: string
          requests_count?: number | null
          service: string
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          movie_id?: string | null
          operation?: string
          requests_count?: number | null
          service?: string
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      conversation_exchanges: {
        Row: {
          ai_audio_duration: number | null
          ai_audio_url: string | null
          ai_response: string
          created_at: string | null
          exchange_number: number
          exchange_timestamp: string | null
          id: string
          processing_time_ms: number | null
          session_id: string
          transcript_confidence: number | null
          user_audio_duration: number | null
          user_audio_url: string | null
          user_id: string
          user_transcript: string
        }
        Insert: {
          ai_audio_duration?: number | null
          ai_audio_url?: string | null
          ai_response: string
          created_at?: string | null
          exchange_number: number
          exchange_timestamp?: string | null
          id?: string
          processing_time_ms?: number | null
          session_id: string
          transcript_confidence?: number | null
          user_audio_duration?: number | null
          user_audio_url?: string | null
          user_id: string
          user_transcript: string
        }
        Update: {
          ai_audio_duration?: number | null
          ai_audio_url?: string | null
          ai_response?: string
          created_at?: string | null
          exchange_number?: number
          exchange_timestamp?: string | null
          id?: string
          processing_time_ms?: number | null
          session_id?: string
          transcript_confidence?: number | null
          user_audio_duration?: number | null
          user_audio_url?: string | null
          user_id?: string
          user_transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_exchanges_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          context_data: Json | null
          context_type: string
          created_at: string | null
          ended_at: string | null
          id: string
          movie_id: string | null
          session_insights: Json | null
          session_type: string
          started_at: string | null
          total_exchanges: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          context_type: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          movie_id?: string | null
          session_insights?: Json | null
          session_type: string
          started_at?: string | null
          total_exchanges?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_data?: Json | null
          context_type?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          movie_id?: string | null
          session_insights?: Json | null
          session_type?: string
          started_at?: string | null
          total_exchanges?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversational_memory: {
        Row: {
          confidence_score: number
          created_at: string | null
          exchange_id: string | null
          extraction_context: Json | null
          id: string
          last_mentioned_at: string | null
          last_reinforced_at: string | null
          memory_category: string
          memory_key: string | null
          memory_strength: number | null
          memory_text: string | null
          memory_type: string
          mention_count: number | null
          preference_strength: number | null
          preference_text: string
          session_id: string | null
          source_conversation_id: string | null
          source_exchange_id: string | null
          structured_data: Json
          supporting_evidence: string[] | null
          times_reinforced: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          exchange_id?: string | null
          extraction_context?: Json | null
          id?: string
          last_mentioned_at?: string | null
          last_reinforced_at?: string | null
          memory_category: string
          memory_key?: string | null
          memory_strength?: number | null
          memory_text?: string | null
          memory_type: string
          mention_count?: number | null
          preference_strength?: number | null
          preference_text: string
          session_id?: string | null
          source_conversation_id?: string | null
          source_exchange_id?: string | null
          structured_data: Json
          supporting_evidence?: string[] | null
          times_reinforced?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          exchange_id?: string | null
          extraction_context?: Json | null
          id?: string
          last_mentioned_at?: string | null
          last_reinforced_at?: string | null
          memory_category?: string
          memory_key?: string | null
          memory_strength?: number | null
          memory_text?: string | null
          memory_type?: string
          mention_count?: number | null
          preference_strength?: number | null
          preference_text?: string
          session_id?: string | null
          source_conversation_id?: string | null
          source_exchange_id?: string | null
          structured_data?: Json
          supporting_evidence?: string[] | null
          times_reinforced?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversational_memory_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "conversation_exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversational_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          review_sentiment: Json | null
          runtime: number | null
          social_buzz_score: number | null
          storyline_embedding: string | null
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
          review_sentiment?: Json | null
          runtime?: number | null
          social_buzz_score?: number | null
          storyline_embedding?: string | null
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
          review_sentiment?: Json | null
          runtime?: number | null
          social_buzz_score?: number | null
          storyline_embedding?: string | null
          title?: string
          tmdb_id?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      preference_insights: {
        Row: {
          confidence_level: number
          created_at: string | null
          expires_at: string | null
          id: string
          insight_category: string
          insight_summary: string
          insight_type: string
          last_updated: string | null
          structured_insights: Json
          supporting_memories: string[] | null
          time_window: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_level: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_category: string
          insight_summary: string
          insight_type: string
          last_updated?: string | null
          structured_insights: Json
          supporting_memories?: string[] | null
          time_window: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_level?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_category?: string
          insight_summary?: string
          insight_type?: string
          last_updated?: string | null
          structured_insights?: Json
          supporting_memories?: string[] | null
          time_window?: string
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: "ratings_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_minimal"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_explanations: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          discovery_level: string | null
          expires_at: string | null
          explanation_type: string | null
          id: string
          movie_id: string
          optimal_viewing_time: string | null
          primary_reason: string
          supporting_data: Json | null
          supporting_movies: string[] | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          discovery_level?: string | null
          expires_at?: string | null
          explanation_type?: string | null
          id?: string
          movie_id: string
          optimal_viewing_time?: string | null
          primary_reason: string
          supporting_data?: Json | null
          supporting_movies?: string[] | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          discovery_level?: string | null
          expires_at?: string | null
          explanation_type?: string | null
          id?: string
          movie_id?: string
          optimal_viewing_time?: string | null
          primary_reason?: string
          supporting_data?: Json | null
          supporting_movies?: string[] | null
          user_id?: string
        }
        Relationships: []
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
      recommendation_refresh_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          max_attempts: number | null
          metadata: Json | null
          movie_id: string | null
          priority: number | null
          queued_at: string | null
          status: string | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          movie_id?: string | null
          priority?: number | null
          queued_at?: string | null
          status?: string | null
          trigger_type: string
          user_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          movie_id?: string | null
          priority?: number | null
          queued_at?: string | null
          status?: string | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          ai_insights: Json | null
          analysis_source: string | null
          confidence: number | null
          created_at: string | null
          discovery_source: string | null
          enhanced_at: string | null
          generated_at: string | null
          id: string
          movie_id: string
          reason: string | null
          score: number
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          analysis_source?: string | null
          confidence?: number | null
          created_at?: string | null
          discovery_source?: string | null
          enhanced_at?: string | null
          generated_at?: string | null
          id?: string
          movie_id: string
          reason?: string | null
          score: number
          user_id: string
        }
        Update: {
          ai_insights?: Json | null
          analysis_source?: string | null
          confidence?: number | null
          created_at?: string | null
          discovery_source?: string | null
          enhanced_at?: string | null
          generated_at?: string | null
          id?: string
          movie_id?: string
          reason?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_minimal"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          id: string
          interaction_context: Json | null
          interaction_type: string
          metadata: Json | null
          movie_id: string
          time_of_day: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          interaction_context?: Json | null
          interaction_type: string
          metadata?: Json | null
          movie_id: string
          time_of_day?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          interaction_context?: Json | null
          interaction_type?: string
          metadata?: Json | null
          movie_id?: string
          time_of_day?: number | null
          user_id?: string
        }
        Relationships: []
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
      user_preference_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          data_points: number | null
          expires_at: string | null
          id: string
          insight_type: string
          insights: Json
          time_window: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          data_points?: number | null
          expires_at?: string | null
          id?: string
          insight_type: string
          insights: Json
          time_window: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          data_points?: number | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          insights?: Json
          time_window?: string
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
      user_viewing_sessions: {
        Row: {
          completion_percentage: number | null
          context_tags: string[] | null
          created_at: string | null
          day_of_week: number | null
          device_type: string | null
          id: string
          interaction_type: string | null
          movie_id: string
          session_end: string | null
          session_start: string | null
          time_of_day: number | null
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          context_tags?: string[] | null
          created_at?: string | null
          day_of_week?: number | null
          device_type?: string | null
          id?: string
          interaction_type?: string | null
          movie_id: string
          session_end?: string | null
          session_start?: string | null
          time_of_day?: number | null
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          context_tags?: string[] | null
          created_at?: string | null
          day_of_week?: number | null
          device_type?: string | null
          id?: string
          interaction_type?: string | null
          movie_id?: string
          session_end?: string | null
          session_start?: string | null
          time_of_day?: number | null
          user_id?: string
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
            foreignKeyName: "watchlist_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_minimal"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      monthly_api_costs: {
        Row: {
          failed_operations: number | null
          month: string | null
          operations_count: number | null
          service: string | null
          total_cost: number | null
          total_requests: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
      movies_minimal: {
        Row: {
          id: string | null
          storyline_embedding: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_expired_explanations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_insights: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      get_user_sentiment_bias: {
        Args: { p_user_id: string }
        Returns: number
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      log_api_usage: {
        Args: {
          p_service: string
          p_operation: string
          p_tokens_used?: number
          p_requests_count?: number
          p_user_id?: string
          p_movie_id?: string
          p_success?: boolean
          p_error_message?: string
          p_metadata?: Json
        }
        Returns: string
      }
      queue_recommendation_refresh: {
        Args: {
          p_user_id: string
          p_trigger_type: string
          p_movie_id?: string
          p_priority?: number
        }
        Returns: string
      }
      refresh_user_preference_insights: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_watchlist_rating: {
        Args: { watchlist_id: string; user_id: string; new_rating: number }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
