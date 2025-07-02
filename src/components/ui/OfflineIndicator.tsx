'use client'

import React, { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { WifiOff, Wifi, Signal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OfflineIndicatorProps {
  showOnlineStatus?: boolean
  position?: 'top' | 'bottom'
  className?: string
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showOnlineStatus = false,
  position = 'top',
  className = '',
}) => {
  const { isOnline, isSlowConnection, effectiveType, saveData } = useNetworkStatus()
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline && isOnline) {
      setShowReconnected(true)
      timer = setTimeout(() => {
        setShowReconnected(false)
        setWasOffline(false)
      }, 3000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  const getConnectionMessage = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        message: "You're offline. Some features may be limited.",
        severity: 'error' as const,
      }
    }

    if (showReconnected) {
      return {
        icon: <Wifi className="h-4 w-4" />,
        message: 'Connection restored!',
        severity: 'success' as const,
      }
    }

    if (isSlowConnection && showOnlineStatus) {
      return {
        icon: <Signal className="h-4 w-4" />,
        message: `Slow connection detected (${effectiveType}). Consider enabling data saver mode.`,
        severity: 'warning' as const,
      }
    }

    if (saveData && showOnlineStatus) {
      return {
        icon: <Signal className="h-4 w-4" />,
        message: 'Data saver mode active. Some features optimized for low data usage.',
        severity: 'info' as const,
      }
    }

    return null
  }

  const connectionInfo = getConnectionMessage()

  if (!connectionInfo) return null

  const severityStyles = {
    error: 'alert-error',
    warning: 'alert-warning',
    success: 'alert-success',
    info: 'alert-info',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
        className={`fixed right-4 left-4 z-50 ${position === 'top' ? 'top-4' : 'bottom-4'} ${className} `}
      >
        <div className={`alert ${severityStyles[connectionInfo.severity]} shadow-lg`}>
          <div className="flex items-center gap-2">
            {connectionInfo.icon}
            <span className="text-sm font-medium">{connectionInfo.message}</span>
          </div>

          {!isOnline && (
            <div className="flex gap-2">
              <button className="btn btn-sm btn-outline" onClick={() => window.location.reload()}>
                Retry
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setWasOffline(false)}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for offline behavior
export const useOfflineBehavior = () => {
  const { isOnline, isSlowConnection, saveData } = useNetworkStatus()

  const shouldOptimizeImages = !isOnline || isSlowConnection || saveData
  const shouldUseCache = !isOnline
  const shouldShowOfflineMessage = !isOnline

  const getOfflineCapabilities = () => ({
    canBrowseCachedMovies: true,
    canViewWatchlist: true,
    canUseAIFeatures: false,
    canSearchNew: false,
    canUpdateProfile: false,
  })

  return {
    isOnline,
    isSlowConnection,
    saveData,
    shouldOptimizeImages,
    shouldUseCache,
    shouldShowOfflineMessage,
    offlineCapabilities: getOfflineCapabilities(),
  }
}
