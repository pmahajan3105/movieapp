/**
 * Performance Settings Section
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Zap } from 'lucide-react'
import { AIControlSettings } from '@/hooks/useAISettings'
import { ToggleSwitch } from './ToggleSwitch'

interface Props {
  settings: AIControlSettings
  updateSetting: (path: string, value: any) => void
}

export const PerformanceSection: React.FC<Props> = ({ 
  settings, 
  updateSetting 
}) => (
  <Card className="p-6">
    <h4 className="font-semibold flex items-center gap-2 mb-4">
      <Zap className="w-5 h-5 text-orange-500" />
      Performance Settings
    </h4>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Recommendation Speed</label>
        <select
          value={settings.recommendation_speed}
          onChange={(e) => updateSetting('recommendation_speed', e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="fast">Fast (Quick results)</option>
          <option value="balanced">Balanced (Good speed & quality)</option>
          <option value="thorough">Thorough (Best quality)</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Cache Preferences</div>
          <ToggleSwitch
            enabled={settings.cache_preferences}
            onChange={(value) => updateSetting('cache_preferences', value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="font-medium">Background Learning</div>
          <ToggleSwitch
            enabled={settings.background_learning}
            onChange={(value) => updateSetting('background_learning', value)}
          />
        </div>
      </div>
    </div>
  </Card>
)