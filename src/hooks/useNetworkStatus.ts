'use client'

import { useState, useEffect } from 'react'

interface NetworkStatus {
  isOnline: boolean
  connectionType: string
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown'
  downlink: number
  rtt: number
  saveData: boolean
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  })

  useEffect(() => {
    // Initialize online status
    setNetworkStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine
    }))

    const updateNetworkStatus = () => {
      const status: NetworkStatus = {
        isOnline: navigator.onLine,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
      }

      // Get connection info if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          status.connectionType = connection.type || 'unknown'
          status.effectiveType = connection.effectiveType || 'unknown'
          status.downlink = connection.downlink || 0
          status.rtt = connection.rtt || 0
          status.saveData = connection.saveData || false
        }
      }

      setNetworkStatus(status)
    }

    const handleOnline = () => {
      updateNetworkStatus()
    }

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false
      }))
    }

    // Event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', updateNetworkStatus)
      }
    }

    // Initial update
    updateNetworkStatus()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          connection.removeEventListener('change', updateNetworkStatus)
        }
      }
    }
  }, [])

  return {
    ...networkStatus,
    isSlowConnection: networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g',
    isFastConnection: networkStatus.effectiveType === '4g',
    shouldOptimizeForData: networkStatus.saveData || networkStatus.effectiveType === '2g'
  }
}