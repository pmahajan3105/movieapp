import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import type { RecommendationExplanation } from '@/types/explanation'
import { cn } from '@/lib/utils'
import { showExplanationToast } from '@/components/ui/showExplanationToast'

interface ExplanationBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  explanation: RecommendationExplanation
}

/**
 * Quick inline badge that surfaces the most user-specific reason a movie was recommended.
 * Priority: memory_hit › storyline_match › primary_reason.
 */
export function ExplanationBadge({ explanation, className, ...rest }: ExplanationBadgeProps) {
  if (!explanation) return null

  const text = explanation.memory_hit || explanation.storyline_match || explanation.primary_reason

  // Map discovery_factor to a daisyUI badge colour
  let color: any = 'primary'
  if (explanation.discovery_factor === 'stretch') color = 'warning'
  if (explanation.discovery_factor === 'adventure') color = 'accent'

  return (
    <Badge
      size="sm"
      variant="soft"
      color={color}
      className={cn('max-w-full truncate', className)}
      title={text}
      onClick={() => showExplanationToast(explanation)}
      {...rest}
    >
      {text}
    </Badge>
  )
} 