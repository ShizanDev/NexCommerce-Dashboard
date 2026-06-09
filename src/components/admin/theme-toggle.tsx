'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useCallback } from 'react'
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
  const [isAnimating, setIsAnimating] = useState(false)

  const isDark = mounted && resolvedTheme === 'dark'

  const toggleTheme = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    setTheme(isDark ? 'light' : 'dark')
    setTimeout(() => setIsAnimating(false), 300)
  }, [isDark, setTheme, isAnimating])

  // Hydration-safe placeholder — same dimensions to prevent layout shift
  if (!mounted) {
    return (
      <div
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg',
          'bg-muted/50',
          className
        )}
        aria-label="Toggle theme"
      >
        <span className="sr-only">Toggle theme</span>
        <Sun className="h-4 w-4 text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg',
        'transition-all duration-200 ease-in-out',
        'hover:bg-accent active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark && 'hover:bg-white/10',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="sr-only">Switch to {isDark ? 'light' : 'dark'} mode</span>

      {/* Sun icon — visible in light mode, hidden in dark */}
      <Sun
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-200 ease-in-out',
          isDark
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100 text-amber-500'
        )}
        strokeWidth={2}
      />

      {/* Moon icon — visible in dark mode, hidden in light */}
      <Moon
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-200 ease-in-out',
          isDark
            ? 'rotate-0 scale-100 opacity-100 text-blue-400'
            : '-rotate-90 scale-0 opacity-0'
        )}
        strokeWidth={2}
      />
    </button>
  )
}
