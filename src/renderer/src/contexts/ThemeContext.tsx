import { createContext, useEffect, useMemo, useState } from 'react'
import { Theme } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import baseTheme from '../theme'

export type ThemeMode = 'light' | 'dark'

export type ThemeContextValue = {
  mode: ThemeMode
  toggleTheme: () => void
}

function createAppTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: baseTheme.palette.primary,
      secondary: baseTheme.palette.secondary
    }
  })
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function AppThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    const stored = window.localStorage.getItem('theme_mode') as ThemeMode | null
    if (stored === 'light' || stored === 'dark') setMode(stored)
  }, [])

  const toggleTheme = (): void => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem('theme_mode', next)
      return next
    })
  }

  const value = useMemo(() => ({ mode, toggleTheme }), [mode])
  const theme = useMemo(() => createAppTheme(mode), [mode])

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
