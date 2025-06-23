import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'normal' | 'compact' | 'side'
  bordered?: boolean
  imageFull?: boolean
  glass?: boolean
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    className,
    variant = 'normal',
    bordered = false,
    imageFull = false,
    glass = false,
    shadow = 'md',
    ...props 
  }, ref) => {
    const baseClasses = 'card bg-base-100'
    
    const variantClasses = cn({
      'card-compact': variant === 'compact',
      'card-side': variant === 'side',
    })
    
    const modifierClasses = cn({
      'bordered': bordered,
      'image-full': imageFull,
      'glass': glass,
      [`shadow-${shadow}`]: shadow !== 'none',
    })

    return (
      <div
        className={cn(
          baseClasses,
          variantClasses,
          modifierClasses,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card sub-components
export const CardBody = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => (
    <div className={cn('card-body', className)} ref={ref} {...props}>
      {children}
    </div>
  )
)

CardBody.displayName = 'CardBody'

export const CardTitle = React.forwardRef<HTMLHeadingElement, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => (
    <h2 className={cn('card-title', className)} ref={ref} {...props}>
      {children}
    </h2>
  )
)

CardTitle.displayName = 'CardTitle'

export const CardActions = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; justify?: 'start' | 'center' | 'end' }>(
  ({ children, className, justify = 'end', ...props }, ref) => (
    <div 
      className={cn(
        'card-actions',
        {
          'justify-start': justify === 'start',
          'justify-center': justify === 'center',
          'justify-end': justify === 'end',
        },
        className
      )} 
      ref={ref} 
      {...props}
    >
      {children}
    </div>
  )
)

CardActions.displayName = 'CardActions' 