import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/otp — Send OTP
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

async function handleSendOtp(email: string, purpose: string) {
  if (!email || !email.includes('@')) {
    return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 })
  }

  if (purpose !== 'signup' && purpose !== 'login') {
    return NextResponse.json({ success: false, error: 'Purpose must be "signup" or "login"' }, { status: 400 })
  }

  // For signup, check if user already exists
  if (purpose === 'signup') {
    const existing = await db.authUser.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 })
    }
  }

  // For login, check if user exists
  if (purpose === 'login') {
    const existing = await db.authUser.findUnique({ where: { email } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'No account found with this email' }, { status: 404 })
    }
  }

  // Rate limiting: check for recent OTP (within last 60 seconds)
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

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry

  // Delete any existing unverified OTPs for this email/purpose
  await db.otpRecord.deleteMany({
    where: { email, purpose, verified: false },
  })

  // Store OTP
  await db.otpRecord.create({
    data: {
      email,
      otp,
      purpose,
      expiresAt,
    },
  })

  console.log(`📧 OTP for ${email} (${purpose}): ${otp}`)

  // In production, send email via Resend/SendGrid/SMTP here.
  // For this sandbox, we return the OTP in the response so the UI can show it.
  return NextResponse.json({
    success: true,
    message: 'OTP sent successfully',
    // In production, remove this field and send via email service
    otp,
  })
}

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
    return NextResponse.json({ success: false, error: 'Invalid OTP. Please try again.' }, { status: 401 })
  }

  // Mark as verified
  await db.otpRecord.update({
    where: { id: record.id },
    data: { verified: true },
  })

  // If signup purpose, mark user email as verified
  if (purpose === 'signup') {
    await db.authUser.update({
      where: { email },
      data: { emailVerified: true },
    })
  }

  return NextResponse.json({
    success: true,
    message: 'OTP verified successfully',
  })
}
