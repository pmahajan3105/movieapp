/**
 * Recommendation Behavior Settings Section
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Target } from 'lucide-react'
import { AIControlSettings } from '@/hooks/useAISettings'

interface Props {
  settings: AIControlSettings
  updateSetting: (path: string, value: any) => void
}

export const RecommendationBehaviorSection: React.FC<Props> = ({ 
  settings, 
  updateSetting 
}) => (
  <Card className="p-6">
    <h4 className="font-semibold flex items-center gap-2 mb-4">
      <Target className="w-5 h-5 text-blue-500" />
      Recommendation Behavior
    </h4>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Recommendation Style</label>
        <select
          value={settings.recommendation_style}
          onChange={(e) => updateSetting('recommendation_style', e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="conservative">Conservative (Safe picks)</option>
          <option value="balanced">Balanced (Mix of safe & new)</option>
          <option value="adventurous">Adventurous (Explore unknown)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Discovery Preference</label>
        <select
          value={settings.discovery_preference}
          onChange={(e) => updateSetting('discovery_preference', e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="safe">Safe (Similar to your favorites)</option>
          <option value="mixed">Mixed (Balanced exploration)</option>
          <option value="exploratory">Exploratory (Push boundaries)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Genre Diversity: {settings.genre_diversity}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.genre_diversity}
          onChange={(e) => updateSetting('genre_diversity', parseInt(e.target.value))}
          className="range range-primary"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Focused</span>
          <span>Diverse</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Era Preference</label>
        <select
          value={settings.temporal_preference}
          onChange={(e) => updateSetting('temporal_preference', e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="recent">Recent (Last 10 years)</option>
          <option value="mixed">Mixed (All eras)</option>
          <option value="classic">Classic (Pre-2000s focus)</option>
        </select>
      </div>
    </div>
  </Card>
)