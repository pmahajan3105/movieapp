# DaisyUI Architecture Documentation

## Overview

This document outlines the DaisyUI implementation architecture designed to make future UI changes easy and maintainable.

## 🎨 Theme Management

### Theme Configuration (`src/lib/theme-config.ts`)

Centralized configuration for all themes, component variants, and design tokens.

```typescript
import { THEME_CONFIG, ThemeName } from '@/lib/theme-config'

// Available themes
const themes = THEME_CONFIG.themes
// Component variants
const buttonVariants = THEME_CONFIG.components.button.variants
```

### Theme Provider (`src/contexts/ThemeContext.tsx`)

React context that manages theme state across the application.

```typescript
import { useTheme } from '@/contexts/ThemeContext'

function MyComponent() {
  const { currentTheme, setTheme, toggleTheme, isLight } = useTheme()

  return (
    <button onClick={toggleTheme}>
      Switch to {isLight ? 'dark' : 'light'} theme
    </button>
  )
}
```

## 🧩 Component Library

### Location: `src/components/ui/daisyui/`

All DaisyUI components are wrapped in reusable, type-safe components:

#### Button Component

```typescript
import { Button } from '@/components/ui/daisyui'

<Button
  variant="btn-primary"
  size="btn-lg"
  buttonStyle="btn-outline"
  loading={isLoading}
>
  Click me
</Button>
```

#### Card Components

```typescript
import { Card, CardBody, CardTitle, CardActions } from '@/components/ui/daisyui'

<Card variant="compact" glass shadow="lg">
  <CardBody>
    <CardTitle>Movie Title</CardTitle>
    <p>Movie description...</p>
    <CardActions justify="end">
      <Button variant="btn-primary">Watch</Button>
    </CardActions>
  </CardBody>
</Card>
```

#### Navbar Components

```typescript
import {
  Navbar,
  NavbarStart,
  NavbarCenter,
  NavbarEnd,
  NavbarBrand
} from '@/components/ui/daisyui'

<Navbar sticky shadow>
  <NavbarStart>
    <NavbarBrand>Logo</NavbarBrand>
  </NavbarStart>
  <NavbarCenter>Search</NavbarCenter>
  <NavbarEnd>Menu</NavbarEnd>
</Navbar>
```

## 🎯 Making Future UI Changes

### 1. Adding New Themes

Update `src/lib/theme-config.ts`:

```typescript
export const THEME_CONFIG = {
  themes: {
    // Add new theme
    myCustomTheme: 'my-custom-theme',
    // ... existing themes
  },
  categories: {
    light: [..., 'my-custom-theme'],
    // or
    dark: [..., 'my-custom-theme'],
  }
}
```

### 2. Creating New Components

Follow the pattern in `src/components/ui/daisyui/`:

```typescript
// src/components/ui/daisyui/Modal.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  children: React.ReactNode
  className?: string
  open?: boolean
  size?: 'modal-sm' | 'modal-md' | 'modal-lg'
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ children, className, open = false, size = 'modal-md', ...props }, ref) => {
    return (
      <div
        className={cn(
          'modal',
          { 'modal-open': open },
          size,
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="modal-box">
          {children}
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'
```

### 3. Updating Component Variants

Modify `src/lib/theme-config.ts`:

```typescript
components: {
  button: {
    variants: [
      // Add new variant
      'btn-custom',
      // ... existing variants
    ],
  },
}
```

### 4. Global Style Changes

Update `src/app/globals.css`:

```css
/* Add custom utilities */
.my-custom-class {
  @apply bg-primary text-primary-content rounded-lg;
}

/* Override DaisyUI defaults */
.btn {
  @apply transition-all duration-300;
}
```

## 🔧 Configuration Files

### Tailwind Config (`tailwind.config.ts`)

- DaisyUI plugin configuration
- Custom animations and utilities
- ShadCN compatibility layers

### Global CSS (`src/app/globals.css`)

- DaisyUI import and theme config
- Custom utilities and animations
- Scrollbar styling

### Layout (`src/app/layout.tsx`)

- ThemeProvider wrapper
- Theme persistence
- Root styling

## 🚀 Development Workflow

### Adding a New Feature

1. **Design**: Choose appropriate DaisyUI components
2. **Implement**: Use existing component wrappers or create new ones
3. **Style**: Leverage theme system for consistency
4. **Test**: Verify across different themes

### Modifying Existing Components

1. **Locate**: Find component in `src/components/ui/daisyui/`
2. **Update**: Modify props or styling
3. **Export**: Update index file if needed
4. **Verify**: Test all usage locations

### Theme Updates

1. **Configure**: Update theme config
2. **Test**: Verify theme switching works
3. **Document**: Update this file if needed

## 🎨 Design System

### Color Usage

```css
/* Use semantic colors for theme consistency */
bg-base-100      /* Page background */
bg-base-200      /* Card background */
bg-base-300      /* Subtle backgrounds */
text-base-content /* Main text */
bg-primary       /* Brand actions */
bg-secondary     /* Secondary actions */
bg-accent        /* Highlights */
```

### Component Consistency

- All components use the same size scale (`btn-sm`, `btn-md`, `btn-lg`)
- Consistent spacing using DaisyUI classes
- Unified animation timing and easing

## 📚 Resources

- [DaisyUI Documentation](https://daisyui.com/)
- [Theme Generator](https://daisyui.com/theme-generator/)
- [Component Examples](https://daisyui.com/components/)

## 🔍 Troubleshooting

### Theme Not Applying

- Check ThemeProvider is wrapping the app
- Verify theme name exists in config
- Check localStorage for saved theme

### Component Styling Issues

- Ensure DaisyUI classes are not conflicting
- Check component props are correctly typed
- Verify Tailwind purging isn't removing classes

### Build Issues

- Check DaisyUI plugin is correctly imported
- Verify all component imports are valid
- Check TypeScript types are correct

This architecture makes UI changes:

- **Predictable**: Clear patterns and conventions
- **Scalable**: Easy to add new components and themes
- **Maintainable**: Centralized configuration
- **Type-safe**: Full TypeScript support
- **Consistent**: Unified design system
