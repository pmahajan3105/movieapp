/**
 * AI Learning Controls Section
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Brain } from 'lucide-react'
import { AIControlSettings } from '@/hooks/useAISettings'
import { ToggleSwitch } from './ToggleSwitch'

interface Props {
  settings: AIControlSettings
  updateSetting: (path: string, value: any) => void
}

export const AILearningSection: React.FC<Props> = ({ 
  settings, 
  updateSetting 
}) => (
  <Card className="p-6">
    <h4 className="font-semibold flex items-center gap-2 mb-4">
      <Brain className="w-5 h-5 text-purple-500" />
      AI Learning Controls
    </h4>
    
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Enable AI Learning</div>
          <div className="text-sm text-gray-600">Allow AI to learn from your interactions</div>
        </div>
        <ToggleSwitch
          enabled={settings.learning_enabled}
          onChange={(value) => updateSetting('learning_enabled', value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Conversation Memory</div>
          <div className="text-sm text-gray-600">Remember context from past conversations</div>
        </div>
        <ToggleSwitch
          enabled={settings.conversation_memory}
          onChange={(value) => updateSetting('conversation_memory', value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Behavioral Analysis</div>
          <div className="text-sm text-gray-600">Analyze viewing patterns and preferences</div>
        </div>
        <ToggleSwitch
          enabled={settings.behavioral_analysis}
          onChange={(value) => updateSetting('behavioral_analysis', value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Rating Weight: {settings.rating_weight}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.rating_weight}
          onChange={(e) => updateSetting('rating_weight', parseInt(e.target.value))}
          className="range range-purple"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low Impact</span>
          <span>High Impact</span>
        </div>
      </div>
    </div>
  </Card>
)