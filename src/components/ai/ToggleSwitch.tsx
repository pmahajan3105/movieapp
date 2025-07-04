/**
 * Reusable Toggle Switch Component
 */

import React from 'react'
import { ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  enabled: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  className?: string
}

export const ToggleSwitch: React.FC<Props> = ({ 
  enabled, 
  onChange, 
  disabled = false, 
  className 
}) => (
  <button
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={cn(
      'transition-colors',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      className
    )}
  >
    {enabled ? (
      <ToggleRight className="w-6 h-6 text-primary" />
    ) : (
      <ToggleLeft className="w-6 h-6 text-gray-400" />
    )}
  </button>
)