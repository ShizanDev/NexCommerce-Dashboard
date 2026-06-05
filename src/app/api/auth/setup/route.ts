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
    const existing = await db.authUser.findUnique({ where: { email } })
    if (existing) {
      console.warn(`⚠️ Signup attempted for existing email: ${email} (user: ${existing.id})`)
      return NextResponse.json({
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
        userExists: true,
      }, { status: 409 })
    }

    // ── Verify OTP ──
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
      // Check if there's an unverified one (auto-verify)
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
        await db.otpRecord.update({
          where: { id: unverified.id },
          data: { verified: true },
        })
      } else {
        return NextResponse.json({ success: false, error: 'Invalid or expired OTP. Please request a new one.' }, { status: 401 })
      }
    }

    // ── Determine role: first user becomes super_admin ──
    const userCount = await db.authUser.count()
    const role = userCount === 0 ? 'super_admin' : 'admin'

    // ── Create the new user ──
    const hashedPassword = await hashPassword(password)

    const user = await db.authUser.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        emailVerified: true,
      },
    })

    console.log(`👤 New user created: ${email} (ID: ${user.id}, role: ${role}, name: ${name})`)

    // ── Clean up ALL OTP records for this email ──
    await db.otpRecord.deleteMany({ where: { email } })

    // ── Seed default currency in UserSettings ──
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

    await db.userSettings.upsert({
      where: { userId_key: { userId: user.id, key: 'notify_new_order' } },
      update: {},
      create: { userId: user.id, key: 'notify_new_order', value: 'true' },
    })

    await db.userSettings.upsert({
      where: { userId_key: { userId: user.id, key: 'notify_low_stock' } },
      update: {},
      create: { userId: user.id, key: 'notify_low_stock', value: 'true' },
    })

    await db.userSettings.upsert({
      where: { userId_key: { userId: user.id, key: 'notify_status_change' } },
      update: {},
      create: { userId: user.id, key: 'notify_status_change', value: 'false' },
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
