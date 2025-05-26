'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

// Available DaisyUI themes
export type ThemeName = 
  | 'pastel' | 'light' | 'dark' | 'cupcake' | 'bumblebee' | 'emerald'
  | 'corporate' | 'synthwave' | 'retro' | 'cyberpunk' | 'valentine'
  | 'halloween' | 'garden' | 'forest' | 'aqua' | 'lofi' | 'fantasy'
  | 'wireframe' | 'black' | 'luxury' | 'dracula'

interface ThemeContextType {
  currentTheme: ThemeName
  setTheme: (theme: ThemeName) => void
  isLight: boolean
  isDark: boolean
  toggleTheme: () => void
  availableThemes: ThemeName[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'cineai-theme'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeName
}

// Light themes for theme toggling
const lightThemes: ThemeName[] = ['light', 'pastel', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'valentine', 'garden', 'lofi', 'fantasy', 'wireframe']

// Dark themes
const darkThemes: ThemeName[] = ['dark', 'synthwave', 'retro', 'cyberpunk', 'halloween', 'forest', 'aqua', 'black', 'luxury', 'dracula']

export function ThemeProvider({ children, defaultTheme = 'pastel' }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(defaultTheme)

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName
      if (savedTheme) {
        setCurrentTheme(savedTheme)
      }
    }
  }, [])

  // Apply theme to document and save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme)
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme)
    }
  }, [currentTheme])

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme)
  }

  const isLight = lightThemes.includes(currentTheme)
  const isDark = darkThemes.includes(currentTheme)

  const toggleTheme = () => {
    const newTheme = isLight ? 'dark' : 'pastel'
    setTheme(newTheme)
  }

  const availableThemes: ThemeName[] = [
    'pastel', 'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 
    'corporate', 'synthwave', 'retro', 'cyberpunk', 'valentine', 
    'halloween', 'garden', 'forest', 'aqua', 'lofi', 'fantasy', 
    'wireframe', 'black', 'luxury', 'dracula'
  ]

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    isLight,
    isDark,
    toggleTheme,
    availableThemes,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 