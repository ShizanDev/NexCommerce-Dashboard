'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return mounted
}

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const mounted = useMounted()

  const isDark = mounted && resolvedTheme === 'dark'

  function toggleTheme() {
    setTheme(isDark ? 'light' : 'dark')
  }

  // Hydration-safe placeholder
  if (!mounted) {
    return (
      <button
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out',
          'bg-muted',
          className
        )}
        aria-label="Toggle theme"
      >
        <span className="sr-only">Toggle theme</span>
        <span className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200" />
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark
          ? 'bg-primary'
          : 'bg-muted hover:bg-muted/80',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="sr-only">Toggle theme</span>

      {/* Sun icon — visible in light mode (left side) */}
      <Sun
        className={cn(
          'pointer-events-none absolute left-1 h-3.5 w-3.5 transition-opacity duration-200',
          isDark ? 'opacity-0' : 'opacity-60'
        )}
      />

      {/* Moon icon — visible in dark mode (right side) */}
      <Moon
        className={cn(
          'pointer-events-none absolute right-1 h-3.5 w-3.5 transition-opacity duration-200',
          isDark ? 'opacity-80' : 'opacity-0'
        )}
      />

      {/* Thumb */}
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full',
          'bg-background shadow-sm ring-0',
          'transition-transform duration-200 ease-in-out',
          isDark ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
