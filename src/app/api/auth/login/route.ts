import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, otp } = body

    // ── Validate required fields ──
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    if (!otp) {
      return NextResponse.json({ success: false, error: 'OTP verification is required' }, { status: 400 })
    }

    // ── Find the user ──
    const user = await db.authUser.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ success: false, error: 'No account found with this email. Please create a new account.' }, { status: 404 })
    }

    // ── Verify password BEFORE OTP (fail fast) ──
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid password. Please try again.' }, { status: 401 })
    }

    // ── Verify OTP ──
    const otpRecord = await db.otpRecord.findFirst({
      where: {
        email,
        purpose: 'login',
        otp,
        verified: true,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      // Check if there's an unverified one (auto-verify)
      const unverified = await db.otpRecord.findFirst({
        where: {
          email,
          purpose: 'login',
          otp,
          verified: false,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (unverified) {
        await db.otpRecord.update({
          where: { id: unverified.id },
          data: { verified: true },
        })
      } else {
        return NextResponse.json({ success: false, error: 'Invalid or expired OTP. Please request a new one.' }, { status: 401 })
      }
    }

    console.log(`✅ Login successful: ${email} (ID: ${user.id}, role: ${user.role})`)

    // ── Clean up used OTP records ──
    await db.otpRecord.deleteMany({ where: { email } })

    // ── Update last login timestamp ──
    await db.authUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // ── Seed UserSettings if this is the first login (migration safety) ──
    const existingSettings = await db.userSettings.count({ where: { userId: user.id } })
    if (existingSettings === 0) {
      await db.userSettings.upsert({
        where: { userId_key: { userId: user.id, key: 'currency' } },
        update: {},
        create: { userId: user.id, key: 'currency', value: 'INR' },
      })
      await db.userSettings.upsert({
        where: { userId_key: { userId: user.id, key: 'currency_symbol' } },
        update: {},
        create: { userId: user.id, key: 'currency_symbol', value: '₹' },
      })
    }

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
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
