import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, otp } = body

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Email, password, and name are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Verify OTP first
    if (!otp) {
      return NextResponse.json({ success: false, error: 'OTP verification is required' }, { status: 400 })
    }

    const otpRecord = await db.otpRecord.findFirst({
      where: {
        email,
        purpose: 'signup',
        otp,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return NextResponse.json({ success: false, error: 'Invalid or expired OTP' }, { status: 401 })
    }

    // Check if user already exists
    const existing = await db.authUser.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    // Create admin user
    const user = await db.authUser.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        emailVerified: true,
      },
    })

    // Mark OTP as verified
    await db.otpRecord.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    })

    // Seed default currency settings
    await db.systemSettings.upsert({
      where: { key: 'currency' },
      update: { value: 'INR' },
      create: { key: 'currency', value: 'INR' },
    })

    await db.systemSettings.upsert({
      where: { key: 'currency_symbol' },
      update: { value: '₹' },
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
