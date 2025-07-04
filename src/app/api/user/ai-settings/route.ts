/**
 * API Route: User AI Settings
 * Handles GET and PUT operations for user AI preferences and settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, withError, ok, fail } from '@/lib/api/factory'
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
export const GET = withError(
  requireAuth(async ({ supabase, user }) => {
    try {
      logger.info('Loading AI settings for user', { userId: user.id })

      // Try to get existing settings from user_profiles.preferences
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') { // Not found is ok
        logger.error('Failed to load user AI settings', { 
          error: profileError, 
          userId: user.id 
        })
        return fail('Failed to load AI settings', 500)
      }

      // Extract AI settings from preferences.ai_settings
      const aiSettings = profile?.preferences?.ai_settings
      const settings = aiSettings 
        ? { ...DEFAULT_AI_SETTINGS, ...aiSettings }
        : DEFAULT_AI_SETTINGS

      logger.info('AI settings loaded successfully', { 
        userId: user.id,
        hasCustomSettings: !!aiSettings 
      })

      return ok({
        settings,
        isDefault: !aiSettings
      })

    } catch (error) {
      logger.error('Error in AI settings GET', { error })
      return fail('Internal server error', 500)
    }
  })
)

/**
 * PUT: Update user's AI settings
 */
export const PUT = withError(
  requireAuth(async ({ request, supabase, user }) => {
    try {
      // Parse and validate request body
      const body = await request.json()
      const validation = UpdateAISettingsSchema.safeParse(body)

      if (!validation.success) {
        logger.warn('Invalid AI settings data', { 
          userId: user.id,
          errors: validation.error.errors 
        })
        return fail('Invalid settings data', 400)
      }

      const { settings } = validation.data

      logger.info('Updating AI settings for user', { 
        userId: user.id,
        settingsKeys: Object.keys(settings)
      })

      // First get existing preferences to merge with
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      // Merge AI settings with existing preferences
      const updatedPreferences = {
        ...existingProfile?.preferences,
        ai_settings: settings
      }

      // Update AI settings in user_profiles.preferences
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (updateError) {
        logger.error('Failed to save AI settings', { 
          error: updateError, 
          userId: user.id 
        })
        return fail('Failed to save AI settings', 500)
      }

      // Log the update for analytics (skip for now since user_interactions requires movie_id)
      // TODO: Create a separate analytics table for non-movie interactions
      logger.info('AI settings analytics would be logged here', { 
        userId: user.id,
        settingsChanged: Object.keys(settings)
      })

      logger.info('AI settings updated successfully', { userId: user.id })

      return ok({
        message: 'AI settings updated successfully',
        settings
      })

    } catch (error) {
      logger.error('Error in AI settings PUT', { error })
      return fail('Internal server error', 500)
    }
  })
)

/**
 * DELETE: Reset user's AI settings to defaults
 */
export const DELETE = withError(
  requireAuth(async ({ supabase, user }) => {
    try {
      logger.info('Resetting AI settings to defaults', { userId: user.id })

      // Get existing preferences to preserve non-AI settings
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      // Remove only AI settings, keep other preferences
      const updatedPreferences = {
        ...existingProfile?.preferences
      }
      delete updatedPreferences.ai_settings

      // Reset to defaults by removing AI settings from preferences
      const { error: resetError } = await supabase
        .from('user_profiles')
        .update({
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (resetError) {
        logger.error('Failed to reset AI settings', { 
          error: resetError, 
          userId: user.id 
        })
        return fail('Failed to reset AI settings', 500)
      }

      // Log the reset (skip for now since user_interactions requires movie_id)
      // TODO: Create a separate analytics table for non-movie interactions
      logger.info('AI settings reset analytics would be logged here', { 
        userId: user.id
      })

      logger.info('AI settings reset successfully', { userId: user.id })

      return ok({
        message: 'AI settings reset to defaults',
        settings: DEFAULT_AI_SETTINGS
      })

    } catch (error) {
      logger.error('Error in AI settings DELETE', { error })
      return fail('Internal server error', 500)
    }
  })
)