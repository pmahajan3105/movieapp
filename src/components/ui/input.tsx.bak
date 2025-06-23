import * as React from 'react'

import { cn } from '@/lib/utils'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'ghost'
  color?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = 'md', variant = 'default', color, ...props }, ref) => {
    const sizeClasses = {
      xs: 'input-xs',
      sm: 'input-sm',
      md: 'input-md',
      lg: 'input-lg',
      xl: 'input-xl'
    }

    const variantClasses = {
      default: '',
      ghost: 'input-ghost'
    }

    const colorClasses = color ? {
      neutral: 'input-neutral',
      primary: 'input-primary',
      secondary: 'input-secondary',
      accent: 'input-accent',
      info: 'input-info',
      success: 'input-success',
      warning: 'input-warning',
      error: 'input-error'
    }[color] : ''

    return (
      <input
        className={cn(
          'input',
          sizeClasses[size],
          variantClasses[variant],
          colorClasses,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
