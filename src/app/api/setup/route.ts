import { NextRequest, NextResponse } from 'next/server'
import { ConfigService } from '@/lib/config/config-service'
import { LocalStorageService, databaseExists } from '@/lib/db'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const setupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tmdbKey: z.string().optional(),
  openaiKey: z.string().optional(),
  anthropicKey: z.string().optional(),
})

/**
 * GET /api/setup
 * Check setup status and return current configuration
 */
export async function GET(): Promise<NextResponse> {
  try {
    const configExists = ConfigService.configExists()
    const dbExists = databaseExists()
    const isSetupCompleted = ConfigService.isSetupCompleted()
    const isTasteOnboardingCompleted = ConfigService.isTasteOnboardingCompleted()

    // Get current config if it exists
    const config = configExists ? ConfigService.getConfig() : null
    const apiKeys = ConfigService.getApiKeys()

    logger.info('Setup status checked', {
      configExists,
      dbExists,
      isSetupCompleted,
      isTasteOnboardingCompleted,
    })

    return NextResponse.json({
      success: true,
      status: {
        configExists,
        databaseExists: dbExists,
        setupCompleted: isSetupCompleted,
        tasteOnboardingCompleted: isTasteOnboardingCompleted,
        needsSetup: !isSetupCompleted,
      },
      config: config ? {
        version: config.version,
        userName: config.user.name,
        preferences: config.preferences,
        hasApiKeys: {
          tmdb: !!apiKeys.tmdb,
          openai: !!apiKeys.openai,
          anthropic: !!apiKeys.anthropic,
        },
      } : null,
      dataDirectory: ConfigService.getDataDirectory(),
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/setup',
      method: 'GET',
    })
  }
}

/**
 * POST /api/setup
 * Complete initial setup with user configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = setupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 }
      )
    }

    const { name, tmdbKey, openaiKey, anthropicKey } = parsed.data

    logger.info('Starting setup process', { name })

    // Initialize configuration
    const config = ConfigService.initializeConfig({
      name,
      tmdbKey,
      openaiKey,
      anthropicKey,
    })

    // Create user profile in database
    LocalStorageService.createUserProfile(name)

    // Record setup interaction
    LocalStorageService.recordInteraction('setup_completed', undefined, {
      name,
      hasApiKeys: {
        tmdb: !!tmdbKey,
        openai: !!openaiKey,
        anthropic: !!anthropicKey,
      },
    })

    logger.info('Setup completed successfully', {
      name,
      dataDirectory: ConfigService.getDataDirectory(),
    })

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully',
      config: {
        version: config.version,
        userName: config.user.name,
        preferences: config.preferences,
        hasApiKeys: {
          tmdb: !!config.api_keys.tmdb,
          openai: !!config.api_keys.openai,
          anthropic: !!config.api_keys.anthropic,
        },
      },
      dataDirectory: ConfigService.getDataDirectory(),
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/setup',
      method: 'POST',
    })
  }
}

/**
 * PATCH /api/setup
 * Update existing configuration (API keys, preferences, etc.)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    logger.info('Updating configuration', { updates: Object.keys(body) })

    // Update API keys if provided
    if (body.tmdbKey !== undefined || body.openaiKey !== undefined || body.anthropicKey !== undefined) {
      ConfigService.updateApiKeys({
        tmdb: body.tmdbKey,
        openai: body.openaiKey,
        anthropic: body.anthropicKey,
      })
    }

    // Update user name if provided
    if (body.name) {
      ConfigService.updateUserName(body.name)
      LocalStorageService.updateUserProfile({ name: body.name })
    }

    // Update preferences if provided
    if (body.preferences) {
      ConfigService.updatePreferences(body.preferences)
    }

    const config = ConfigService.getConfig()
    const apiKeys = ConfigService.getApiKeys()

    logger.info('Configuration updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        version: config.version,
        userName: config.user.name,
        preferences: config.preferences,
        hasApiKeys: {
          tmdb: !!apiKeys.tmdb,
          openai: !!apiKeys.openai,
          anthropic: !!apiKeys.anthropic,
        },
      },
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/setup',
      method: 'PATCH',
    })
  }
}

/**
 * DELETE /api/setup
 * Reset setup (for testing/re-configuration)
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    logger.warn('Resetting configuration')

    // Reset config in memory (file remains)
    ConfigService.reset()

    // Mark setup as not completed
    ConfigService.updateConfig({ setup_completed: false })

    logger.info('Configuration reset successfully')

    return NextResponse.json({
      success: true,
      message: 'Configuration reset. Please run setup again.',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/setup',
      method: 'DELETE',
    })
  }
}
