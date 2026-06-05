import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, wc_store_url, wc_consumer_key, wc_consumer_secret } = body

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Email, password, and name are required' }, { status: 400 })
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
      },
    })

    // Store WC credentials if provided
    if (wc_store_url) {
      await db.systemSettings.upsert({
        where: { key: 'wc_store_url' },
        update: { value: wc_store_url },
        create: { key: 'wc_store_url', value: wc_store_url },
      })
    }
    if (wc_consumer_key) {
      await db.systemSettings.upsert({
        where: { key: 'wc_consumer_key' },
        update: { value: wc_consumer_key },
        create: { key: 'wc_consumer_key', value: wc_consumer_key },
      })
    }
    if (wc_consumer_secret) {
      await db.systemSettings.upsert({
        where: { key: 'wc_consumer_secret' },
        update: { value: wc_consumer_secret },
        create: { key: 'wc_consumer_secret', value: wc_consumer_secret },
      })
    }

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
