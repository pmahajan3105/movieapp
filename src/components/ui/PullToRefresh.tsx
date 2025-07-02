'use client'

import React, { useState, useRef, useCallback, ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: ReactNode
  pullThreshold?: number
  maxPullDistance?: number
  refreshThreshold?: number
  disabled?: boolean
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  pullThreshold = 80,
  maxPullDistance = 120,
  refreshThreshold = 60,
  disabled = false
}) => {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return
    
    const touch = e.touches[0]
    if (!touch) return
    
    startY.current = touch.clientY
    currentY.current = touch.clientY
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || !containerRef.current) return
    
    const touch = e.touches[0]
    if (!touch) return
    
    currentY.current = touch.clientY
    const deltaY = currentY.current - startY.current
    
    // Only pull when at top of page
    const isAtTop = containerRef.current.scrollTop === 0
    
    if (deltaY > 0 && isAtTop) {
      e.preventDefault()
      
      const distance = Math.min(deltaY * 0.5, maxPullDistance)
      setPullDistance(distance)
      setIsPulling(distance > 10)
    }
  }, [disabled, isRefreshing, maxPullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return
    
    if (pullDistance > refreshThreshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setIsPulling(false)
    setPullDistance(0)
  }, [disabled, isRefreshing, pullDistance, refreshThreshold, onRefresh])

  const pullProgress = Math.min(pullDistance / pullThreshold, 1)
  const shouldShowRefresh = isPulling || isRefreshing

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-auto touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance, maxPullDistance)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull indicator */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm z-10 transition-all duration-300 ${
          shouldShowRefresh ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: Math.max(pullDistance, isRefreshing ? 60 : 0),
          transform: `translateY(${-Math.max(pullDistance, isRefreshing ? 60 : 0)}px)`
        }}
      >
        <div className="flex items-center gap-2 text-primary">
          <RefreshCw 
            className={`h-5 w-5 transition-transform duration-300 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isPulling && !isRefreshing ? `rotate(${pullProgress * 180}deg)` : undefined
            }}
          />
          <span className="text-sm font-medium">
            {isRefreshing 
              ? 'Refreshing...' 
              : pullDistance > refreshThreshold 
                ? 'Release to refresh'
                : 'Pull to refresh'
            }
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-full">
        {children}
      </div>
    </div>
  )
}

// Hook for easier integration
export const usePullToRefresh = (onRefresh: () => Promise<void> | void) => {
  return useCallback((children: ReactNode) => (
    <PullToRefresh onRefresh={onRefresh}>
      {children}
    </PullToRefresh>
  ), [onRefresh])
}