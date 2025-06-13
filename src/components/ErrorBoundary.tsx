'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
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
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ ErrorBoundary caught an error:', error)
      console.error('Error Info:', errorInfo)
    }

    // In production, you could send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo)
      console.error('Production error caught by ErrorBoundary:', error.message)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
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
