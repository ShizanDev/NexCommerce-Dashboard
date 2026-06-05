import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, otp } = body

    // ── Validate required fields ──
    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Email, password, and name are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    if (!otp) {
      return NextResponse.json({ success: false, error: 'OTP verification is required' }, { status: 400 })
    }

    // ── CRITICAL: Check if user already exists BEFORE OTP check ──
    // This prevents the scenario where an existing account is "logged into"
    // instead of creating a new account
    const existing = await db.authUser.findUnique({ where: { email } })
    if (existing) {
      console.warn(`⚠️ Signup attempted for existing email: ${email} (user: ${existing.id})`)
      return NextResponse.json({
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
        userExists: true,
      }, { status: 409 })
    }

    // ── Verify OTP (already verified by /api/auth/otp, double-check) ──
    const otpRecord = await db.otpRecord.findFirst({
      where: {
        email,
        purpose: 'signup',
        otp,
        verified: true,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      // Check if there's an unverified one (frontend may have skipped verify step)
      const unverified = await db.otpRecord.findFirst({
        where: {
          email,
          purpose: 'signup',
          otp,
          verified: false,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (unverified) {
        // Auto-verify it (frontend should have verified already)
        await db.otpRecord.update({
          where: { id: unverified.id },
          data: { verified: true },
        })
        console.log(`📝 Auto-verified unverified OTP for signup: ${email}`)
      } else {
        return NextResponse.json({ success: false, error: 'Invalid or expired OTP. Please request a new one.' }, { status: 401 })
      }
    }

    // ── Create the new user ──
    const hashedPassword = await hashPassword(password)

    const user = await db.authUser.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        emailVerified: true,
      },
    })

    console.log(`👤 New user created: ${email} (ID: ${user.id}, name: ${name})`)

    // ── Clean up ALL OTP records for this email (both signup and any lingering login OTPs) ──
    await db.otpRecord.deleteMany({ where: { email } })

    // ── Seed default currency settings (only if not already set) ──
    await db.systemSettings.upsert({
      where: { key: 'currency' },
      update: {},
      create: { key: 'currency', value: 'INR' },
    })

    await db.systemSettings.upsert({
      where: { key: 'currency_symbol' },
      update: {},
      create: { key: 'currency_symbol', value: '₹' },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
