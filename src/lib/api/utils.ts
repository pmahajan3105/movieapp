import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { logger } from '@/lib/logger'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export async function withAuth<T>(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('Authentication failed', { error: authError })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return handler(user.id, request)
  } catch (error) {
    logger.error('API error:', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const result = await handler()
    return NextResponse.json({ data: result })
  } catch (error) {
    logger.error('API handler error:', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export function createApiResponse<T>(
  data?: T,
  error?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  if (error) {
    return NextResponse.json({ error }, { status })
  }
  return NextResponse.json({ data }, { status })
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json()
  } catch {
    throw new Error('Invalid JSON body')
  }
}

export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => !data[field])
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }
}
