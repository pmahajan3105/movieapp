import {
  THEME_CONFIG,
  ThemeName,
  ThemeCategory,
  ComponentSize,
  ComponentVariant,
  ComponentStyle,
  getThemesByCategory,
  isLightTheme,
  isDarkTheme,
  getDefaultTheme,
} from '../../lib/theme-config'

describe('Theme Configuration', () => {
  describe('THEME_CONFIG Structure', () => {
    it('contains all expected theme properties', () => {
      expect(THEME_CONFIG).toHaveProperty('themes')
      expect(THEME_CONFIG).toHaveProperty('defaultTheme')
      expect(THEME_CONFIG).toHaveProperty('categories')
      expect(THEME_CONFIG).toHaveProperty('animations')
      expect(THEME_CONFIG).toHaveProperty('components')
      expect(THEME_CONFIG).toHaveProperty('spacing')
      expect(THEME_CONFIG).toHaveProperty('radius')
    })

    it('has correct default theme', () => {
      expect(THEME_CONFIG.defaultTheme).toBe('pastel')
    })

    it('contains expected themes', () => {
      const expectedThemes = [
        'pastel',
        'light',
        'dark',
        'cupcake',
        'bumblebee',
        'emerald',
        'corporate',
        'synthwave',
        'retro',
        'cyberpunk',
        'valentine',
        'halloween',
        'garden',
        'forest',
        'aqua',
        'lofi',
        'fantasy',
        'wireframe',
        'black',
        'luxury',
        'dracula',
      ]

      expectedThemes.forEach(theme => {
        expect(THEME_CONFIG.themes).toHaveProperty(theme)
        expect(THEME_CONFIG.themes[theme as ThemeName]).toBe(theme)
      })
    })

    it('has light and dark theme categories', () => {
      expect(THEME_CONFIG.categories).toHaveProperty('light')
      expect(THEME_CONFIG.categories).toHaveProperty('dark')
      expect(Array.isArray(THEME_CONFIG.categories.light)).toBe(true)
      expect(Array.isArray(THEME_CONFIG.categories.dark)).toBe(true)
    })

    it('categorizes themes correctly', () => {
      const lightThemes = THEME_CONFIG.categories.light
      const darkThemes = THEME_CONFIG.categories.dark

      // Check some known light themes
      expect(lightThemes).toContain('light')
      expect(lightThemes).toContain('pastel')
      expect(lightThemes).toContain('cupcake')

      // Check some known dark themes
      expect(darkThemes).toContain('dark')
      expect(darkThemes).toContain('synthwave')
      expect(darkThemes).toContain('dracula')
    })

    it('has no theme overlap between categories', () => {
      const lightThemes = new Set(THEME_CONFIG.categories.light)
      const darkThemes = new Set(THEME_CONFIG.categories.dark)

      // Check for no intersection
      const intersection = [...lightThemes].filter(theme => darkThemes.has(theme))
      expect(intersection).toHaveLength(0)
    })

    it('includes all themes in categories', () => {
      const allThemeNames = Object.keys(THEME_CONFIG.themes)
      const categorizedThemes = [...THEME_CONFIG.categories.light, ...THEME_CONFIG.categories.dark]

      expect(categorizedThemes.sort()).toEqual(allThemeNames.sort())
    })
  })

  describe('Animation Configuration', () => {
    it('has animation settings', () => {
      expect(THEME_CONFIG.animations.enabled).toBe(true)
      expect(THEME_CONFIG.animations).toHaveProperty('duration')
      expect(THEME_CONFIG.animations).toHaveProperty('easing')
    })

    it('has duration settings', () => {
      expect(THEME_CONFIG.animations.duration.fast).toBe(150)
      expect(THEME_CONFIG.animations.duration.normal).toBe(300)
      expect(THEME_CONFIG.animations.duration.slow).toBe(500)
    })

    it('has easing settings', () => {
      expect(THEME_CONFIG.animations.easing.default).toBe('ease-in-out')
      expect(THEME_CONFIG.animations.easing.spring).toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)')
    })

    it('has valid duration values', () => {
      const durations = Object.values(THEME_CONFIG.animations.duration)
      durations.forEach(duration => {
        expect(typeof duration).toBe('number')
        expect(duration).toBeGreaterThan(0)
      })
    })
  })

  describe('Component Configuration', () => {
    it('has button component configuration', () => {
      expect(THEME_CONFIG.components.button).toHaveProperty('sizes')
      expect(THEME_CONFIG.components.button).toHaveProperty('variants')
      expect(THEME_CONFIG.components.button).toHaveProperty('styles')
    })

    it('has correct button sizes', () => {
      const expectedSizes = ['btn-xs', 'btn-sm', 'btn-md', 'btn-lg']
      expect(THEME_CONFIG.components.button.sizes).toEqual(expectedSizes)
    })

    it('has correct button variants', () => {
      const expectedVariants = [
        'btn-primary',
        'btn-secondary',
        'btn-accent',
        'btn-info',
        'btn-success',
        'btn-warning',
        'btn-error',
      ]
      expect(THEME_CONFIG.components.button.variants).toEqual(expectedVariants)
    })

    it('has correct button styles', () => {
      const expectedStyles = ['btn-outline', 'btn-ghost', 'btn-link']
      expect(THEME_CONFIG.components.button.styles).toEqual(expectedStyles)
    })

    it('has card component configuration', () => {
      expect(THEME_CONFIG.components.card).toHaveProperty('variants')
      expect(THEME_CONFIG.components.card).toHaveProperty('backgrounds')

      expect(THEME_CONFIG.components.card.variants).toContain('card-compact')
      expect(THEME_CONFIG.components.card.backgrounds).toContain('bg-base-100')
    })

    it('has modal component configuration', () => {
      expect(THEME_CONFIG.components.modal).toHaveProperty('sizes')
      expect(THEME_CONFIG.components.modal).toHaveProperty('positions')

      expect(THEME_CONFIG.components.modal.sizes).toContain('modal-md')
      expect(THEME_CONFIG.components.modal.positions).toContain('modal-middle')
    })
  })

  describe('Spacing Configuration', () => {
    it('has spacing scale', () => {
      const expectedSpacing = {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem',
      }

      expect(THEME_CONFIG.spacing).toEqual(expectedSpacing)
    })

    it('has valid spacing values', () => {
      Object.values(THEME_CONFIG.spacing).forEach(value => {
        expect(typeof value).toBe('string')
        expect(value).toMatch(/^\d+(\.\d+)?rem$/)
      })
    })

    it('has progressive spacing scale', () => {
      const spacingValues = [
        parseFloat(THEME_CONFIG.spacing.xs),
        parseFloat(THEME_CONFIG.spacing.sm),
        parseFloat(THEME_CONFIG.spacing.md),
        parseFloat(THEME_CONFIG.spacing.lg),
        parseFloat(THEME_CONFIG.spacing.xl),
        parseFloat(THEME_CONFIG.spacing['2xl']),
      ]

      // Check that each value is larger than the previous
      for (let i = 1; i < spacingValues.length; i++) {
        expect(spacingValues[i]).toBeGreaterThan(spacingValues[i - 1])
      }
    })
  })

  describe('Border Radius Configuration', () => {
    it('has radius scale', () => {
      const expectedRadius = {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      }

      expect(THEME_CONFIG.radius).toEqual(expectedRadius)
    })

    it('has valid radius values', () => {
      Object.entries(THEME_CONFIG.radius).forEach(([key, value]) => {
        expect(typeof value).toBe('string')
        if (key === 'none') {
          expect(value).toBe('0')
        } else if (key === 'full') {
          expect(value).toBe('9999px')
        } else {
          expect(value).toMatch(/^\d+(\.\d+)?rem$/)
        }
      })
    })
  })

  describe('Type Definitions', () => {
    it('exports correct TypeScript types', () => {
      // These tests verify that the types are properly exported
      // and can be used (compilation test)
      const themeName: ThemeName = 'pastel'
      const themeCategory: ThemeCategory = 'light'
      const componentSize: ComponentSize = 'btn-md'
      const componentVariant: ComponentVariant = 'btn-primary'
      const componentStyle: ComponentStyle = 'btn-outline'

      expect(typeof themeName).toBe('string')
      expect(typeof themeCategory).toBe('string')
      expect(typeof componentSize).toBe('string')
      expect(typeof componentVariant).toBe('string')
      expect(typeof componentStyle).toBe('string')
    })
  })

  describe('Utility Functions', () => {
    describe('getThemesByCategory', () => {
      it('returns light themes for light category', () => {
        const lightThemes = getThemesByCategory('light')
        expect(lightThemes).toEqual(THEME_CONFIG.categories.light)
        expect(lightThemes).toContain('light')
        expect(lightThemes).toContain('pastel')
      })

      it('returns dark themes for dark category', () => {
        const darkThemes = getThemesByCategory('dark')
        expect(darkThemes).toEqual(THEME_CONFIG.categories.dark)
        expect(darkThemes).toContain('dark')
        expect(darkThemes).toContain('synthwave')
      })

      it('returns readonly arrays', () => {
        const themes = getThemesByCategory('light')
        expect(Object.isFrozen(themes)).toBe(true)
      })
    })

    describe('isLightTheme', () => {
      it('returns true for light themes', () => {
        expect(isLightTheme('light')).toBe(true)
        expect(isLightTheme('pastel')).toBe(true)
        expect(isLightTheme('cupcake')).toBe(true)
        expect(isLightTheme('bumblebee')).toBe(true)
      })

      it('returns false for dark themes', () => {
        expect(isLightTheme('dark')).toBe(false)
        expect(isLightTheme('synthwave')).toBe(false)
        expect(isLightTheme('dracula')).toBe(false)
        expect(isLightTheme('cyberpunk')).toBe(false)
      })

      it('handles all available themes correctly', () => {
        Object.keys(THEME_CONFIG.themes).forEach(theme => {
          const themeName = theme as ThemeName
          const isLight = isLightTheme(themeName)
          const isDark = isDarkTheme(themeName)

          // Each theme should be either light or dark, but not both
          expect(isLight !== isDark).toBe(true)
        })
      })
    })

    describe('isDarkTheme', () => {
      it('returns true for dark themes', () => {
        expect(isDarkTheme('dark')).toBe(true)
        expect(isDarkTheme('synthwave')).toBe(true)
        expect(isDarkTheme('dracula')).toBe(true)
        expect(isDarkTheme('cyberpunk')).toBe(true)
      })

      it('returns false for light themes', () => {
        expect(isDarkTheme('light')).toBe(false)
        expect(isDarkTheme('pastel')).toBe(false)
        expect(isDarkTheme('cupcake')).toBe(false)
        expect(isDarkTheme('bumblebee')).toBe(false)
      })

      it('is inverse of isLightTheme', () => {
        Object.keys(THEME_CONFIG.themes).forEach(theme => {
          const themeName = theme as ThemeName
          expect(isDarkTheme(themeName)).toBe(!isLightTheme(themeName))
        })
      })
    })

    describe('getDefaultTheme', () => {
      it('returns the default theme', () => {
        expect(getDefaultTheme()).toBe('pastel')
        expect(getDefaultTheme()).toBe(THEME_CONFIG.defaultTheme)
      })

      it('returns a valid theme name', () => {
        const defaultTheme = getDefaultTheme()
        expect(THEME_CONFIG.themes).toHaveProperty(defaultTheme)
      })

      it('returns a light theme by default', () => {
        const defaultTheme = getDefaultTheme()
        expect(isLightTheme(defaultTheme)).toBe(true)
      })
    })
  })

  describe('Configuration Consistency', () => {
    it('has consistent theme naming', () => {
      Object.entries(THEME_CONFIG.themes).forEach(([key, value]) => {
        expect(key).toBe(value)
      })
    })

    it('has all themes in exactly one category', () => {
      const allThemes = Object.keys(THEME_CONFIG.themes)
      const categorizedThemes = [...THEME_CONFIG.categories.light, ...THEME_CONFIG.categories.dark]

      expect(new Set(categorizedThemes).size).toBe(categorizedThemes.length) // No duplicates
      expect(categorizedThemes.sort()).toEqual(allThemes.sort())
    })

    it('has valid CSS class names in components', () => {
      // Check button sizes
      THEME_CONFIG.components.button.sizes.forEach(size => {
        expect(size).toMatch(/^btn-\w+$/)
      })

      // Check button variants
      THEME_CONFIG.components.button.variants.forEach(variant => {
        expect(variant).toMatch(/^btn-\w+$/)
      })

      // Check button styles
      THEME_CONFIG.components.button.styles.forEach(style => {
        expect(style).toMatch(/^btn-\w+$/)
      })
    })

    it('has valid CSS values for spacing and radius', () => {
      // Check spacing values
      Object.values(THEME_CONFIG.spacing).forEach(value => {
        expect(value).toMatch(/^\d+(\.\d+)?(rem|px)$/)
      })

      // Check radius values
      Object.values(THEME_CONFIG.radius).forEach(value => {
        expect(value).toMatch(/^(\d+(\.\d+)?(rem|px)|0|9999px)$/)
      })
    })

    it('has reasonable animation durations', () => {
      const { fast, normal, slow } = THEME_CONFIG.animations.duration

      expect(fast).toBeLessThan(normal)
      expect(normal).toBeLessThan(slow)
      expect(fast).toBeGreaterThan(0)
      expect(slow).toBeLessThan(2000) // Reasonable upper bound
    })

    it('has valid CSS easing functions', () => {
      const { default: defaultEasing, spring } = THEME_CONFIG.animations.easing

      expect(defaultEasing).toMatch(/^(ease|ease-in|ease-out|ease-in-out|linear)$/)
      expect(spring).toMatch(/^cubic-bezier\([\d\s,.-]+\)$/)
    })
  })

  describe('Performance and Memory', () => {
    it('uses const assertions for immutability', () => {
      // The configuration should be deeply readonly
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        THEME_CONFIG.defaultTheme = 'dark'
      }).toThrow()
    })

    it('handles rapid function calls efficiently', () => {
      const startTime = Date.now()

      for (let i = 0; i < 1000; i++) {
        getDefaultTheme()
        isLightTheme('pastel')
        isDarkTheme('dark')
        getThemesByCategory('light')
      }

      const endTime = Date.now()

      // Should complete very quickly
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('returns consistent references for arrays', () => {
      const themes1 = getThemesByCategory('light')
      const themes2 = getThemesByCategory('light')

      expect(themes1).toBe(themes2) // Same reference
    })
  })
})
