'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Store, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck, Info, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

type AuthStep = 'choose' | 'signup-form' | 'signup-otp' | 'login-form' | 'login-otp'

export function LoginPage() {
  const [step, setStep] = useState<AuthStep>('choose')
  const [loading, setLoading] = useState(false)
  const { setLoggedIn } = useAppStore()
  const otpRef = useRef<HTMLInputElement>(null)

  // Signup form
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [signupOtp, setSignupOtp] = useState('')

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginOtp, setLoginOtp] = useState('')

  // OTP timer & sandbox state
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpSentEmail, setOtpSentEmail] = useState('')
  const [isSandboxMode, setIsSandboxMode] = useState(false)
  const [sandboxOtp, setSandboxOtp] = useState('')
  const [emailErrorDetail, setEmailErrorDetail] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cooldown timer effect
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [otpCooldown])

  // ─── Session handler ──────────────────────────────────────────────

  function handleAuthSuccess(user: { id: string; email: string; name: string; role: string }, isNewUser: boolean) {
    // Clear any existing session first to prevent account mixing
    localStorage.removeItem('wc_dashboard_session')

    // Set fresh session with userId and role
    localStorage.setItem(
      'wc_dashboard_session',
      JSON.stringify({ isLoggedIn: true, name: user.name, email: user.email, id: user.id, role: user.role })
    )
    setLoggedIn(true, user.name, user.id, user.role)

    if (isNewUser) {
      toast.success(`Welcome, ${user.name}! Your account has been created.`, { duration: 5000 })
    } else {
      toast.success(`Welcome back, ${user.name}!`, { duration: 3000 })
    }
  }

  // ─── OTP Send ────────────────────────────────────────────────────

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
          // Email not configured — show OTP on screen (sandbox/dev mode)
          setIsSandboxMode(true)
          setSandboxOtp(data.otp)
          setEmailErrorDetail(data.emailErrorDetail || '')
          toast.warning('Email service not configured — using sandbox mode', {
            description: `OTP code: ${data.otp} (valid for 5 min)`,
            duration: 60000,
          })
        } else {
          // Email was actually sent
          setIsSandboxMode(false)
          setSandboxOtp('')
          setEmailErrorDetail('')
          toast.success('OTP sent to your email', {
            description: `Check ${email}. Code expires in 5 minutes.`,
            duration: 8000,
          })
        }
        return true
      } else {
        // Handle specific error types with helpful messages
        const errorType = getOtpErrorType(data.error, res.status)
        toast.error(errorType.title, { description: errorType.description })
        return false
      }
    } catch {
      toast.error('Network error', { description: 'Please check your connection and try again.' })
      return false
    } finally {
      setLoading(false)
    }
  }

  // ─── OTP Verify + Submit ────────────────────────────────────────

  async function verifyAndSubmit(
    email: string,
    otp: string,
    purpose: 'signup' | 'login',
    payload: Record<string, string>,
    onSuccess: (user: { id: string; email: string; name: string; role: string }) => void
  ) {
    setLoading(true)
    try {
      // Step 1: Verify OTP
      const otpRes = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, otp, purpose }),
      })
      const otpData = await otpRes.json()

      if (!otpData.success) {
        toast.error('OTP verification failed', { description: otpData.error || 'Invalid OTP' })
        setLoading(false)
        return
      }

      // Step 2: Proceed with auth action (signup or login)
      const endpoint = purpose === 'signup' ? '/api/auth/setup' : '/api/auth/login'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, otp }),
      })
      const data = await res.json()

      if (data.success) {
        onSuccess(data.user)
      } else {
        // Handle signup-specific errors
        if (data.userExists) {
          toast.error('Account already exists', {
            description: 'This email is already registered. Please sign in instead.',
          })
          // Navigate back to login form
          setStep('login-form')
          setLoginEmail(payload.email)
        } else {
          toast.error(purpose === 'signup' ? 'Signup failed' : 'Login failed', {
            description: data.error || 'Please try again.',
          })
        }
      }
    } catch {
      toast.error('Something went wrong', { description: 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ─── Signup handlers ─────────────────────────────────────────────

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Client-side validation
    if (signupPassword !== signupConfirmPassword) {
      toast.error('Passwords do not match', { description: 'Please check both password fields.' })
      return
    }
    if (signupPassword.length < 6) {
      toast.error('Password too short', { description: 'Password must be at least 6 characters.' })
      return
    }
    if (signupName.trim().length < 2) {
      toast.error('Name too short', { description: 'Please enter your full name.' })
      return
    }

    const sent = await sendOtp(signupEmail, 'signup')
    if (sent) setStep('signup-otp')
  }

  function handleSignupOtpComplete() {
    if (signupOtp.length === 6) {
      verifyAndSubmit(
        signupEmail,
        signupOtp,
        'signup',
        { email: signupEmail, password: signupPassword, name: signupName, otp: signupOtp },
        (user) => {
          handleAuthSuccess(user, true) // isNewUser = true
        }
      )
    }
  }

  // ─── Login handlers ──────────────────────────────────────────────

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()

    const sent = await sendOtp(loginEmail, 'login')
    if (sent) setStep('login-otp')
  }

  function handleLoginOtpComplete() {
    if (loginOtp.length === 6) {
      verifyAndSubmit(
        loginEmail,
        loginOtp,
        'login',
        { email: loginEmail, password: loginPassword, otp: loginOtp },
        (user) => {
          handleAuthSuccess(user, false) // isNewUser = false
        }
      )
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────

  const goBack = () => {
    // Reset sandbox state when going back
    setIsSandboxMode(false)
    setSandboxOtp('')
    setEmailErrorDetail('')

    if (step === 'signup-form' || step === 'login-form') setStep('choose')
    else if (step === 'signup-otp') setStep('signup-form')
    else if (step === 'login-otp') setStep('login-form')
  }

  function switchToSignup() {
    setStep('signup-form')
    // Reset all login state
    setLoginEmail('')
    setLoginPassword('')
    setLoginOtp('')
    setIsSandboxMode(false)
    setSandboxOtp('')
  }

  function switchToLogin() {
    setStep('login-form')
    // Reset all signup state
    setSignupName('')
    setSignupEmail('')
    setSignupPassword('')
    setSignupConfirmPassword('')
    setSignupOtp('')
    setIsSandboxMode(false)
    setSandboxOtp('')
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent dark:from-emerald-900/20" />

      <Card className="relative w-full max-w-md shadow-2xl border-emerald-200/50 dark:border-emerald-800/50 bg-background/80 backdrop-blur-xl">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/25">
            <Store className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              WC Dashboard
            </CardTitle>
            <CardDescription className="mt-1">WooCommerce Order Management System</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* ─── Step: Choose Login or Signup ─── */}
          {step === 'choose' && (
            <div className="space-y-3">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
                onClick={switchToLogin}
              >
                <Mail className="mr-2 h-4 w-4" />
                Sign In to Your Account
              </Button>
              <Separator />
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={switchToSignup}
              >
                <User className="mr-2 h-4 w-4" />
                Create New Account
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Secure authentication with email OTP verification
              </p>
            </div>
          )}

          {/* ─── Step: Login Form ─── */}
          {step === 'login-form' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <div className="space-y-2">
                <Label htmlFor="login-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@store.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</>
                ) : (
                  'Continue'
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                We&apos;ll send a verification code to your email
              </p>
            </form>
          )}

          {/* ─── Step: Login OTP ─── */}
          {step === 'login-otp' && (
            <div className="space-y-4">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Verify Your Identity</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{otpSentEmail}</span>
                </p>
              </div>

              <div className="flex justify-center py-2">
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

              {/* Sandbox Mode Banner */}
              {isSandboxMode && sandboxOtp && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Sandbox Mode — Email not configured</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Your verification code: <span className="font-mono font-bold text-amber-900 dark:text-amber-200 text-base tracking-wider">{sandboxOtp}</span>
                      </p>
                      {emailErrorDetail && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{emailErrorDetail}</p>
                      )}
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Contact the system administrator to enable email delivery.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                </div>
              )}

              <div className="text-center">
                {otpCooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium text-emerald-600">{otpCooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendOtp(loginEmail, 'login')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Resend verification code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Step: Signup Form ─── */}
          {step === 'signup-form' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your full name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="admin@store.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Confirm password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                We&apos;ll send a verification code to your email
              </p>
            </form>
          )}

          {/* ─── Step: Signup OTP ─── */}
          {step === 'signup-otp' && (
            <div className="space-y-4">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Verify Your Email</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{otpSentEmail}</span>
                </p>
              </div>

              <div className="flex justify-center py-2">
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

              {/* Sandbox Mode Banner */}
              {isSandboxMode && sandboxOtp && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Sandbox Mode — Email not configured</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Your verification code: <span className="font-mono font-bold text-amber-900 dark:text-amber-200 text-base tracking-wider">{sandboxOtp}</span>
                      </p>
                      {emailErrorDetail && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{emailErrorDetail}</p>
                      )}
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Contact the system administrator to enable email delivery.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                </div>
              )}

              <div className="text-center">
                {otpCooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium text-emerald-600">{otpCooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendOtp(signupEmail, 'signup')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Resend verification code
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Helper: Parse OTP error types ──────────────────────────────────

function getOtpErrorType(error: string, status: number): { title: string; description: string } {
  if (status === 429) {
    return { title: 'OTP sent too quickly', description: error || 'Please wait before requesting another code.' }
  }
  if (status === 409) {
    return { title: 'Account already exists', description: error || 'Please sign in instead.' }
  }
  if (status === 404) {
    return { title: 'Account not found', description: error || 'Please create a new account first.' }
  }
  return { title: 'Failed to send OTP', description: error || 'Please try again.' }
}
