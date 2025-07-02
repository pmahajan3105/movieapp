'use client'

import React, { useState, useEffect } from 'react'
import { audioManager } from '@/lib/audio/AudioManager'
import type { AudioPlaybackState } from '@/lib/audio/AudioManager'

interface AudioDebuggerProps {
  enabled?: boolean
}

export const AudioDebugger: React.FC<AudioDebuggerProps> = ({ enabled = false }) => {
  const [state, setState] = useState<AudioPlaybackState>({ isPlaying: false, source: null })
  const [activeSources, setActiveSources] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = audioManager.subscribe((newState: AudioPlaybackState) => {
      setState(newState)
    })

    // Check for concurrent audio sources every second
    const interval = setInterval(() => {
      const sources = audioManager.detectConcurrentAudio()
      setActiveSources(sources)
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [enabled])

  if (!enabled || process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-4 right-4 z-50 rounded bg-blue-600 px-3 py-1 text-sm text-white"
        title="Toggle Audio Debugger"
      >
        🎵 {activeSources.length > 1 ? '⚠️' : ''}
      </button>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed top-16 right-4 z-50 max-w-sm rounded bg-black p-4 text-white shadow-lg">
          <h3 className="mb-2 font-bold">Audio Debug Panel</h3>

          <div className="mb-2">
            <strong>State:</strong> {state.isPlaying ? 'Playing' : 'Silent'}
          </div>

          {state.source && (
            <div className="mb-2">
              <strong>Source:</strong> {state.source}
            </div>
          )}

          {state.description && (
            <div className="mb-2">
              <strong>Description:</strong> {state.description}
            </div>
          )}

          <div className="mb-2">
            <strong>Active Sources ({activeSources.length}):</strong>
            {activeSources.length > 0 ? (
              <ul className="list-inside list-disc text-xs">
                {activeSources.map(source => (
                  <li
                    key={source}
                    className={activeSources.length > 1 ? 'text-red-300' : 'text-green-300'}
                  >
                    {source}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-gray-300"> None</span>
            )}
          </div>

          {activeSources.length > 1 && (
            <div className="mb-2 rounded bg-red-800 p-2 text-xs">
              ⚠️ MULTIPLE AUDIO SOURCES DETECTED!
            </div>
          )}

          <div className="space-y-1">
            <button
              onClick={() => audioManager.stopAllAudio()}
              className="block w-full rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700"
            >
              Stop All Audio
            </button>
            <button
              onClick={() => audioManager.emergencyStopAll()}
              className="block w-full rounded bg-red-800 px-2 py-1 text-xs hover:bg-red-900"
            >
              Emergency Stop
            </button>
          </div>
        </div>
      )}
    </>
  )
}
