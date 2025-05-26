import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'loading-sm',
    md: 'loading-md', 
    lg: 'loading-lg'
  }

  return (
    <span className={`loading loading-spinner ${sizeClasses[size]} text-primary ${className}`} />
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  className?: string
}

export function LoadingCard({ 
  title = "Loading...", 
  description = "Please wait while we fetch your data",
  className = ""
}: LoadingCardProps) {
  return (
    <div className={`card bg-base-200 shadow-lg ${className}`}>
      <div className="card-body items-center text-center">
        <LoadingSpinner size="lg" />
        <div className="card-title">{title}</div>
        <p className="text-base-content/70">{description}</p>
      </div>
    </div>
  )
}

interface LoadingRowProps {
  text?: string
  className?: string
}

export function LoadingRow({ text = "Loading more...", className = "" }: LoadingRowProps) {
  return (
    <div className={`flex items-center justify-center gap-3 py-8 ${className}`}>
      <LoadingSpinner />
      <span className="text-base-content/70">{text}</span>
    </div>
  )
}

interface LoadingGridProps {
  count?: number
  className?: string
}

export function LoadingGrid({ count = 8, className = "" }: LoadingGridProps) {
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card bg-base-200 shadow-lg animate-pulse">
          <figure className="aspect-[2/3] bg-base-300"></figure>
          <div className="card-body">
            <div className="h-4 bg-base-300 rounded mb-2"></div>
            <div className="h-3 bg-base-300 rounded w-3/4 mb-2"></div>
            <div className="flex gap-2">
              <div className="h-5 w-12 bg-base-300 rounded-full"></div>
              <div className="h-5 w-16 bg-base-300 rounded-full"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 