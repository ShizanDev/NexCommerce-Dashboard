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

  // Hydration-safe placeholder — same dimensions to prevent layout shift
  if (!mounted) {
    return (
      <div
        className={cn(
          'relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full',
          'bg-muted',
          className
        )}
        aria-label="Toggle theme"
      >
        <span className="sr-only">Toggle theme</span>
        <span className="pointer-events-none block h-[22px] w-[22px] rounded-full bg-background shadow-sm ml-0.5" />
      </div>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full',
        'transition-all duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark
          ? 'bg-primary shadow-sm shadow-primary/25'
          : 'bg-muted-foreground/20 hover:bg-muted-foreground/30',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="sr-only">Switch to {isDark ? 'light' : 'dark'} mode</span>

      {/* Switch Track — subtle inner highlight */}
      <span className="absolute inset-0 rounded-full opacity-100 pointer-events-none" />

      {/* Thumb with embedded icon */}
      <span
        className={cn(
          'pointer-events-none relative flex items-center justify-center',
          'rounded-full shadow-md',
          'transition-all duration-200 ease-in-out',
          'h-[22px] w-[22px]',
          isDark
            ? 'translate-x-[26px] bg-primary-foreground'
            : 'translate-x-[3px] bg-background',
        )}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-primary" strokeWidth={2.5} />
        ) : (
          <Sun className="h-3 w-3 text-amber-500" strokeWidth={2.5} />
        )}
      </span>

      {/* Background hint icon (opposite side, faded) */}
      {isDark ? (
        <Sun className="pointer-events-none absolute left-1.5 h-3 w-3 text-primary-foreground/30" />
      ) : (
        <Moon className="pointer-events-none absolute right-1.5 h-3 w-3 text-muted-foreground/50" />
      )}
    </button>
  )
}
