import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'outline' | 'dash' | 'soft' | 'ghost'
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error'
}

function Badge({ 
  className, 
  size = 'md', 
  variant = 'default', 
  color,
  ...props 
}: BadgeProps) {
  const sizeClasses = {
    xs: 'badge-xs',
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
    xl: 'badge-xl'
  }

  const variantClasses = {
    default: '',
    outline: 'badge-outline',
    dash: 'badge-dash',
    soft: 'badge-soft',
    ghost: 'badge-ghost'
  }

  const colorClasses = color ? {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    accent: 'badge-accent',
    neutral: 'badge-neutral',
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error'
  }[color] : ''

  return (
    <div 
      className={cn(
        'badge',
        sizeClasses[size],
        variantClasses[variant],
        colorClasses,
        className
      )} 
      {...props} 
    />
  )
}

export { Badge }
