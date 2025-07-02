// Service Worker for CineAI Offline Support
const CACHE_NAME = 'cineai-v1'
const STATIC_CACHE = 'cineai-static-v1'
const DYNAMIC_CACHE = 'cineai-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/search',
  '/offline',
  '/manifest.json',
  // Add essential CSS and JS files
  // Note: Next.js generates dynamic file names, so we'll cache these on demand
]

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/movies',
  '/api/user/profile',
  '/api/user/interactions'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/offline'))
      }),
      caches.open(DYNAMIC_CACHE).then(() => {
        console.log('Service Worker: Dynamic cache ready')
      })
    ])
  )
  
  // Force activation
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Take control of all pages immediately
  return self.clients.claim()
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request))
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isPageRequest(request)) {
    event.respondWith(handlePageRequest(request))
  }
})

// Check if request is for a static asset
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)
}

// Check if request is for an API endpoint
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') && 
         CACHEABLE_APIs.some(api => url.pathname.startsWith(api))
}

// Check if request is for a page
function isPageRequest(request) {
  return request.destination === 'document'
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset', error)
    return new Response('Asset not available offline', { status: 404 })
  }
}

// Handle API requests with network-first, cache fallback
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error(`API request failed: ${networkResponse.status}`)
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error)
    
    // Try cache fallback
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Add offline indicator to response
      const response = cachedResponse.clone()
      response.headers.set('X-Served-By', 'service-worker')
      response.headers.set('X-Cache-Status', 'offline')
      return response
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'This feature requires an internet connection',
          code: 'OFFLINE_ERROR',
          offline: true
        },
        cached: false
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'service-worker',
          'X-Cache-Status': 'offline-error'
        }
      }
    )
  }
}

// Handle page requests with network-first, offline fallback
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache the page
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error(`Page request failed: ${networkResponse.status}`)
  } catch (error) {
    console.log('Service Worker: Page network failed, trying cache', error)
    
    // Try cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Try cached homepage as fallback
    const homeCache = await caches.match('/dashboard')
    if (homeCache) {
      return homeCache
    }
    
    // Return offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CineAI - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f3f4f6;
            }
            .container { 
              max-width: 400px; 
              margin: 0 auto; 
              background: white; 
              padding: 2rem; 
              border-radius: 8px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #374151; margin-bottom: 1rem; }
            p { color: #6b7280; margin-bottom: 1.5rem; }
            button { 
              background: #3b82f6; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 1rem;
            }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>CineAI needs an internet connection to work properly. Please check your connection and try again.</p>
            <button onclick="location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-Served-By': 'service-worker',
        'X-Cache-Status': 'offline-fallback'
      }
    })
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processOfflineActions())
  }
})

// Process actions that were queued while offline
async function processOfflineActions() {
  try {
    // Get offline actions from IndexedDB or localStorage
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        await processAction(action)
        await removeOfflineAction(action.id)
      } catch (error) {
        console.log('Service Worker: Failed to process offline action', error)
      }
    }
  } catch (error) {
    console.log('Service Worker: Failed to process offline actions', error)
  }
}

// Placeholder functions for offline action management
async function getOfflineActions() {
  // In a real implementation, you'd use IndexedDB
  return []
}

async function processAction(action) {
  // Process the queued action
  console.log('Processing offline action:', action)
}

async function removeOfflineAction(actionId) {
  // Remove processed action
  console.log('Removing processed action:', actionId)
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: data.data
      })
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})

console.log('Service Worker: Loaded successfully')