import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendOtpEmail, isEmailConfigured } from '@/lib/email'

// POST /api/auth/forgot-password — Send OTP for password reset
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // ── Validate email ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 })
    }

    // ── Check user exists ──
    const user = await db.authUser.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'No account found with this email address.' }, { status: 404 })
    }

    // ── Rate limiting: 60-second cooldown ──
    const recentOtp = await db.otpRecord.findFirst({
      where: {
        email,
        purpose: 'reset_password',
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentOtp) {
      const elapsed = Date.now() - recentOtp.createdAt.getTime()
      const waitSeconds = Math.ceil((60 * 1000 - elapsed) / 1000)
      return NextResponse.json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting another code.`,
        retryAfter: waitSeconds,
      }, { status: 429 })
    }

    // ── Generate OTP ──
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Clean up old unverified OTPs for this email+purpose
    await db.otpRecord.deleteMany({
      where: { email, purpose: 'reset_password', verified: false },
    })
    await db.otpRecord.deleteMany({
      where: { email, purpose: 'reset_password', expiresAt: { lt: new Date() } },
    })

    // Store OTP
    await db.otpRecord.create({
      data: { email, otp, purpose: 'reset_password', expiresAt },
    })

    console.log(`🔑 Reset OTP for ${email}: ${otp}`)

    // ── Attempt to send email ──
    const emailResult = await sendOtpEmail(email, otp, 'reset_password')

    if (emailResult.sent) {
      return NextResponse.json({
        success: true,
        message: 'Password reset code sent to your email',
        emailConfigured: true,
      })
    }

    // Email failed — sandbox mode
    console.warn(`⚠️ Reset email not sent to ${email}: ${emailResult.error}`)

    return NextResponse.json({
      success: true,
      message: 'Code generated (email service unavailable)',
      otp,
      sandboxMode: true,
      emailConfigured: false,
      emailErrorDetail: emailResult.errorDetail,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
