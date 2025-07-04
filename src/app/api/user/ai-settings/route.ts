/**
 * API Route: User AI Settings
 * Handles GET and PUT operations for user AI preferences and settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { APIErrorHandler } from '@/lib/error-handling/api-error-handler'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// AI Settings validation schema
const AISettingsSchema = z.object({
  recommendation_style: z.enum(['conservative', 'balanced', 'adventurous']),
  discovery_preference: z.enum(['safe', 'mixed', 'exploratory']),
  genre_diversity: z.number().min(0).max(100),
  temporal_preference: z.enum(['recent', 'mixed', 'classic']),
  learning_enabled: z.boolean(),
  conversation_memory: z.boolean(),
  rating_weight: z.number().min(0).max(100),
  behavioral_analysis: z.boolean(),
  content_filtering: z.object({
    explicit_content: z.boolean(),
    violence_threshold: z.number().min(0).max(100),
    adult_themes: z.boolean(),
  }),
  explanation_detail: z.enum(['minimal', 'standard', 'detailed']),
  show_confidence_scores: z.boolean(),
  show_reasoning: z.boolean(),
  recommendation_speed: z.enum(['fast', 'balanced', 'thorough']),
  cache_preferences: z.boolean(),
  background_learning: z.boolean(),
})

const UpdateAISettingsSchema = z.object({
  settings: AISettingsSchema
})

// Default AI settings
const DEFAULT_AI_SETTINGS = {
  recommendation_style: 'balanced',
  discovery_preference: 'mixed',
  genre_diversity: 70,
  temporal_preference: 'mixed',
  learning_enabled: true,
  conversation_memory: true,
  rating_weight: 80,
  behavioral_analysis: true,
  content_filtering: {
    explicit_content: false,
    violence_threshold: 50,
    adult_themes: true
  },
  explanation_detail: 'standard',
  show_confidence_scores: true,
  show_reasoning: true,
  recommendation_speed: 'balanced',
  cache_preferences: true,
  background_learning: true
} as const

/**
 * GET: Retrieve user's AI settings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.warn('Unauthorized AI settings access attempt', { authError })
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    logger.info('Loading AI settings for user', { userId: user.id })

    // Try to get existing settings
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('ai_settings')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // Not found is ok
      logger.error('Failed to load user AI settings', { 
        error: profileError, 
        userId: user.id 
      })
      throw profileError
    }

    // Merge with defaults if settings exist, otherwise use defaults
    const settings = profile?.ai_settings 
      ? { ...DEFAULT_AI_SETTINGS, ...profile.ai_settings }
      : DEFAULT_AI_SETTINGS

    logger.info('AI settings loaded successfully', { 
      userId: user.id,
      hasCustomSettings: !!profile?.ai_settings 
    })

    return NextResponse.json({
      success: true,
      settings,
      isDefault: !profile?.ai_settings
    })

  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/user/ai-settings',
      method: 'GET'
    })
  }
}

/**
 * PUT: Update user's AI settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.warn('Unauthorized AI settings update attempt', { authError })
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateAISettingsSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('Invalid AI settings data', { 
        userId: user.id,
        errors: validation.error.errors 
      })
      return NextResponse.json(
        { 
          error: 'Invalid settings data', 
          code: 'VALIDATION_ERROR',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { settings } = validation.data

    logger.info('Updating AI settings for user', { 
      userId: user.id,
      settingsKeys: Object.keys(settings)
    })

    // Update or insert AI settings in user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        ai_settings: settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      logger.error('Failed to save AI settings', { 
        error: updateError, 
        userId: user.id 
      })
      throw updateError
    }

    // Log the update for analytics
    try {
      await supabase
        .from('user_interactions')
        .insert({
          user_id: user.id,
          interaction_type: 'ai_settings_update',
          metadata: {
            settings_changed: Object.keys(settings),
            timestamp: new Date().toISOString()
          }
        })
    } catch (err: unknown) {
      // Don't fail the main operation if analytics fails
      logger.warn('Failed to log AI settings analytics', { error: err })
    }

    logger.info('AI settings updated successfully', { userId: user.id })

    return NextResponse.json({
      success: true,
      message: 'AI settings updated successfully',
      settings
    })

  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/user/ai-settings',
      method: 'PUT'
    })
  }
}

/**
 * DELETE: Reset user's AI settings to defaults
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.warn('Unauthorized AI settings reset attempt', { authError })
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    logger.info('Resetting AI settings to defaults', { userId: user.id })

    // Reset to defaults by removing custom settings
    const { error: resetError } = await supabase
      .from('user_profiles')
      .update({
        ai_settings: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (resetError) {
      logger.error('Failed to reset AI settings', { 
        error: resetError, 
        userId: user.id 
      })
      throw resetError
    }

    // Log the reset
    try {
      await supabase
        .from('user_interactions')
        .insert({
          user_id: user.id,
          interaction_type: 'ai_settings_reset',
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
    } catch (err: unknown) {
      logger.warn('Failed to log AI settings reset analytics', { error: err })
    }

    logger.info('AI settings reset successfully', { userId: user.id })

    return NextResponse.json({
      success: true,
      message: 'AI settings reset to defaults',
      settings: DEFAULT_AI_SETTINGS
    })

  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/user/ai-settings',
      method: 'DELETE'
    })
  }
}