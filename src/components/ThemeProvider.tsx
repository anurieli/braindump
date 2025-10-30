'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'

interface ThemeProviderProps {
  children: React.ReactNode
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useStore(state => state.theme)

  useEffect(() => {
    // Apply theme class to html element for Tailwind dark mode
    const htmlElement = document.documentElement
    
    if (theme === 'dark') {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
    
    // Store theme preference in localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  // Initialize theme from localStorage on first load
  useEffect(() => {
    const setTheme = useStore.getState().setTheme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // If no saved preference, detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }, [])

  return <>{children}</>
}