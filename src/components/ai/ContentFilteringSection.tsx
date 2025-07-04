/**
 * Content Filtering Settings Section
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Shield } from 'lucide-react'
import { AIControlSettings } from '@/hooks/useAISettings'
import { ToggleSwitch } from './ToggleSwitch'

interface Props {
  settings: AIControlSettings
  updateSetting: (path: string, value: any) => void
}

export const ContentFilteringSection: React.FC<Props> = ({ 
  settings, 
  updateSetting 
}) => (
  <Card className="p-6">
    <h4 className="font-semibold flex items-center gap-2 mb-4">
      <Shield className="w-5 h-5 text-green-500" />
      Content Filtering
    </h4>
    
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Filter Explicit Content</div>
          <div className="text-sm text-gray-600">Hide movies with explicit content</div>
        </div>
        <ToggleSwitch
          enabled={settings.content_filtering.explicit_content}
          onChange={(value) => updateSetting('content_filtering.explicit_content', value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Include Adult Themes</div>
          <div className="text-sm text-gray-600">Allow mature thematic content</div>
        </div>
        <ToggleSwitch
          enabled={settings.content_filtering.adult_themes}
          onChange={(value) => updateSetting('content_filtering.adult_themes', value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Violence Threshold: {settings.content_filtering.violence_threshold}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.content_filtering.violence_threshold}
          onChange={(e) => updateSetting('content_filtering.violence_threshold', parseInt(e.target.value))}
          className="range range-green"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>None</span>
          <span>All</span>
        </div>
      </div>
    </div>
  </Card>
)