'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw, Home, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  reportError?: (error: Error, context?: string) => string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log detailed error information to console for debugging
    console.error('🚨 ErrorBoundary caught error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      currentURL: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString()
    })

    // Report to error recovery system if available
    let errorId: string | undefined
    if (this.props.reportError) {
      errorId = this.props.reportError(error, 'React Error Boundary')
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId
    })

    // Log error using proper logger
    logger.error('ErrorBoundary caught an error', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      currentURL: typeof window !== 'undefined' ? window.location.href : 'unknown',
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
  }

  handleSafeMode = () => {
    // Enable safe mode and redirect
    localStorage.setItem('safe-mode', 'true')
    window.location.href = '/dashboard?mode=safe'
  }

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="bg-base-100 flex min-h-screen items-center justify-center p-4">
          <div className="card bg-base-100 border-error/20 w-full max-w-md border shadow-xl">
            <div className="card-body text-center">
              <div className="mb-4 flex justify-center">
                <div className="bg-error/10 flex h-16 w-16 items-center justify-center rounded-full">
                  <AlertTriangle className="text-error h-8 w-8" />
                </div>
              </div>

              <h2 className="card-title text-error mb-2 justify-center">
                Oops! Something went wrong
              </h2>

              <p className="text-base-content/70 mb-6">
                We encountered an unexpected error. This has been logged and we&apos;ll look into
                it.
              </p>

              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-base-200 mb-4 rounded-lg p-4 text-left">
                  <h3 className="mb-2 text-sm font-semibold">Error Details (Development):</h3>
                  <p className="text-error font-mono text-xs break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs">Stack Trace</summary>
                      <pre className="mt-2 overflow-x-auto text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="card-actions justify-center gap-2">
                <Button onClick={this.handleReset} className="btn btn-primary">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button onClick={this.handleSafeMode} className="btn btn-warning">
                  <Wrench className="mr-2 h-4 w-4" />
                  Safe Mode
                </Button>

                <Button
                  onClick={() => (window.location.href = '/dashboard')}
                  className="btn btn-outline"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
