/**
 * AI Explanation Preferences Section
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'
import { AIControlSettings } from '@/hooks/useAISettings'
import { ToggleSwitch } from './ToggleSwitch'

interface Props {
  settings: AIControlSettings
  updateSetting: (path: string, value: any) => void
}

export const ExplanationSection: React.FC<Props> = ({ 
  settings, 
  updateSetting 
}) => (
  <Card className="p-6">
    <h4 className="font-semibold flex items-center gap-2 mb-4">
      <Lightbulb className="w-5 h-5 text-yellow-500" />
      AI Explanations
    </h4>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Explanation Detail</label>
        <select
          value={settings.explanation_detail}
          onChange={(e) => updateSetting('explanation_detail', e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="minimal">Minimal (Basic reason)</option>
          <option value="standard">Standard (Detailed reasoning)</option>
          <option value="detailed">Detailed (Full analysis)</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Show Confidence Scores</div>
          <ToggleSwitch
            enabled={settings.show_confidence_scores}
            onChange={(value) => updateSetting('show_confidence_scores', value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="font-medium">Show AI Reasoning</div>
          <ToggleSwitch
            enabled={settings.show_reasoning}
            onChange={(value) => updateSetting('show_reasoning', value)}
          />
        </div>
      </div>
    </div>
  </Card>
)