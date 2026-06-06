import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendOtpEmail, isEmailConfigured } from '@/lib/email'

// POST /api/auth/otp — Send or Verify OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, purpose } = body

    if (action === 'send') {
      return handleSendOtp(email, purpose || 'login')
    }

    if (action === 'verify') {
      return handleVerifyOtp(email, body.otp, purpose || 'login')
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use "send" or "verify".' }, { status: 400 })
  } catch (error) {
    console.error('OTP error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Send OTP ──────────────────────────────────────────────────────

async function handleSendOtp(email: string, purpose: string) {
  if (!email || !email.includes('@')) {
    return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 })
  }

  if (purpose !== 'signup' && purpose !== 'login') {
    return NextResponse.json({ success: false, error: 'Purpose must be "signup" or "login"' }, { status: 400 })
  }

  // ── Pre-flight checks ──
  const existingUser = await db.authUser.findUnique({ where: { email } })

  if (purpose === 'signup' && existingUser) {
    return NextResponse.json({ success: false, error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 })
  }

  if (purpose === 'login' && !existingUser) {
    return NextResponse.json({ success: false, error: 'No account found with this email. Please create a new account.' }, { status: 404 })
  }

  // ── Rate limiting: 60-second cooldown ──
  const recentOtp = await db.otpRecord.findFirst({
    where: {
      email,
      purpose,
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (recentOtp) {
    const elapsed = Date.now() - recentOtp.createdAt.getTime()
    const waitSeconds = Math.ceil((60 * 1000 - elapsed) / 1000)
    return NextResponse.json({
      success: false,
      error: `Please wait ${waitSeconds} seconds before requesting another OTP`,
      retryAfter: waitSeconds,
    }, { status: 429 })
  }

  // ── Generate OTP ──
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  // Clean up any old unverified OTPs for this email+purpose
  await db.otpRecord.deleteMany({
    where: { email, purpose, verified: false },
  })

  // Also clean up any expired verified OTPs (housekeeping)
  await db.otpRecord.deleteMany({
    where: { email, purpose, expiresAt: { lt: new Date() } },
  })

  // Store OTP in database
  await db.otpRecord.create({
    data: { email, otp, purpose, expiresAt },
  })

  console.log(`🔑 OTP generated for ${email} (${purpose}): ${otp}`)

  // ── Attempt to send email ──
  const emailConfigured = await isEmailConfigured()
  const emailResult = await sendOtpEmail(email, otp, purpose)

  if (emailResult.sent) {
    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      emailConfigured: true,
    })
  }

  // Email failed — fall back to sandbox mode
  console.warn(`⚠️ Email not sent to ${email}: ${emailResult.error}${emailResult.errorDetail ? ' — ' + emailResult.errorDetail : ''}`)

  return NextResponse.json({
    success: true,
    message: 'OTP generated (email service unavailable — using sandbox mode)',
    otp, // Only included when email fails
    sandboxMode: true,
    emailConfigured: false,
    emailError: emailResult.error,
    emailErrorDetail: emailResult.errorDetail,
  })
}

// ─── Verify OTP ──────────────────────────────────────────────────────

async function handleVerifyOtp(email: string, otp: string, purpose: string) {
  if (!email || !otp) {
    return NextResponse.json({ success: false, error: 'Email and OTP are required' }, { status: 400 })
  }

  const record = await db.otpRecord.findFirst({
    where: {
      email,
      purpose,
      otp,
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    // Check if it expired
    const expiredRecord = await db.otpRecord.findFirst({
      where: { email, purpose, otp, verified: false },
      orderBy: { createdAt: 'desc' },
    })
    if (expiredRecord && expiredRecord.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new one.' }, { status: 410 })
    }
    // Check if already verified (re-use scenario)
    const alreadyVerified = await db.otpRecord.findFirst({
      where: { email, purpose, otp, verified: true },
      orderBy: { createdAt: 'desc' },
    })
    if (alreadyVerified && alreadyVerified.expiresAt >= new Date()) {
      // Already verified and still valid — that's fine, proceed
      return NextResponse.json({ success: true, message: 'OTP already verified' })
    }
    return NextResponse.json({ success: false, error: 'Invalid OTP. Please try again.' }, { status: 401 })
  }

  // Mark as verified
  await db.otpRecord.update({
    where: { id: record.id },
    data: { verified: true },
  })

  console.log(`✅ OTP verified for ${email} (${purpose})`)

  return NextResponse.json({
    success: true,
    message: 'OTP verified successfully',
  })
}
