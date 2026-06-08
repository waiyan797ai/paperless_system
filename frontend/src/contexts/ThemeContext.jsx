import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

function getInitialTheme() {
  const stored = localStorage.getItem('oms_theme')
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('oms_theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const isDark = theme === 'dark'

  const value = useMemo(
    () => ({ theme, isDark, setTheme, toggleTheme }),
    [theme, isDark, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}
