import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// POST /api/auth/reset-password — Verify OTP and update password
export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json()

    // ── Validate required fields ──
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 })
    }

    // ── Validate password strength ──
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 })
    }

    // ── Find user ──
    const user = await db.authUser.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'No account found with this email address.' }, { status: 404 })
    }

    // ── Verify OTP ──
    const otpRecord = await db.otpRecord.findFirst({
      where: {
        email,
        purpose: 'reset_password',
        otp,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      // Check if already verified (re-use)
      const alreadyVerified = await db.otpRecord.findFirst({
        where: {
          email,
          purpose: 'reset_password',
          otp,
          verified: true,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!alreadyVerified) {
        return NextResponse.json({ success: false, error: 'Invalid or expired code. Please request a new one.' }, { status: 401 })
      }
    } else {
      // Mark as verified
      await db.otpRecord.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      })
    }

    // ── Hash and update password ──
    const hashedPassword = await hashPassword(newPassword)

    await db.authUser.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // ── Clean up used OTP records ──
    await db.otpRecord.deleteMany({ where: { email, purpose: 'reset_password' } })

    console.log(`✅ Password reset successful for ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
