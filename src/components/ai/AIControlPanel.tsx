/**
 * AI Control Panel Component (Refactored)
 * Phase 3.5: Clean, modular AI behavior and preference controls
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  RotateCcw, 
  Save,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAISettings } from '@/hooks/useAISettings'
import { RecommendationBehaviorSection } from './RecommendationBehaviorSection'
import { AILearningSection } from './AILearningSection'
import { ContentFilteringSection } from './ContentFilteringSection'
import { ExplanationSection } from './ExplanationSection'
import { PerformanceSection } from './PerformanceSection'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export const AIControlPanel: React.FC<Props> = ({ className }) => {
  const { user } = useAuth()
  const {
    settings,
    isLoading,
    isSaving,
    hasChanges,
    error,
    successMessage,
    saveSettings,
    resetToDefaults,
    updateSetting
  } = useAISettings()

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-base-content/60">Please log in to access AI controls</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary animate-pulse" />
          <h3 className="text-xl font-bold">Loading AI Controls...</h3>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-full h-32 bg-base-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-bold">AI Control Panel</h3>
          {hasChanges && (
            <Badge variant="outline" className="text-warning">
              Unsaved changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetToDefaults}
            className="text-xs"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
            size="sm"
          >
            {isSaving ? (
              <>
                <div className="loading loading-spinner loading-xs mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Settings Sections */}
      <RecommendationBehaviorSection 
        settings={settings}
        updateSetting={updateSetting}
      />

      <AILearningSection 
        settings={settings}
        updateSetting={updateSetting}
      />

      <ContentFilteringSection 
        settings={settings}
        updateSetting={updateSetting}
      />

      <ExplanationSection 
        settings={settings}
        updateSetting={updateSetting}
      />

      <PerformanceSection 
        settings={settings}
        updateSetting={updateSetting}
      />

      {/* Privacy Notice */}
      <Card className="border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Privacy & Data</h5>
            <p className="text-sm text-blue-700">
              Your AI settings and learned preferences are stored securely and used only to improve your movie recommendations. 
              You can reset or disable learning at any time. Data is not shared with third parties.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}