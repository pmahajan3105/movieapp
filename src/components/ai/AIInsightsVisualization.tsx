'use client'

/**
 * AI Insights Visualization
 * Rich UI components for displaying AI analysis results with interactive visualizations
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AdvancedWorkflowResult } from '@/lib/ai/advanced-workflow-orchestrator'

interface AIInsightsVisualizationProps {
  results: AdvancedWorkflowResult
  showPerformanceMetrics?: boolean
  interactive?: boolean
  className?: string
}

export function AIInsightsVisualization({
  results,
  showPerformanceMetrics = false,
  interactive = true,
  className = '',
}: AIInsightsVisualizationProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'themes' | 'emotions' | 'style' | 'performance'
  >('overview')

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '🎯' },
    { id: 'themes', label: '🎭 Themes', icon: '🎭' },
    { id: 'emotions', label: '💝 Emotions', icon: '💝' },
    { id: 'style', label: '🎨 Style', icon: '🎨' },
    ...(showPerformanceMetrics ? [{ id: 'performance', label: '⚡ Performance', icon: '⚡' }] : []),
  ]

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            🤖 AI Analysis Insights
            <div className="badge badge-primary badge-sm">
              {Math.round(results.insights.confidence * 100)}% confidence
            </div>
          </h2>

          {results.performance && (
            <div className="stats stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Processing Time</div>
                <div className="stat-value text-sm">{results.performance.totalTime}ms</div>
              </div>
              <div className="stat">
                <div className="stat-title">Cache Hits</div>
                <div className="stat-value text-sm">{results.performance.cacheHits}</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="tabs tabs-bordered mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab tab-lg ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[400px]"
          >
            {activeTab === 'overview' && <OverviewVisualization results={results} />}
            {activeTab === 'themes' && (
              <ThemeNetworkVisualization
                themeNetwork={results.visualizations.themeNetwork}
                interactive={interactive}
              />
            )}
            {activeTab === 'emotions' && (
              <EmotionalVisualization
                moodSpectrum={results.visualizations.moodSpectrum}
                emotionalArc={results.visualizations.emotionalArc}
                interactive={interactive}
              />
            )}
            {activeTab === 'style' && (
              <StyleVisualization
                styleComparison={results.visualizations.styleComparison}
                interactive={interactive}
              />
            )}
            {activeTab === 'performance' && showPerformanceMetrics && (
              <PerformanceVisualization performance={results.performance} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function OverviewVisualization({ results }: { results: AdvancedWorkflowResult }) {
  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="card bg-primary/10 border-primary/20 border">
          <div className="card-body p-4">
            <h3 className="text-primary font-semibold">🎯 Primary Themes</h3>
            <div className="mt-2 space-y-2">
              {results.insights.personalizedReasons.slice(0, 3).map((reason, index) => (
                <div key={index} className="badge badge-primary badge-outline badge-sm">
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card bg-secondary/10 border-secondary/20 border">
          <div className="card-body p-4">
            <h3 className="text-secondary font-semibold">🎬 Movie Count</h3>
            <div className="mt-2 text-2xl font-bold">{results.movies.length}</div>
            <div className="text-sm opacity-70">recommendations found</div>
          </div>
        </div>

        <div className="card bg-accent/10 border-accent/20 border">
          <div className="card-body p-4">
            <h3 className="text-accent font-semibold">⚡ Analysis Depth</h3>
            <div className="progress progress-accent mt-2">
              <div
                className="progress-value"
                style={{ width: `${results.insights.confidence * 100}%` }}
              />
            </div>
            <div className="mt-1 text-sm">
              {Math.round(results.insights.confidence * 100)}% confidence
            </div>
          </div>
        </div>
      </div>

      {/* Educational Content */}
      {results.insights.educationalContent && (
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title">📚 Educational Insights</h3>
            <div className="space-y-3">
              {results.insights.educationalContent.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-base-100 flex items-start gap-3 rounded-lg p-3"
                >
                  <div className="text-2xl">💡</div>
                  <div>
                    <div className="font-medium">{insight}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeNetworkVisualization({
  themeNetwork,
  interactive,
}: {
  themeNetwork?: Array<{ theme: string; connections: string[]; strength: number }>
  interactive: boolean
}) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  if (!themeNetwork || themeNetwork.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">🎭</div>
          <div className="text-lg font-medium">No theme data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-2 text-xl font-semibold">🎭 Thematic Connections</h3>
        <p className="text-base-content/70">
          Explore how different themes interconnect across your recommendations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {themeNetwork.map((node, index) => (
          <motion.div
            key={node.theme}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors ${
              selectedTheme === node.theme ? 'ring-primary ring-2' : ''
            }`}
            onClick={() =>
              interactive && setSelectedTheme(selectedTheme === node.theme ? null : node.theme)
            }
          >
            <div className="card-body p-4 text-center">
              <div className="text-lg font-medium">{node.theme}</div>
              <div className="mt-2">
                <div
                  className="radial-progress text-primary"
                  style={{ '--value': node.strength * 100 } as any}
                >
                  {Math.round(node.strength * 100)}%
                </div>
              </div>
              {selectedTheme === node.theme && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-base-300 mt-3 border-t pt-3"
                >
                  <div className="text-base-content/70 text-sm">Connected to:</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {node.connections.map(connection => (
                      <div key={connection} className="badge badge-primary badge-xs">
                        {connection}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function EmotionalVisualization({
  moodSpectrum,
  emotionalArc,
  interactive,
}: {
  moodSpectrum?: Array<{ mood: string; intensity: number; movies: string[] }>
  emotionalArc?: Array<{ phase: string; intensity: number; description: string }>
  interactive: boolean
}) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null)

  if (!moodSpectrum && !emotionalArc) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">💝</div>
          <div className="text-lg font-medium">No emotional data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Mood Spectrum */}
      {moodSpectrum && moodSpectrum.length > 0 && (
        <div>
          <h3 className="mb-4 text-center text-xl font-semibold">🌈 Emotional Spectrum</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {moodSpectrum.map((mood, index) => (
              <motion.div
                key={mood.mood}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`card from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 cursor-pointer bg-gradient-to-br transition-all ${
                  selectedMood === mood.mood ? 'ring-accent ring-2' : ''
                }`}
                onClick={() =>
                  interactive && setSelectedMood(selectedMood === mood.mood ? null : mood.mood)
                }
              >
                <div className="card-body p-4 text-center">
                  <div className="text-lg font-medium capitalize">{mood.mood}</div>
                  <div className="mt-2">
                    <div className="bg-base-300 h-2 w-full rounded-full">
                      <div
                        className="from-primary to-secondary h-2 rounded-full bg-gradient-to-r transition-all duration-1000"
                        style={{ width: `${mood.intensity * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 text-sm">{Math.round(mood.intensity * 100)}%</div>
                  </div>
                  {selectedMood === mood.mood && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-base-300 mt-3 border-t pt-3"
                    >
                      <div className="text-base-content/70 text-sm">Featured in:</div>
                      <div className="mt-1 space-y-1">
                        {mood.movies.slice(0, 3).map(movie => (
                          <div key={movie} className="bg-base-200 rounded px-2 py-1 text-xs">
                            {movie}
                          </div>
                        ))}
                        {mood.movies.length > 3 && (
                          <div className="text-base-content/50 text-xs">
                            +{mood.movies.length - 3} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Emotional Arc */}
      {emotionalArc && emotionalArc.length > 0 && (
        <div>
          <h3 className="mb-4 text-center text-xl font-semibold">📈 Emotional Journey</h3>
          <div className="relative">
            <div className="bg-base-200 flex h-40 items-end justify-between rounded-lg p-4">
              {emotionalArc.map((phase, index) => (
                <motion.div
                  key={phase.phase}
                  initial={{ height: 0 }}
                  animate={{ height: `${phase.intensity * 100}%` }}
                  transition={{ delay: index * 0.2, duration: 0.8 }}
                  className="flex flex-1 flex-col items-center"
                >
                  <div
                    className="from-primary to-accent w-8 rounded-t-lg bg-gradient-to-t"
                    style={{ height: `${phase.intensity * 120}px` }}
                  />
                  <div className="mt-2 text-center text-sm font-medium">{phase.phase}</div>
                  <div className="text-base-content/70 px-1 text-center text-xs">
                    {phase.description}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StyleVisualization({
  styleComparison,
  interactive,
}: {
  styleComparison?: Array<{ director: string; signature: string[]; examples: string[] }>
  interactive: boolean
}) {
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null)

  if (!styleComparison || styleComparison.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">🎨</div>
          <div className="text-lg font-medium">No style data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-2 text-xl font-semibold">🎨 Directorial Styles</h3>
        <p className="text-base-content/70">
          Discover the unique visual signatures of different directors
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {styleComparison.map((director, index) => (
          <motion.div
            key={director.director}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`card bg-base-200 hover:bg-base-300 cursor-pointer transition-all ${
              selectedDirector === director.director ? 'ring-primary scale-105 ring-2' : ''
            }`}
            onClick={() =>
              interactive &&
              setSelectedDirector(selectedDirector === director.director ? null : director.director)
            }
          >
            <div className="card-body p-5">
              <h4 className="card-title text-lg">{director.director}</h4>

              <div className="space-y-3">
                <div>
                  <div className="text-base-content/70 mb-2 text-sm font-medium">
                    Signature Elements:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {director.signature.map(element => (
                      <div key={element} className="badge badge-primary badge-sm">
                        {element}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-base-content/70 mb-2 text-sm font-medium">
                    Notable Works:
                  </div>
                  <div className="space-y-1">
                    {director.examples.map(example => (
                      <div key={example} className="bg-base-100 rounded px-2 py-1 text-sm">
                        🎬 {example}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedDirector === director.director && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-base-300 mt-4 border-t pt-4"
                >
                  <div className="text-sm">
                    <div className="mb-2 font-medium">Style Analysis:</div>
                    <p className="text-base-content/70">
                      This director&apos;s visual approach combines{' '}
                      {director.signature.join(', ').toLowerCase()}
                      to create a distinctive cinematic experience.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function PerformanceVisualization({
  performance,
}: {
  performance: AdvancedWorkflowResult['performance']
}) {
  const serviceEntries = Object.entries(performance.serviceBreakdown)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-2 text-xl font-semibold">⚡ Performance Metrics</h3>
        <p className="text-base-content/70">Detailed breakdown of processing performance</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Total Time</div>
          <div className="stat-value text-lg">{performance.totalTime}ms</div>
          <div className="stat-desc">End-to-end processing</div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Cache Hits</div>
          <div className="stat-value text-lg">{performance.cacheHits}</div>
          <div className="stat-desc">Cached responses used</div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">API Calls</div>
          <div className="stat-value text-lg">{performance.apiCalls}</div>
          <div className="stat-desc">External service calls</div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Efficiency</div>
          <div className="stat-value text-lg">
            {Math.round(
              (performance.cacheHits / (performance.cacheHits + performance.apiCalls)) * 100
            )}
            %
          </div>
          <div className="stat-desc">Cache hit ratio</div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h4 className="card-title mb-4">Service Breakdown</h4>
          <div className="space-y-3">
            {serviceEntries.map(([service, time]) => (
              <div key={service} className="flex items-center justify-between">
                <div className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1')}</div>
                <div className="flex items-center gap-3">
                  <div className="bg-base-300 h-2 w-32 rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(time / performance.totalTime) * 100}%` }}
                    />
                  </div>
                  <div className="font-mono text-sm">{time}ms</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
