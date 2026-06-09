'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck,
  AlertCircle, CheckCircle2, XCircle, Info,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { useAppStore } from '@/stores/app-store'

// ─── Types ──────────────────────────────────────────────────────

type AuthStep = 'login-form' | 'login-otp' | 'signup-form' | 'signup-otp'

interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  id: number
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
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
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
  const [formError, setFormError] = useState('')
  const { setLoggedIn } = useAppStore()

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
    const expiryMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined
    const session = {
      isLoggedIn: true,
      name: user.name,
      email: user.email,
      id: user.id,
      role: user.role,
      ...(expiryMs && { expiresAt: Date.now() + expiryMs, rememberMe: true }),
    }
    localStorage.setItem('wc_dashboard_session', JSON.stringify(session))
    setLoggedIn(true, user.name, user.id, user.role)
    if (isNewUser) showToast('success', `Welcome, ${user.name}!`, 'Your account has been created.', 4000)
    else showToast('success', `Welcome back, ${user.name}!`, 3000)
  }

  // ─── OTP Send ──────────────────────────────────────────────────

  async function sendOtp(email: string, purpose: 'signup' | 'login') {
    setLoading(true)
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
    }
  }

  // ─── Login submit ──────────────────────────────────────────────

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setLoading(true)
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
        return
      }
    } catch {
      setFormError('Network error.')
      setLoading(false)
      return
    }
    setLoading(false)
    const sent = await sendOtp(loginEmail, 'login')
    if (sent) setStep('login-otp')
  }

  // ─── Login OTP ──────────────────────────────────────────────────

  async function handleLoginOtpComplete() {
    if (loginOtp.length !== 6) return
    setLoading(true)
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
    }
  }

  // ─── Signup submit ─────────────────────────────────────────────

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (signupName.trim().length < 2) { setFormError('Enter your full name.'); return }
    if (signupPassword.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    if (signupPassword !== signupConfirmPassword) { setFormError('Passwords do not match.'); return }
    const sent = await sendOtp(signupEmail, 'signup')
    if (sent) setStep('signup-otp')
  }

  // ─── Signup OTP ────────────────────────────────────────────────

  async function handleSignupOtpComplete() {
    if (signupOtp.length !== 6) return
    setLoading(true)
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
    }
  }

  // ─── Google ────────────────────────────────────────────────────

  function handleGoogleLogin() {
    showToast('info', 'Google Sign-In', 'Coming soon. Use email + password for now.', 6000)
  }

  // ─── Navigation ────────────────────────────────────────────────

  const goBack = () => {
    setIsSandboxMode(false); setSandboxOtp(''); setEmailErrorDetail(''); setFormError('')
    if (step === 'signup-form') setStep('login-form')
    else if (step === 'signup-otp') setStep('signup-form')
    else if (step === 'login-otp') setStep('login-form')
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

  // ═════════════════════════════════════════════════════════════════
  // ─── RENDER ─────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  const inputClass = "pl-10 h-11 rounded-lg border-[#E2E8F0] bg-[#F8FAFC] dark:border-gray-700 dark:bg-gray-900/50 text-sm focus:border-[#3B82F6] focus:ring-[#3B82F6]/20"
  const btnPrimary = "w-full h-11 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium text-[15px] shadow-md shadow-blue-500/20 transition-all"
  const linkClass = "text-[#3B82F6] hover:text-[#2563EB] font-medium transition-colors"

  return (
    <div className="min-h-screen flex p-[15px] bg-white dark:bg-slate-950">
      <ThemedToast toasts={toasts} onDismiss={dismissToast} />

      {/* ═══════ LEFT: Form Panel ═══════ */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 sm:px-12 lg:px-16 bg-white dark:bg-slate-950 relative">
        <div className="w-full max-w-[400px] py-10 lg:py-0">

          {/* Logo */}
          <div className="mb-8">
            <img src="/logo.png" alt="NexCommerce" className="h-8 w-auto object-contain" />
          </div>

          {/* ─── LOGIN FORM ─── */}
          {step === 'login-form' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-[24px] font-bold text-gray-900 dark:text-gray-100 leading-tight">Welcome back</h2>
              </div>

              <FormErrorBanner message={formError} />

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="login-email" type="email" placeholder="admin@store.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} required />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="login-password" type={showLoginPassword ? 'text' : 'password'} placeholder="Enter password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputClass + ' pr-10'} required />
                  <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)} className="data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6] h-4 w-4" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
              </div>

              {/* Submit */}
              <Button type="submit" className={btnPrimary} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : 'Sign In'}
              </Button>

              <OrDivider />

              {/* Google */}
              <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-300 font-medium text-sm transition-colors">
                <GoogleIcon className="h-5 w-5" /> Google
              </button>

              {/* Footer link */}
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={switchToSignup} className={linkClass}>Sign Up</button>
              </p>
            </form>
          )}

          {/* ─── LOGIN OTP ─── */}
          {step === 'login-otp' && (
            <div className="space-y-6">
              <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <ShieldCheck className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Verify OTP</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Code sent to <span className="font-medium text-gray-700 dark:text-gray-300">{otpSentEmail}</span></p>
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
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                </div>
              )}

              <div className="text-center">
                {otpCooldown > 0 ? (
                  <p className="text-sm text-gray-500">Resend in <span className="font-medium text-[#3B82F6]">{otpCooldown}s</span></p>
                ) : (
                  <button type="button" onClick={() => sendOtp(loginEmail, 'login')} className={`text-sm ${linkClass}`}>
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── SIGNUP FORM ─── */}
          {step === 'signup-form' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <h2 className="text-[24px] font-bold text-gray-900 dark:text-gray-100 leading-tight">Create account</h2>
              </div>

              <FormErrorBanner message={formError} />

              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="signup-name" type="text" placeholder="Your full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} className={inputClass} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="signup-email" type="email" placeholder="admin@store.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className={inputClass} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="signup-password" type={showSignupPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className={inputClass + ' pr-10'} required />
                  <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm" className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="signup-confirm" type="password" placeholder="Confirm password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className={inputClass} required />
                </div>
              </div>

              <Button type="submit" className={btnPrimary} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending OTP...</> : 'Sign Up'}
              </Button>

              <OrDivider />

              <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-300 font-medium text-sm transition-colors">
                <GoogleIcon className="h-5 w-5" /> Google
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <button type="button" onClick={switchToLogin} className={linkClass}>Sign In</button>
              </p>
            </form>
          )}

          {/* ─── SIGNUP OTP ─── */}
          {step === 'signup-otp' && (
            <div className="space-y-6">
              <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <ShieldCheck className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Verify Email</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Code sent to <span className="font-medium text-gray-700 dark:text-gray-300">{otpSentEmail}</span></p>
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
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                </div>
              )}

              <div className="text-center">
                {otpCooldown > 0 ? (
                  <p className="text-sm text-gray-500">Resend in <span className="font-medium text-[#3B82F6]">{otpCooldown}s</span></p>
                ) : (
                  <button type="button" onClick={() => sendOtp(signupEmail, 'signup')} className={`text-sm ${linkClass}`}>
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-2 lg:absolute lg:bottom-3 lg:left-0 lg:right-0">
            &copy; {new Date().getFullYear()} NexCommerce. All rights reserved.
          </p>
        </div>
      </div>

      {/* ═══════ RIGHT: Hero Panel ═══════ */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-[10px] relative overflow-hidden bg-gradient-to-br from-[#3B82F6] to-[#1E40AF]">
        {/* Ambient glow */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full flex flex-col items-center">
          {/* Title */}
          <h2 className="text-[30px] sm:text-[36px] font-semibold text-white text-center leading-snug mb-6">
            Manage your store,<br />all in one place.
          </h2>
          <p className="text-white/80 text-center text-base mb-10">
            Plan. Build. Track. Deliver.
          </p>

          {/* Illustration */}
          <div className="w-full flex-1 min-h-0">
            <img
              src="/login-illustration.png"
              alt="NexCommerce Dashboard"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
