import React from 'react'
import { RecommendationExplanation } from '@/types/explanation'
import { cn } from '@/lib/utils'

interface Props {
  explanation: RecommendationExplanation
  className?: string
}

export const ConfidenceBadge: React.FC<Props> = ({ explanation, className }) => {
  const { confidence_score, discovery_factor } = explanation

  const colour = (() => {
    switch (discovery_factor) {
      case 'safe':
        return 'bg-success text-success-content'
      case 'stretch':
        return 'bg-warning text-warning-content'
      case 'adventure':
        return 'bg-error text-error-content'
      default:
        return 'bg-primary text-primary-content'
    }
  })()

  return (
    <div
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-semibold opacity-90',
        colour,
        className
      )}
      title={discovery_factor}
      aria-label={`${confidence_score}% match (${discovery_factor})`}
    >
      {confidence_score}%
    </div>
  )
} 