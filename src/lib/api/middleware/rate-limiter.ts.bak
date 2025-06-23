import { NextRequest } from 'next/server'

// Request throttling to prevent abuse
const requestCounts = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: NextRequest) => string
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  keyGenerator: request => request.headers.get('x-forwarded-for') || 'unknown',
}

export function checkRateLimit(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {}
): boolean {
  const finalConfig = { ...defaultConfig, ...config }
  const clientId = finalConfig.keyGenerator!(request)
  const now = Date.now()
  const clientData = requestCounts.get(clientId)

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + finalConfig.windowMs })
    return true
  }

  if (clientData.count >= finalConfig.maxRequests) {
    return false
  }

  clientData.count++
  return true
}

export function withRateLimit(config?: Partial<RateLimitConfig>) {
  return (handler: (request: NextRequest) => Promise<any>) => {
    return async (request: NextRequest) => {
      if (!checkRateLimit(request, config)) {
        throw new Error('Too many requests. Please wait before trying again.')
      }
      return handler(request)
    }
  }
}
