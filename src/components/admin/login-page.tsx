'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck,
  AlertCircle, CheckCircle2, XCircle, Info, KeyRound,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────

type AuthStep = 'login-form' | 'login-otp' | 'signup-form' | 'signup-otp' | 'forgot-email' | 'forgot-otp' | 'forgot-reset'

interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  id: number
}

// ─── Password strength ────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string; width: string } {
  if (!password) return { score: 0, label: '', color: '', width: 'w-0' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 6 && /\d/.test(password)) score++
  if (password.length >= 6 && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)) score++
  if (password.length < 6) score = 1

  const map: Record<number, { label: string; color: string; width: string }> = {
    0: { label: '', color: '', width: 'w-0' },
    1: { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' },
    2: { label: 'Fair', color: 'bg-orange-500', width: 'w-2/4' },
    3: { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' },
    4: { label: 'Strong', color: 'bg-green-500', width: 'w-full' },
  }
  const m = map[score] || map[1]
  return { score, ...m }
}

// ─── Custom Toast Component ──────────────────────────────────────

function ThemedToast({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null

  const styleMap = {
    success: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, iconColor: 'text-emerald-600 dark:text-emerald-400', titleColor: 'text-emerald-800 dark:text-emerald-200' },
    error:   { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: XCircle, iconColor: 'text-red-600 dark:text-red-400', titleColor: 'text-red-800 dark:text-red-200' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: AlertCircle, iconColor: 'text-amber-600 dark:text-amber-400', titleColor: 'text-amber-800 dark:text-amber-200' },
    info:    { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: Info, iconColor: 'text-blue-600 dark:text-blue-400', titleColor: 'text-blue-800 dark:text-blue-200' },
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const s = styleMap[t.type]
        const Icon = s.icon
        return (
          <div
            key={t.id}
            className={`rounded-lg border p-3 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200 ${s.bg} ${s.border}`}
          >
            <div className="flex gap-2.5 items-start">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${s.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${s.titleColor}`}>{t.title}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss(t.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Google SVG Icon ────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ─── Or Divider ──────────────────────────────────────────────────

function OrDivider() {
  return (
    <div className="relative flex items-center gap-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ─── Form Error Banner ────────────────────────────────────────────

function FormErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800/50 dark:bg-red-950/20">
      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
    </div>
  )
}

// ─── Sandbox Banner ────────────────────────────────────────────

function SandboxBanner({ otp, detail }: { otp: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Code: <span className="font-mono font-bold text-amber-800 dark:text-amber-200 tracking-widest">{otp}</span>
        </p>
        {detail && <p className="text-xs text-amber-500 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// ─── MAIN LOGIN PAGE ─────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════

export function LoginPage() {
  const [step, setStep] = useState<AuthStep>('login-form')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [formError, setFormError] = useState('')
  const { setLoggedIn } = useAppStore()

  // Transition system
  const [transitioning, setTransitioning] = useState(false)
  const [displayStep, setDisplayStep] = useState<AuthStep>(step)

  useEffect(() => {
    if (step !== displayStep) {
      setTransitioning(true)
      const timer = setTimeout(() => {
        setDisplayStep(step)
        setTransitioning(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [step, displayStep])

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastIdRef = useRef(0)

  // Signup
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [signupOtp, setSignupOtp] = useState('')

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginOtp, setLoginOtp] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // OTP
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpSentEmail, setOtpSentEmail] = useState('')
  const [isSandboxMode, setIsSandboxMode] = useState(false)
  const [sandboxOtp, setSandboxOtp] = useState('')
  const [emailErrorDetail, setEmailErrorDetail] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
  const [forgotFormError, setForgotFormError] = useState('')

  // ─── Toast helpers ──────────────────────────────────────────────

  const showToast = (type: ToastMessage['type'], title: string, description?: string, duration = 5000) => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { type, title, description, id }])
    if (duration > 0) setTimeout(() => dismissToast(id), duration)
  }

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // ─── Cooldown ─────────────────────────────────────────────────

  useEffect(() => {
    if (otpCooldown > 0) {
      timerRef.current = setInterval(() => {
        setOtpCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [otpCooldown])

  // ─── Session ──────────────────────────────────────────────────

  function handleAuthSuccess(user: { id: string; email: string; name: string; role: string }, isNewUser: boolean) {
    localStorage.removeItem('wc_dashboard_session')
    const expiryMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const session = {
      isLoggedIn: true,
      name: user.name,
      email: user.email,
      id: user.id,
      role: user.role,
      expiresAt: Date.now() + expiryMs,
      rememberMe,
    }
    localStorage.setItem('wc_dashboard_session', JSON.stringify(session))
    setLoggedIn(true, user.name, user.id, user.role)
    if (isNewUser) showToast('success', `Welcome, ${user.name}!`, 'Your account has been created.', 4000)
    else showToast('success', `Welcome back, ${user.name}!`, 3000)
  }

  // ─── OTP Send ──────────────────────────────────────────────────

  async function sendOtp(email: string, purpose: 'signup' | 'login') {
    setLoading(true)
    setLoadingMessage('Sending code...')
    setEmailErrorDetail('')
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email, purpose }),
      })
      const data = await res.json()

      if (data.success) {
        setOtpSentEmail(email)
        setOtpCooldown(60)
        if (data.sandboxMode && data.otp) {
          setIsSandboxMode(true)
          setSandboxOtp(data.otp)
          setEmailErrorDetail(data.emailErrorDetail || '')
        } else {
          setIsSandboxMode(false)
          setSandboxOtp('')
          setEmailErrorDetail('')
          showToast('success', 'OTP sent', `Check ${email}`, 6000)
        }
        return true
      } else {
        const errMap: Record<number, { title: string; desc: string }> = {
          429: { title: 'Too many requests', desc: data.error || 'Wait before requesting again.' },
          409: { title: 'Account exists', desc: 'Please sign in instead.' },
          404: { title: 'Not found', desc: 'Please create an account first.' },
        }
        const err = errMap[res.status] || { title: 'Failed to send OTP', desc: data.error || 'Please try again.' }
        showToast('error', err.title, err.desc)
        return false
      }
    } catch {
      showToast('error', 'Network error', 'Please try again.')
      return false
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ─── Forgot Password: Send Reset Code ──────────────────────────

  async function handleForgotEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForgotFormError('')
    setLoading(true)
    setLoadingMessage('Sending reset code...')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpSentEmail(forgotEmail)
        setOtpCooldown(60)
        if (data.sandboxMode && data.otp) {
          setIsSandboxMode(true)
          setSandboxOtp(data.otp)
          setEmailErrorDetail(data.emailErrorDetail || '')
        } else {
          setIsSandboxMode(false)
          setSandboxOtp('')
          setEmailErrorDetail('')
          showToast('success', 'Reset code sent', `Check ${forgotEmail}`, 6000)
        }
        setStep('forgot-otp')
      } else {
        const errMap: Record<number, { title: string; desc: string }> = {
          429: { title: 'Too many requests', desc: data.error || 'Wait before requesting again.' },
          404: { title: 'Not found', desc: 'No account found with this email.' },
        }
        const err = errMap[res.status] || { title: 'Failed to send code', desc: data.error || 'Please try again.' }
        showToast('error', err.title, err.desc)
      }
    } catch {
      showToast('error', 'Network error', 'Please try again.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ─── Forgot Password: Resend Reset Code ─────────────────────────

  async function resendForgotOtp() {
    setLoading(true)
    setLoadingMessage('Sending reset code...')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpCooldown(60)
        if (data.sandboxMode && data.otp) {
          setIsSandboxMode(true)
          setSandboxOtp(data.otp)
          setEmailErrorDetail(data.emailErrorDetail || '')
        } else {
          setIsSandboxMode(false)
          setSandboxOtp('')
          setEmailErrorDetail('')
          showToast('success', 'Reset code resent', `Check ${forgotEmail}`, 6000)
        }
      } else {
        const errMap: Record<number, { title: string; desc: string }> = {
          429: { title: 'Too many requests', desc: data.error || 'Wait before requesting again.' },
          404: { title: 'Not found', desc: 'No account found with this email.' },
        }
        const err = errMap[res.status] || { title: 'Failed to resend', desc: data.error || 'Please try again.' }
        showToast('error', err.title, err.desc)
      }
    } catch {
      showToast('error', 'Network error', 'Please try again.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ─── Forgot Password: OTP Complete → go to reset ──────────────

  function handleForgotOtpComplete() {
    if (forgotOtp.length !== 6) return
    setForgotFormError('')
    setStep('forgot-reset')
  }

  // ─── Forgot Password: Reset Password ──────────────────────────

  async function handleForgotResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForgotFormError('')
    if (forgotNewPassword.length < 6) {
      setForgotFormError('Password must be at least 6 characters.')
      return
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotFormError('Passwords do not match')
      return
    }
    setLoading(true)
    setLoadingMessage('Updating password...')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Password reset successful!', 'Please sign in with your new password.', 6000)
        // Brief success state then redirect to login
        setTimeout(() => {
          goBackToLogin()
        }, 500)
      } else {
        const errMap: Record<number, { title: string; desc: string }> = {
          400: { title: 'Invalid request', desc: data.error || 'Please check your inputs.' },
          429: { title: 'Too many requests', desc: 'Wait before trying again.' },
        }
        const err = errMap[res.status] || { title: 'Reset failed', desc: data.error || 'Please try again.' }
        showToast('error', err.title, err.desc)
      }
    } catch {
      showToast('error', 'Network error', 'Please try again.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ─── Login submit ──────────────────────────────────────────────

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    setLoadingMessage('Verifying credentials...')
    try {
      const checkRes = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const checkData = await checkRes.json()
      if (!checkData.success) {
        setFormError(checkData.error || 'Invalid credentials.')
        setLoading(false)
        setLoadingMessage('')
        return
      }
    } catch {
      setFormError('Network error.')
      setLoading(false)
      setLoadingMessage('')
      return
    }
    setLoading(false)
    setLoadingMessage('')
    const sent = await sendOtp(loginEmail, 'login')
    if (sent) setStep('login-otp')
  }

  // ─── Login OTP ──────────────────────────────────────────────────

  async function handleLoginOtpComplete() {
    if (loginOtp.length !== 6) return
    setLoading(true)
    setLoadingMessage('Verifying code...')
    setFormError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, otp: loginOtp }),
      })
      const data = await res.json()
      if (data.success) handleAuthSuccess(data.user, false)
      else setFormError(data.error || 'Login failed.')
    } catch {
      setFormError('Network error.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ─── Signup submit ─────────────────────────────────────────────

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (signupName.trim().length < 2) { setFormError('Enter your full name.'); return }
    if (signupPassword.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    if (signupPassword !== signupConfirmPassword) { setFormError('Passwords do not match.'); return }
    setLoading(true)
    setLoadingMessage('Creating account...')
    const sent = await sendOtp(signupEmail, 'signup')
    if (!sent) {
      setLoading(false)
      setLoadingMessage('')
    }
    if (sent) setStep('signup-otp')
  }

  // ─── Signup OTP ────────────────────────────────────────────────

  async function handleSignupOtpComplete() {
    if (signupOtp.length !== 6) return
    setLoading(true)
    setLoadingMessage('Creating account...')
    setFormError('')
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail, password: signupPassword, name: signupName, otp: signupOtp }),
      })
      const data = await res.json()
      if (data.success) handleAuthSuccess(data.user, true)
      else {
        if (data.userExists) {
          showToast('error', 'Account exists', 'Please sign in instead.')
          setStep('login-form'); setLoginEmail(signupEmail)
        } else setFormError(data.error || 'Signup failed.')
      }
    } catch {
      setFormError('Network error.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ─── Google ────────────────────────────────────────────────────

  function handleGoogleLogin() {
    showToast('info', 'Google Sign-In', 'Coming soon. Use email + password for now.', 6000)
  }

  // ─── Navigation ────────────────────────────────────────────────

  const goBack = () => {
    setIsSandboxMode(false); setSandboxOtp(''); setEmailErrorDetail(''); setFormError(''); setForgotFormError('')
    if (step === 'signup-form') setStep('login-form')
    else if (step === 'signup-otp') setStep('signup-form')
    else if (step === 'login-otp') setStep('login-form')
    else if (step === 'forgot-email') setStep('login-form')
    else if (step === 'forgot-otp') setStep('forgot-email')
    else if (step === 'forgot-reset') setStep('forgot-email')
  }

  function switchToSignup() {
    setStep('signup-form')
    setLoginEmail(''); setLoginPassword(''); setLoginOtp('')
    setIsSandboxMode(false); setSandboxOtp(''); setFormError('')
  }

  function switchToLogin() {
    setStep('login-form')
    setSignupName(''); setSignupEmail(''); setSignupPassword(''); setSignupConfirmPassword(''); setSignupOtp('')
    setIsSandboxMode(false); setSandboxOtp(''); setFormError('')
  }

  function goToForgotPassword() {
    setStep('forgot-email')
    setLoginEmail(''); setLoginPassword(''); setLoginOtp('')
    setIsSandboxMode(false); setSandboxOtp(''); setFormError('')
    setForgotEmail(loginEmail)
  }

  function goBackToLogin() {
    setStep('login-form')
    setForgotEmail(''); setForgotOtp(''); setForgotNewPassword(''); setForgotConfirmPassword('')
    setIsSandboxMode(false); setSandboxOtp(''); setFormError(''); setForgotFormError('')
  }

  // ─── Password strength for forgot reset ──────────────────────

  const pwdStrength = getPasswordStrength(forgotNewPassword)

  // ═════════════════════════════════════════════════════════════════
  // ─── RENDER ─────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  const inputClass = "pl-10 h-11 rounded-lg border-border bg-background text-sm focus:border-primary focus:ring-primary/20"
  const btnPrimary = "w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[15px] shadow-md shadow-primary/20 transition-all"
  const linkClass = "text-primary hover:text-primary/80 font-medium transition-colors"

  return (
    <div className="min-h-screen flex p-3 sm:p-4 lg:p-[15px] bg-background">
      <ThemedToast toasts={toasts} onDismiss={dismissToast} />

      {/* ═══════ LEFT: Form Panel ═══════ */}
      <div className="w-full lg:w-1/2 flex flex-col bg-background">

        {/* Logo pinned at top */}
        <div className="flex-shrink-0 flex justify-center px-6 sm:px-10 lg:px-16 pt-6 sm:pt-8 lg:pt-8 pb-2">
          <div className="w-full max-w-[400px]">
            <img src="/logo.png" alt="NexCommerce" className="h-8 sm:h-9 w-auto object-contain" />
          </div>
        </div>

        {/* Form centered in remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* ═══════ Transition wrapper ═══════ */}
          <div className="relative overflow-hidden">

            {/* Loading overlay */}
            {loading && !transitioning && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg z-10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{loadingMessage || 'Loading...'}</span>
                </div>
              </div>
            )}

            <div className={cn(
              "transition-all duration-200 ease-in-out",
              transitioning ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
            )}>

              {/* ─── LOGIN FORM ─── */}
              {displayStep === 'login-form' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-[24px] font-bold text-foreground leading-tight">Welcome back</h2>
                    <p className="text-sm text-muted-foreground mt-1.5">Sign in to access your dashboard</p>
                  </div>

                  <FormErrorBanner message={formError} />

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-medium text-foreground/70">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="login-email" type="email" placeholder="admin@store.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} required />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground/70">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="login-password" type={showLoginPassword ? 'text' : 'password'} placeholder="Enter password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputClass + ' pr-10'} required />
                      <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me + Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4" />
                      <span className="text-sm text-muted-foreground">Remember me</span>
                    </label>
                    <button type="button" onClick={goToForgotPassword} className={linkClass + " text-sm"}>
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit */}
                  <Button type="submit" className={btnPrimary} disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : 'Sign In'}
                  </Button>

                  <OrDivider />

                  {/* Google */}
                  <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-border bg-card hover:bg-accent text-foreground font-medium text-sm transition-colors">
                    <GoogleIcon className="h-5 w-5" /> Google
                  </button>

                  {/* Footer link */}
                  <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={switchToSignup} className={linkClass}>Sign Up</button>
                  </p>
                </form>
              )}

              {/* ─── LOGIN OTP ─── */}
              {displayStep === 'login-otp' && (
                <div className="space-y-6">
                  <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div className="space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-foreground">Verify OTP</h2>
                      <p className="text-sm text-muted-foreground mt-1">Code sent to <span className="font-medium text-foreground/70">{otpSentEmail}</span></p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={loginOtp} onChange={setLoginOtp} onComplete={handleLoginOtpComplete}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <FormErrorBanner message={formError} />
                  {isSandboxMode && sandboxOtp && <SandboxBanner otp={sandboxOtp} detail={emailErrorDetail} />}

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </div>
                  )}

                  <div className="text-center">
                    {otpCooldown > 0 ? (
                      <p className="text-sm text-muted-foreground">Resend in <span className="font-medium text-primary">{otpCooldown}s</span></p>
                    ) : (
                      <button type="button" onClick={() => sendOtp(loginEmail, 'login')} className={`text-sm ${linkClass}`}>
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── SIGNUP FORM ─── */}
              {displayStep === 'signup-form' && (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-[24px] font-bold text-foreground leading-tight">Create account</h2>
                    <p className="text-sm text-muted-foreground mt-1.5">Get started with your free NexCommerce store</p>
                  </div>

                  <FormErrorBanner message={formError} />

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-foreground/70">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="signup-name" type="text" placeholder="Your full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className={inputClass} required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground/70">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="signup-email" type="email" placeholder="admin@store.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className={inputClass} required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground/70">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="signup-password" type={showSignupPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className={inputClass + ' pr-10'} required />
                      <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-confirm" className="text-sm font-medium text-foreground/70">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="signup-confirm" type="password" placeholder="Confirm password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className={inputClass} required />
                    </div>
                  </div>

                  <Button type="submit" className={btnPrimary} disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending OTP...</> : 'Sign Up'}
                  </Button>

                  <OrDivider />

                  <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-border bg-card hover:bg-accent text-foreground font-medium text-sm transition-colors">
                    <GoogleIcon className="h-5 w-5" /> Google
                  </button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button type="button" onClick={switchToLogin} className={linkClass}>Sign In</button>
                  </p>
                </form>
              )}

              {/* ─── SIGNUP OTP ─── */}
              {displayStep === 'signup-otp' && (
                <div className="space-y-6">
                  <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div className="space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-foreground">Verify Email</h2>
                      <p className="text-sm text-muted-foreground mt-1">Code sent to <span className="font-medium text-foreground/70">{otpSentEmail}</span></p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={signupOtp} onChange={setSignupOtp} onComplete={handleSignupOtpComplete}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <FormErrorBanner message={formError} />
                  {isSandboxMode && sandboxOtp && <SandboxBanner otp={sandboxOtp} detail={emailErrorDetail} />}

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                    </div>
                  )}

                  <div className="text-center">
                    {otpCooldown > 0 ? (
                      <p className="text-sm text-muted-foreground">Resend in <span className="font-medium text-primary">{otpCooldown}s</span></p>
                    ) : (
                      <button type="button" onClick={() => sendOtp(signupEmail, 'signup')} className={`text-sm ${linkClass}`}>
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── FORGOT EMAIL ─── */}
              {displayStep === 'forgot-email' && (
                <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
                  <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div className="space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-foreground">Forgot Password</h2>
                      <p className="text-sm text-muted-foreground mt-1">Enter your email and we&apos;ll send you a code to reset your password</p>
                    </div>
                  </div>

                  <FormErrorBanner message={formError} />
                  {isSandboxMode && sandboxOtp && <SandboxBanner otp={sandboxOtp} detail={emailErrorDetail} />}

                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email" className="text-sm font-medium text-foreground/70">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="forgot-email" type="email" placeholder="admin@store.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className={inputClass} required />
                    </div>
                  </div>

                  <Button type="submit" className={btnPrimary} disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Reset Code'}
                  </Button>
                </form>
              )}

              {/* ─── FORGOT OTP ─── */}
              {displayStep === 'forgot-otp' && (
                <div className="space-y-6">
                  <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div className="space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-foreground">Verify Code</h2>
                      <p className="text-sm text-muted-foreground mt-1">Code sent to <span className="font-medium text-foreground/70">{otpSentEmail}</span></p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={forgotOtp} onChange={setForgotOtp} onComplete={handleForgotOtpComplete}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <FormErrorBanner message={forgotFormError} />
                  {isSandboxMode && sandboxOtp && <SandboxBanner otp={sandboxOtp} detail={emailErrorDetail} />}

                  <div className="text-center">
                    {otpCooldown > 0 ? (
                      <p className="text-sm text-muted-foreground">Resend in <span className="font-medium text-primary">{otpCooldown}s</span></p>
                    ) : (
                      <button type="button" onClick={resendForgotOtp} className={`text-sm ${linkClass}`}>
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── FORGOT RESET ─── */}
              {displayStep === 'forgot-reset' && (
                <form onSubmit={handleForgotResetSubmit} className="space-y-4">
                  <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div className="space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
                      <p className="text-sm text-muted-foreground mt-1">Create a new password for your account</p>
                    </div>
                  </div>

                  <FormErrorBanner message={forgotFormError} />

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-new-password" className="text-sm font-medium text-foreground/70">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="forgot-new-password" type={showForgotNewPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} className={inputClass + ' pr-10'} required />
                      <button type="button" onClick={() => setShowForgotNewPassword(!showForgotNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {pwdStrength.score > 0 && (
                      <div className="space-y-1.5">
                        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-300", pwdStrength.color, pwdStrength.width)} />
                        </div>
                        <p className="text-xs text-muted-foreground">{pwdStrength.label}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-confirm-password" className="text-sm font-medium text-foreground/70">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="forgot-confirm-password" type="password" placeholder="Confirm new password" value={forgotConfirmPassword} onChange={(e) => setForgotConfirmPassword(e.target.value)} className={inputClass} required />
                    </div>
                    {/* Inline validation for confirm password */}
                    {forgotConfirmPassword.length > 0 && forgotNewPassword !== forgotConfirmPassword && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>

                  <Button type="submit" className={btnPrimary} disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Reset Password'}
                  </Button>
                </form>
              )}

            </div>
          </div>

        </div>
        </div>

        {/* Copyright - always pinned to bottom */}
        <div className="flex-shrink-0 text-center pb-4 sm:pb-5 lg:pb-6">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} NexCommerce. All rights reserved.
          </p>
        </div>
      </div>

      {/* ═══════ RIGHT: Hero Panel ═══════ */}
      <div className="hidden lg:flex w-1/2 flex-col items-start justify-center p-8 xl:p-[50px] relative overflow-hidden bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] rounded-[10px]">
        {/* Ambient glow */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full flex flex-col items-start">
          {/* Title */}
          <h2 className="text-[28px] lg:text-[34px] xl:text-[42px] font-bold text-white text-left leading-[1.2] lg:leading-[1.25] mb-4 tracking-tight">
            The smarter way to manage your WooCommerce store.
          </h2>
          <p className="text-white/75 text-left text-sm lg:text-base xl:text-lg leading-relaxed mb-8 max-w-lg">
            NexCommerce gives you complete control over products, orders, analytics, and customer experience — all from one powerful dashboard built for modern commerce.
          </p>

          {/* Illustration */}
          <div className="w-full flex-1 min-h-0 flex items-center justify-center">
            <img
              src="/login-illustration.png"
              alt="NexCommerce Dashboard"
              className="w-[90%] xl:w-[95%] h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
