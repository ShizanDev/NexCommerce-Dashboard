import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, isSuperAdmin } from '@/lib/api-auth'
import { getEmailProviderInfo, testEmailConnection } from '@/lib/email'

// ─── Helper: Get or create a SystemSettings record ────────────────────

async function getSetting(key: string): Promise<string> {
  const record = await db.systemSettings.findUnique({ where: { key } })
  return record?.value ?? ''
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

// ─── Helper: Parse boolean from string ──────────────────────────────

function parseBoolean(val: string): boolean {
  return val === 'true' || val === '1'
}

// ─── GET: Fetch platform settings ───────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const admin = await isSuperAdmin(userId)
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    const allowRegistrations = parseBoolean(await getSetting('allow_registrations') || 'true')
    const emailVerificationRequired = parseBoolean(await getSetting('email_verification_required') || 'true')
    const firstUserIsSuperAdmin = parseBoolean(await getSetting('first_user_is_super_admin') || 'true')

    return NextResponse.json({
      settings: {
        allowRegistrations,
        emailVerificationRequired,
        firstUserIsSuperAdmin,
      },
    })
  } catch (error) {
    console.error('Platform settings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch platform settings' }, { status: 500 })
  }
}

// ─── PUT: Update a single setting ───────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const admin = await isSuperAdmin(userId)
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
    }

    // Map frontend keys to database keys
    const keyMap: Record<string, string> = {
      allowRegistrations: 'allow_registrations',
      emailVerificationRequired: 'email_verification_required',
      firstUserIsSuperAdmin: 'first_user_is_super_admin',
    }

    const dbKey = keyMap[key]
    if (!dbKey) {
      return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
    }

    await setSetting(dbKey, String(value))

    // Log the settings change
    const user = await db.authUser.findUnique({ where: { id: userId } })
    await db.auditLog.create({
      data: {
        userId: userId,
        userName: user?.name || '',
        userEmail: user?.email || '',
        action: 'settings.update',
        target: key,
        details: `Changed "${key}" to "${value}"`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Platform settings update error:', error)
    return NextResponse.json({ error: 'Failed to update platform settings' }, { status: 500 })
  }
}

// ─── POST: Execute platform actions ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const admin = await isSuperAdmin(userId)
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    const user = await db.authUser.findUnique({ where: { id: userId } })

    switch (action) {
      case 'testEmail': {
        // Send a test email to the super admin
        if (!user?.email) {
          return NextResponse.json({ error: 'No email address found for user' }, { status: 400 })
        }

        const result = await testEmailConnection(user.email)

        if (result.success) {
          // Log the action
          await db.auditLog.create({
            data: {
              userId: userId,
              userName: user?.name || '',
              userEmail: user?.email || '',
              action: 'settings.update',
              target: 'email_test',
              details: `Test email sent to ${user.email}`,
            },
          })

          return NextResponse.json({ success: true, message: 'Test email sent' })
        } else {
          return NextResponse.json(
            { error: result.error || 'Failed to send test email. Check your email configuration.' },
            { status: 500 }
          )
        }
      }

      case 'clearAuditLogs': {
        // Delete all audit logs
        const deleteResult = await db.auditLog.deleteMany()

        return NextResponse.json({
          success: true,
          message: `Cleared ${deleteResult.count} audit log entries`,
        })
      }

      case 'resetDemoData': {
        // Delete all data from relevant tables (except AuthUser and SystemSettings)
        await db.wooCommerceOrder.deleteMany()
        await db.customer.deleteMany()
        await db.product.deleteMany()
        await db.auditLog.deleteMany()
        await db.platformEvent.deleteMany()
        await db.otpRecord.deleteMany()
        await db.userSettings.deleteMany()

        // Log this action (recreate audit log table was just cleared)
        await db.auditLog.create({
          data: {
            userId: userId,
            userName: user?.name || '',
            userEmail: user?.email || '',
            action: 'system.backup',
            target: 'platform_data',
            details: 'Platform data reset to initial state by super admin',
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Demo data has been reset',
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Platform settings action error:', error)
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 })
  }
}
