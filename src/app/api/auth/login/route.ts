import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, wc_store_url, wc_consumer_key, wc_consumer_secret } = body

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    const user = await db.authUser.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    // Store WC credentials if provided
    if (wc_store_url || wc_consumer_key || wc_consumer_secret) {
      const settingsToUpsert: { key: string; value: string }[] = []
      if (wc_store_url) settingsToUpsert.push({ key: 'wc_store_url', value: wc_store_url })
      if (wc_consumer_key) settingsToUpsert.push({ key: 'wc_consumer_key', value: wc_consumer_key })
      if (wc_consumer_secret) settingsToUpsert.push({ key: 'wc_consumer_secret', value: wc_consumer_secret })

      for (const setting of settingsToUpsert) {
        await db.systemSettings.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        })
      }
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
