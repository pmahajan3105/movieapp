import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { ConfigService } from '@/lib/config/config-service'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { APIErrorHandler } from '@/lib/error-handling'

const profileUpdateSchema = z.object({
  name: z.string().optional(),
  full_name: z.string().optional(),
  fullName: z.string().optional(),
  preferences: z.record(z.unknown()).optional(),
})

/**
 * GET /api/user/profile
 * Get user profile information
 */
export async function GET(): Promise<NextResponse> {
  try {
    const profile = LocalStorageService.getUserProfile()
    const config = ConfigService.getConfig()
    const stats = LocalStorageService.getStats()

    logger.info('Profile fetched', {
      hasProfile: !!profile,
      setupCompleted: config.setup_completed,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: 'local-user',
        name: profile?.name || config.user.name,
      },
      profile: {
        id: 'local-user',
        name: profile?.name || config.user.name,
        preferences: profile?.preferences || {},
        created_at: new Date().toISOString(),
      },
      hasProfile: !!profile,
      setupCompleted: config.setup_completed,
      stats,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/user/profile',
      method: 'GET',
    })
  }
}

/**
 * PUT /api/user/profile
 * Update user profile information (full replacement)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = profileUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid profile data' },
        { status: 400 }
      )
    }

    const { name, full_name, fullName, preferences } = parsed.data
    const finalName = name || full_name || fullName

    // Update profile in database
    const profile = LocalStorageService.updateUserProfile({
      name: finalName,
      preferences,
    })

    // Also update config if name changed
    if (finalName) {
      ConfigService.updateUserName(finalName)
    }

    logger.info('Profile updated successfully', { name: finalName })

    return NextResponse.json({
      success: true,
      profile,
      message: 'Profile updated successfully',
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/user/profile',
      method: 'PUT',
    })
  }
}

/**
 * PATCH /api/user/profile
 * Partially update user profile information
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = profileUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid profile data' },
        { status: 400 }
      )
    }

    const { name, full_name, fullName, preferences } = parsed.data
    const finalName = name || full_name || fullName

    logger.info('PATCH request to update profile', { name: finalName, preferences })

    // Update profile in database
    const updateData: { name?: string; preferences?: Record<string, unknown> } = {}

    if (finalName !== undefined) {
      updateData.name = finalName
    }

    if (preferences !== undefined) {
      updateData.preferences = preferences
    }

    const profile = LocalStorageService.updateUserProfile(updateData)

    // Also update config if name changed
    if (finalName) {
      ConfigService.updateUserName(finalName)
    }

    logger.info('Profile updated successfully via PATCH', { updates: updateData })

    return NextResponse.json({
      success: true,
      profile,
      message: 'Profile updated successfully',
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/user/profile',
      method: 'PATCH',
    })
  }
}

/**
 * POST /api/user/profile
 * Create or initialize user profile
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}))
    const { name, full_name, fullName } = body
    const finalName = name || full_name || fullName || 'User'

    logger.info('Creating/initializing profile', { name: finalName })

    // Create user profile in database
    LocalStorageService.createUserProfile(finalName)

    // Update config
    ConfigService.updateConfig({
      setup_completed: true,
      user: { name: finalName },
    })

    const profile = LocalStorageService.getUserProfile()

    logger.info('Successfully created/initialized profile', { profile })

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/user/profile',
      method: 'POST',
    })
  }
}
