// Theme configuration for the application
export const THEME_CONFIG = {
  // Available themes
  themes: {
    pastel: 'pastel',
    light: 'light', 
    dark: 'dark',
    cupcake: 'cupcake',
    bumblebee: 'bumblebee',
    emerald: 'emerald',
    corporate: 'corporate',
    synthwave: 'synthwave',
    retro: 'retro',
    cyberpunk: 'cyberpunk',
    valentine: 'valentine',
    halloween: 'halloween',
    garden: 'garden',
    forest: 'forest',
    aqua: 'aqua',
    lofi: 'lofi',
    fantasy: 'fantasy',
    wireframe: 'wireframe',
    black: 'black',
    luxury: 'luxury',
    dracula: 'dracula',
  } as const,

  // Default theme
  defaultTheme: 'pastel' as const,

  // Theme categories for easier organization
  categories: {
    light: ['pastel', 'light', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'retro', 'valentine', 'garden', 'aqua', 'lofi', 'fantasy', 'wireframe'],
    dark: ['dark', 'synthwave', 'cyberpunk', 'halloween', 'forest', 'black', 'luxury', 'dracula'],
  },

  // Animation preferences
  animations: {
    enabled: true,
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      default: 'ease-in-out',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Component variants
  components: {
    button: {
      sizes: ['btn-xs', 'btn-sm', 'btn-md', 'btn-lg'],
      variants: ['btn-primary', 'btn-secondary', 'btn-accent', 'btn-info', 'btn-success', 'btn-warning', 'btn-error'],
      styles: ['btn-outline', 'btn-ghost', 'btn-link'],
    },
    card: {
      variants: ['card-compact', 'card-normal', 'card-side'],
      backgrounds: ['bg-base-100', 'bg-base-200', 'bg-base-300'],
    },
    modal: {
      sizes: ['modal-sm', 'modal-md', 'modal-lg'],
      positions: ['modal-top', 'modal-middle', 'modal-bottom'],
    },
  },

  // Spacing scale
  spacing: {
    xs: '0.5rem',
    sm: '1rem', 
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },

  // Border radius scale
  radius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem', 
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
} as const

// Type definitions
export type ThemeName = keyof typeof THEME_CONFIG.themes
export type ThemeCategory = keyof typeof THEME_CONFIG.categories
export type ComponentSize = typeof THEME_CONFIG.components.button.sizes[number]
export type ComponentVariant = typeof THEME_CONFIG.components.button.variants[number]
export type ComponentStyle = typeof THEME_CONFIG.components.button.styles[number]

// Utility functions
export const getThemesByCategory = (category: ThemeCategory): readonly string[] => {
  return THEME_CONFIG.categories[category]
}

export const isLightTheme = (theme: ThemeName): boolean => {
  return (THEME_CONFIG.categories.light as readonly string[]).includes(theme)
}

export const isDarkTheme = (theme: ThemeName): boolean => {
  return (THEME_CONFIG.categories.dark as readonly string[]).includes(theme)
}

export const getDefaultTheme = (): ThemeName => {
  return THEME_CONFIG.defaultTheme
} 