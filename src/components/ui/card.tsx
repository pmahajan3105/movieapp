import * as React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'  // DaisyUI v5 card sizes
  variant?: 'default' | 'bordered' | 'dash' | 'side' | 'image-full'  // DaisyUI v5 variants
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, size, variant = 'default', ...props }, ref) => {
    const sizeClasses = {
      xs: 'card-xs',
      sm: 'card-sm', 
      md: 'card-md',
      lg: 'card-lg',
      xl: 'card-xl'
    }

    const variantClasses = {
      default: '',
      bordered: 'card-border',
      dash: 'card-dash',
      side: 'card-side',
      'image-full': 'image-full'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'card bg-base-100 shadow-sm',
          size && sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn('card-body pb-2', className)} 
      {...props} 
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { centered?: boolean }>(
  ({ className, centered = false, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        'card-body', 
        centered && 'items-center text-center',
        className
      )} 
      {...props} 
    />
  )
)
CardBody.displayName = 'CardBody'

// CardContent is an alias for CardBody for compatibility
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn('card-body', className)} 
      {...props} 
    />
  )
)
CardContent.displayName = 'CardContent'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('card-title', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-base-content/70 text-sm', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { position?: 'start' | 'end' | 'center' }>(
  ({ className, position = 'end', ...props }, ref) => {
    const positionClasses = {
      start: 'justify-start',
      end: 'justify-end', 
      center: 'justify-center'
    }

    return (
      <div 
        ref={ref} 
        className={cn(
          'card-actions',
          positionClasses[position],
          className
        )} 
        {...props} 
      />
    )
  }
)
CardActions.displayName = 'CardActions'

const CardFigure = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <figure ref={ref} className={className} {...props} />
  )
)
CardFigure.displayName = 'CardFigure'

export { 
  Card, 
  CardHeader,
  CardBody,
  CardContent,
  CardTitle, 
  CardDescription,
  CardActions,
  CardFigure
}
