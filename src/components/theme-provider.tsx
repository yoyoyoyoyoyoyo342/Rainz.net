import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  isNightTime?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  userPreferredTheme: Theme
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  userPreferredTheme: "system",
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  isNightTime = false,
  ...props
}: ThemeProviderProps) {
  // Store user's preferred theme separately - default to dark if no preference stored
  const [userPreferredTheme, setUserPreferredTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey) as Theme;
    // If nothing stored, set dark as default and save it
    if (!stored) {
      localStorage.setItem(storageKey, "dark");
      return "dark";
    }
    return stored;
  })
  
  // Active theme (may be overridden by night mode)
  const [theme, setTheme] = useState<Theme>(userPreferredTheme)

  // Override theme to dark when it's night time
  useEffect(() => {
    if (isNightTime) {
      setTheme("dark")
    } else {
      setTheme(userPreferredTheme)
    }
  }, [isNightTime, userPreferredTheme])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    userPreferredTheme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setUserPreferredTheme(newTheme)
      // If not night time, apply immediately
      if (!isNightTime) {
        setTheme(newTheme)
      }
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}