import React from 'react'
import { RecommendationExplanation } from '@/types/explanation'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  explanation: RecommendationExplanation
  className?: string
}

export const ExplanationPopover: React.FC<Props> = ({ explanation, className }) => {
  const { primary_reason, supporting_movies } = explanation as any

  return (
    <Card className={cn('p-3 w-64 text-sm shadow-md', className)}>
      <p className="mb-2 font-medium">{primary_reason}</p>
      {supporting_movies?.length ? (
        <div className="mb-2">
          <span className="font-semibold">Because you liked:</span>
          <ul className="list-disc list-inside">
            {supporting_movies.map((title: string) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {explanation.optimal_viewing_time && (
        <p className="text-xs opacity-70">💡 {explanation.optimal_viewing_time}</p>
      )}
    </Card>
  )
} 