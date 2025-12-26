import { NextResponse } from 'next/server'
import { ConfigService } from '@/lib/config/config-service'

/**
 * GET /api/auth/status
 * Returns auth status - in local mode, returns setup status
 */
export async function GET() {
  try {
    const setupCompleted = ConfigService.isSetupCompleted()
    const config = ConfigService.getConfig()

    return NextResponse.json({
      authenticated: setupCompleted,
      mode: 'local',
      hasUser: setupCompleted,
      userId: setupCompleted ? 'local-user' : null,
      userEmail: setupCompleted ? 'local@cineai.app' : null,
      user: setupCompleted ? {
        id: 'local-user',
        name: config.user.name,
        email: 'local@cineai.app',
      } : null,
      hasSession: setupCompleted,
      message: 'CineAI is running in local mode. No authentication required.',
    })
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      mode: 'local',
      hasUser: false,
      error: 'Failed to check status',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
