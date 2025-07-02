/**
 * Haptic feedback utilities for enhanced mobile touch experience
 * Uses the Vibration API where available
 */

import React from 'react'

// Check if device supports haptic feedback
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator
}

// Haptic feedback patterns (in milliseconds)
export const HapticPatterns = {
  // Light tap feedback
  light: [10],
  
  // Medium tap feedback  
  medium: [25],
  
  // Strong feedback for important actions
  heavy: [50],
  
  // Success pattern
  success: [10, 50, 10],
  
  // Error pattern
  error: [100, 50, 100],
  
  // Warning pattern
  warning: [50, 25, 50],
  
  // Selection feedback
  selection: [15],
  
  // Long press feedback
  longPress: [30, 20, 30],
  
  // Swipe feedback
  swipe: [20],
  
  // Pull to refresh
  pullToRefresh: [10, 10, 10]
} as const

type HapticType = keyof typeof HapticPatterns

/**
 * Trigger haptic feedback with the specified pattern
 */
export const triggerHaptic = (type: HapticType): void => {
  if (!isHapticSupported()) {
    return
  }

  try {
    const pattern = HapticPatterns[type]
    navigator.vibrate(pattern)
  } catch (error) {
    // Silently fail if vibration is not supported or permission denied
    console.debug('Haptic feedback not available:', error)
  }
}

/**
 * Trigger custom haptic feedback with specific duration
 */
export const triggerCustomHaptic = (duration: number | number[]): void => {
  if (!isHapticSupported()) {
    return
  }

  try {
    navigator.vibrate(duration)
  } catch (error) {
    console.debug('Custom haptic feedback failed:', error)
  }
}

/**
 * React hook for haptic feedback
 */
export const useHapticFeedback = () => {
  const haptic = (type: HapticType) => {
    triggerHaptic(type)
  }

  const customHaptic = (duration: number | number[]) => {
    triggerCustomHaptic(duration)
  }

  return {
    haptic,
    customHaptic,
    isSupported: isHapticSupported()
  }
}

/**
 * Enhanced button component with haptic feedback
 */
export const withHapticFeedback = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  hapticType: HapticType = 'light'
) => {
  const ComponentWithHaptic = React.forwardRef<any, T>((props, ref) => {
    const handleClick = (event: React.MouseEvent) => {
      triggerHaptic(hapticType)
      
      if (props.onClick) {
        props.onClick(event)
      }
    }

    return (
      <Component
        {...props}
        ref={ref}
        onClick={handleClick}
      />
    )
  })

  ComponentWithHaptic.displayName = `withHapticFeedback(${Component.displayName || Component.name})`
  return ComponentWithHaptic
}

/**
 * Add haptic feedback to touch events
 */
export const addHapticToTouchEvents = (
  element: HTMLElement,
  hapticType: HapticType = 'light'
): (() => void) => {
  const handleTouchStart = () => {
    triggerHaptic(hapticType)
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: true })

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart)
  }
}

