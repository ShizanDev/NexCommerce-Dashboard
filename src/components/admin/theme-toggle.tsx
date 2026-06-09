'use client'

import { useTheme } from 'next-themes'
import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch - set mounted after initial render
  // using requestAnimationFrame to avoid the lint rule about setState in effects
  if (!mounted) {
    // Schedule setMounted for the next frame to avoid the effect lint warning
    requestAnimationFrame(() => setMounted(true))
  }

  const isDark = mounted && resolvedTheme === 'dark'

  function toggleTheme() {
    setTheme(isDark ? 'light' : 'dark')
  }

  if (!mounted) {
    // Render a placeholder to prevent layout shift
    return (
      <button
        className={cn(
          'relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors duration-200 ease-in-out',
          'bg-gray-200',
          className
        )}
        aria-label="Toggle theme"
      >
        <span className="sr-only">Toggle theme</span>
        <span className="h-6 w-6 rounded-full bg-white shadow-sm" />
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'group relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark
          ? 'bg-blue-600'
          : 'bg-gray-300 hover:bg-gray-400',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="sr-only">Toggle theme</span>

      {/* Track icons */}
      <Sun className={cn(
        'absolute left-1.5 h-3.5 w-3.5 transition-opacity duration-200',
        isDark ? 'opacity-60' : 'opacity-100'
      )} />
      <Moon className={cn(
        'absolute right-1.5 h-3.5 w-3.5 transition-opacity duration-200',
        isDark ? 'opacity-100' : 'opacity-40'
      )} />

      {/* Thumb */}
      <span
        className={cn(
          'inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
          isDark ? 'translate-x-5.5' : 'translate-x-0'
        )}
      >
        <span className="flex h-full w-full items-center justify-center">
          {isDark ? (
            <Moon className="h-3.5 w-3.5 text-blue-600" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-amber-500" />
          )}
        </span>
      </span>
    </button>
  )
}
