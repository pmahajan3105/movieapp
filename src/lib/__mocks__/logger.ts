type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function createMockLogger() {
  const logFn = (level: LogLevel) => (message?: unknown) => {
    const method = level === 'debug' ? 'debug' : level
    ;(console as any)[method](message)
  }

  return {
    debug: logFn('debug'),
    info: logFn('info'),
    warn: logFn('warn'),
    error: logFn('error'),
    apiError: logFn('error'),
    authError: logFn('error'),
    dbError: logFn('error'),
  }
}

export const logger = createMockLogger()
export default logger
