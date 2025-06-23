import React from 'react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  children: React.ReactNode
  className?: string
  sticky?: boolean
  glass?: boolean
  shadow?: boolean
}

export const Navbar = React.forwardRef<HTMLDivElement, NavbarProps>(
  ({ 
    children, 
    className,
    sticky = false,
    glass = false,
    shadow = true,
    ...props 
  }, ref) => {
    const baseClasses = 'navbar bg-base-100'
    
    const modifierClasses = cn({
      'sticky top-0 z-50': sticky,
      'glass': glass,
      'shadow-lg': shadow,
    })

    return (
      <div
        className={cn(
          baseClasses,
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

Navbar.displayName = 'Navbar'

// Navbar sub-components
export const NavbarStart = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => (
    <div className={cn('navbar-start', className)} ref={ref} {...props}>
      {children}
    </div>
  )
)

NavbarStart.displayName = 'NavbarStart'

export const NavbarCenter = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => (
    <div className={cn('navbar-center', className)} ref={ref} {...props}>
      {children}
    </div>
  )
)

NavbarCenter.displayName = 'NavbarCenter'

export const NavbarEnd = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => (
    <div className={cn('navbar-end', className)} ref={ref} {...props}>
      {children}
    </div>
  )
)

NavbarEnd.displayName = 'NavbarEnd'

// Brand component for logo/title
export const NavbarBrand = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => (
    <div className={cn('flex items-center space-x-2', className)} ref={ref} {...props}>
      {children}
    </div>
  )
)

NavbarBrand.displayName = 'NavbarBrand' 