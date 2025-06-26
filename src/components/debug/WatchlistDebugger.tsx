'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAsyncAction } from '@/hooks/useAsyncOperation'

export function WatchlistDebugger() {
  const { user } = useAuth()
  const [testMovieId, setTestMovieId] = useState('')
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const { isLoading, execute } = useAsyncAction()

  const testWatchlistAdd = async () => {
    if (!testMovieId.trim()) {
      alert('Please enter a movie ID')
      return
    }

    setDebugInfo(null)

    await execute(async () => {
      console.log('🔍 Testing watchlist add...', {
        movieId: testMovieId,
        user: user?.email,
        userId: user?.id,
      })

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: testMovieId }),
      })

      const data = await response.json()

      const result = {
        status: response.status,
        ok: response.ok,
        success: data.success,
        error: data.error,
        data: data.data,
        headers: Object.fromEntries(response.headers.entries()),
        requestInfo: {
          movieId: testMovieId,
          userId: user?.id,
          userEmail: user?.email,
          timestamp: new Date().toISOString(),
        },
      }

      console.log('🔍 Debug result:', result)
      setDebugInfo(result)
    })
  }

  const testWatchlistGet = async () => {
    setDebugInfo(null)

    await execute(async () => {
      console.log('🔍 Testing watchlist get...', {
        user: user?.email,
        userId: user?.id,
      })

      const response = await fetch('/api/watchlist')
      const data = await response.json()

      const result = {
        type: 'GET_WATCHLIST',
        status: response.status,
        ok: response.ok,
        success: data.success,
        error: data.error,
        itemCount: data.data?.length || 0,
        headers: Object.fromEntries(response.headers.entries()),
        requestInfo: {
          userId: user?.id,
          userEmail: user?.email,
          timestamp: new Date().toISOString(),
        },
      }

      console.log('🔍 Get debug result:', result)
      setDebugInfo(result)
    })
  }

  const testWatchlistRemove = async () => {
    if (!testMovieId.trim()) {
      alert('Please enter a movie ID')
      return
    }

    setDebugInfo(null)

    await execute(async () => {
      console.log('🔍 Testing watchlist remove...', {
        movieId: testMovieId,
        user: user?.email,
        userId: user?.id,
      })

      const response = await fetch(`/api/watchlist?movie_id=${testMovieId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      const result = {
        type: 'REMOVE_WATCHLIST',
        status: response.status,
        ok: response.ok,
        success: data.success,
        error: data.error,
        message: data.message,
        headers: Object.fromEntries(response.headers.entries()),
        requestInfo: {
          movieId: testMovieId,
          userId: user?.id,
          userEmail: user?.email,
          timestamp: new Date().toISOString(),
        },
      }

      console.log('🔍 Remove debug result:', result)
      setDebugInfo(result)
    })
  }

  const generateTestMovieId = () => {
    // Generate a UUID-like string for testing
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c == 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
    setTestMovieId(uuid)
  }

  const fetchRealMovieId = async () => {
    try {
      const response = await fetch('/api/movies/test')
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        const randomMovie = data.data[Math.floor(Math.random() * data.data.length)]
        setTestMovieId(randomMovie.id)
        console.log('🎬 Using real movie:', randomMovie.title, randomMovie.id)
      } else {
        console.log('❌ No movies found in database')
        generateTestMovieId()
      }
    } catch (error) {
      console.error('❌ Error fetching real movie ID:', error)
      generateTestMovieId()
    }
  }

  if (!user) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>🔍 Watchlist Debugger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Not authenticated - please sign in first</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔍 Watchlist Debugger</CardTitle>
        <p className="text-sm text-gray-600">
          Test watchlist functionality. User: {user.email} (ID: {user.id})
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Movie ID (UUID format)"
            value={testMovieId}
            onChange={e => setTestMovieId(e.target.value)}
            className="flex-1"
          />
          <Button onClick={generateTestMovieId} variant="outline" size="sm">
            Generate Test ID
          </Button>
          <Button onClick={fetchRealMovieId} variant="outline" size="sm">
            Use Real Movie
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={testWatchlistAdd} disabled={isLoading} variant="default">
            {isLoading ? 'Testing Add...' : 'Test Add to Watchlist'}
          </Button>

          <Button onClick={testWatchlistRemove} disabled={isLoading} variant="destructive">
            {isLoading ? 'Testing Remove...' : 'Test Remove from Watchlist'}
          </Button>

          <Button onClick={testWatchlistGet} disabled={isLoading} variant="outline">
            {isLoading ? 'Testing Get...' : 'Test Get Watchlist'}
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4">
            <h4 className="mb-2 font-medium">Debug Results:</h4>
            <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-3 text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
