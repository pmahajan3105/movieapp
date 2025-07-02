'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' && 
      'serviceWorker' in navigator && 
      process.env.NODE_ENV === 'production'
    ) {
      registerServiceWorker()
    }
  }, [])

  return null // This component doesn't render anything
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    logger.info('Service Worker registered successfully', {
      scope: registration.scope,
      updatefound: !!registration.waiting
    })

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            logger.info('New service worker available')
            
            // Notify user about update
            if (confirm('A new version of CineAI is available. Reload to update?')) {
              window.location.reload()
            }
          }
        })
      }
    })

  } catch (error) {
    logger.error('Service Worker registration failed', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

// Utility function to check if app is served from cache
export function useOfflineStatus() {
  useEffect(() => {
    const checkCacheStatus = () => {
      // Listen for responses from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_STATUS') {
          const isOffline = event.data.offline
          
          // Update UI to reflect offline status
          if (isOffline) {
            document.body.classList.add('offline-mode')
          } else {
            document.body.classList.remove('offline-mode')
          }
        }
      })
    }

    if ('serviceWorker' in navigator) {
      checkCacheStatus()
    }
  }, [])
}