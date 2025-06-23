import React from 'react'
import { cn } from '@/lib/utils/index'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 
    | 'default' 
    | 'primary' 
    | 'secondary' 
    | 'accent' 
    | 'neutral'
    | 'info' 
    | 'success' 
    | 'warning' 
    | 'error'
    | 'outline' 
    | 'ghost' 
    | 'link'
    | 'soft'        // New DaisyUI v5 style
    | 'dash'        // New DaisyUI v5 style
    | 'active'      // New DaisyUI v5 style
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'  // Added xl size for v5
  loading?: boolean
  loadingType?: 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'  // Multiple loading styles
  children: React.ReactNode
  responsive?: boolean  // Enable responsive sizing
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  loadingType = 'spinner',
  responsive = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'btn'
  
  // DaisyUI v5 variant classes with new styles
  const variantClasses = {
    default: '',  // Default btn styling
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    neutral: 'btn-neutral',
    info: 'btn-info',
    success: 'btn-success',
    warning: 'btn-warning',
    error: 'btn-error',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    link: 'btn-link',
    soft: 'btn-soft',      // New v5 soft style
    dash: 'btn-dash',      // New v5 dash style
    active: 'btn-active'   // New v5 active style
  }
  
  // DaisyUI v5 size classes including new xl size
  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',           // Default size
    lg: 'btn-lg',
    xl: 'btn-xl'      // New v5 xl size
  }

  // Responsive size classes (DaisyUI v5 feature)
  const responsiveClasses = responsive 
    ? 'btn-xs sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl'
    : sizeClasses[size]

  // Loading spinner types from DaisyUI v5
  const loadingClasses = {
    spinner: 'loading loading-spinner',
    dots: 'loading loading-dots',
    ring: 'loading loading-ring', 
    ball: 'loading loading-ball',
    bars: 'loading loading-bars',
    infinity: 'loading loading-infinity'
  }

  // Loading size mapping to button size
  const loadingSizeMap = {
    xs: 'loading-xs',
    sm: 'loading-sm', 
    md: 'loading-md',
    lg: 'loading-lg',
    xl: 'loading-xl'
  }

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    responsive ? responsiveClasses : sizeClasses[size],
    className
  )

  const loadingSpinner = loading && (
    <span 
      className={cn(
        loadingClasses[loadingType],
        loadingSizeMap[size]
      )}
      aria-hidden="true"
    />
  )

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loadingSpinner}
      {children}
    </button>
  )
} 