'use client'

import React, { useState, useRef, useCallback, ReactNode } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'

interface SwipeAction {
  icon: ReactNode
  label: string
  color: string
  action: () => void
}

interface SwipeableCardProps {
  children: ReactNode
  leftAction?: SwipeAction
  rightAction?: SwipeAction
  swipeThreshold?: number
  disabled?: boolean
  className?: string
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftAction,
  rightAction,
  swipeThreshold = 100,
  disabled = false,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [currentAction, setCurrentAction] = useState<'left' | 'right' | null>(null)
  const x = useMotionValue(0)
  const dragConstraints = useRef(null)

  // Transform values for smooth animations
  const leftActionOpacity = useTransform(x, [0, swipeThreshold], [0, 1])
  const rightActionOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0])
  const cardRotation = useTransform(x, [-100, 100], [-5, 5])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    const currentX = info.offset.x
    
    if (currentX > swipeThreshold && leftAction) {
      setCurrentAction('left')
    } else if (currentX < -swipeThreshold && rightAction) {
      setCurrentAction('right')
    } else {
      setCurrentAction(null)
    }
  }, [swipeThreshold, leftAction, rightAction])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    setIsDragging(false)
    const currentX = info.offset.x
    
    if (currentX > swipeThreshold && leftAction) {
      leftAction.action()
    } else if (currentX < -swipeThreshold && rightAction) {
      rightAction.action()
    }
    
    setCurrentAction(null)
    x.set(0) // Reset position
  }, [swipeThreshold, leftAction, rightAction, x])

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={`relative ${className}`} ref={dragConstraints}>
      {/* Left action background */}
      {leftAction && (
        <motion.div
          className={`absolute inset-0 flex items-center justify-start pl-6 rounded-lg ${leftAction.color}`}
          style={{ opacity: leftActionOpacity }}
        >
          <div className="flex items-center gap-2 text-white">
            {leftAction.icon}
            <span className="font-medium text-sm">{leftAction.label}</span>
          </div>
        </motion.div>
      )}

      {/* Right action background */}
      {rightAction && (
        <motion.div
          className={`absolute inset-0 flex items-center justify-end pr-6 rounded-lg ${rightAction.color}`}
          style={{ opacity: rightActionOpacity }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="font-medium text-sm">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </motion.div>
      )}

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        style={{ 
          x,
          rotate: cardRotation,
          scale: isDragging ? 1.02 : 1
        }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={`relative z-10 transition-shadow duration-200 ${
          isDragging ? 'shadow-lg' : ''
        } ${currentAction ? 'cursor-grabbing' : 'cursor-grab'}`}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>

      {/* Swipe hints (show on first interaction) */}
      {(leftAction || rightAction) && !isDragging && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full opacity-60">
            {leftAction && <span>←</span>}
            <span>Swipe</span>
            {rightAction && <span>→</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// Predefined swipe actions for common use cases
export const SwipeActions = {
  addToWatchlist: (onAction: () => void) => ({
    icon: <span>📌</span>,
    label: 'Add to Watchlist',
    color: 'bg-green-500',
    action: onAction
  }),
  
  removeFromWatchlist: (onAction: () => void) => ({
    icon: <span>🗑️</span>,
    label: 'Remove',
    color: 'bg-red-500',
    action: onAction
  }),
  
  like: (onAction: () => void) => ({
    icon: <span>👍</span>,
    label: 'Like',
    color: 'bg-blue-500',
    action: onAction
  }),
  
  dislike: (onAction: () => void) => ({
    icon: <span>👎</span>,
    label: 'Not Interested',
    color: 'bg-gray-500',
    action: onAction
  })
}