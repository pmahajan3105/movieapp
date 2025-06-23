'use client'

import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Chat Error Boundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-error h-8 w-8" />
            <h2 className="text-base-content text-xl font-semibold">Chat Error</h2>
          </div>

          <div className="max-w-md text-center">
            <p className="text-base-content/70 mb-4">
              Something went wrong with the chat interface. This is usually a temporary issue.
            </p>

            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-base-content/50 cursor-pointer text-sm">
                  Technical details
                </summary>
                <pre className="text-base-content/40 mt-2 text-xs whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>

          <button
            onClick={this.handleReset}
            className="btn btn-primary btn-sm flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use
export function withChatErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onReset?: () => void
) {
  const WrappedComponent = (props: P) => (
    <ChatErrorBoundary fallback={fallback} onReset={onReset}>
      <Component {...props} />
    </ChatErrorBoundary>
  )

  WrappedComponent.displayName = `withChatErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
