import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, isSuperAdmin } from '@/lib/api-auth'

// ─── Audit log helper ────────────────────────────────────────────────

async function logAuditAction(params: {
  adminUserId: string
  action: string
  target: string
  details: string
  ipAddress?: string
}) {
  try {
    const admin = await db.authUser.findUnique({ where: { id: params.adminUserId } })
    await db.auditLog.create({
      data: {
        userId: params.adminUserId,
        userName: admin?.name || '',
        userEmail: admin?.email || '',
        action: params.action,
        target: params.target,
        details: params.details,
        ipAddress: params.ipAddress || '',
      },
    })
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}

// ─── GET /api/admin/users/[id] ───────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const superAdmin = await isSuperAdmin(userId)
    if (!superAdmin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    const { id } = await params
    const targetUser = await db.authUser.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check WC connection
    const wcSetting = await db.userSettings.findUnique({
      where: { userId_key: { userId: id, key: 'wc_store_url' } },
    })
    const wcConnected = !!wcSetting?.value

    // Aggregated stats
    const orderCount = await db.wooCommerceOrder.count({ where: { userId: id } })
    const customerCount = await db.customer.count({ where: { userId: id } })
    const productCount = await db.product.count({ where: { userId: id } })

    const paidOrders = await db.wooCommerceOrder.findMany({
      where: { userId: id, paymentStatus: 'paid' },
    })
    const revenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)

    return NextResponse.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        status: targetUser.status,
        emailVerified: targetUser.emailVerified,
        lastLoginAt: targetUser.lastLoginAt?.toISOString() ?? null,
        createdAt: targetUser.createdAt.toISOString(),
        updatedAt: targetUser.updatedAt.toISOString(),
        wcConnected,
        orderCount,
        customerCount,
        productCount,
        revenue: Math.round(revenue * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Admin get user error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// ─── PUT /api/admin/users/[id] ───────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const superAdmin = await isSuperAdmin(userId)
    if (!superAdmin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    const { id } = await params

    // Prevent changing yourself
    if (id === userId) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
    }

    const body = await request.json()
    const { role, status } = body

    // Fetch target user
    const targetUser = await db.authUser.findUnique({ where: { id } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate role if provided
    const validRoles = ['admin', 'super_admin']
    if (role !== undefined && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "super_admin"' },
        { status: 400 }
      )
    }

    // Validate status if provided
    const validStatuses = ['active', 'suspended', 'deactivated']
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "active", "suspended", or "deactivated"' },
        { status: 400 }
      )
    }

    // Build update payload
    const updateData: { role?: string; status?: string } = {}
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status

    const updatedUser = await db.authUser.update({
      where: { id },
      data: updateData,
    })

    // Log audit entries
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''

    if (role !== undefined && role !== targetUser.role) {
      await logAuditAction({
        adminUserId: userId,
        action: 'user.role_change',
        target: targetUser.email,
        details: `Changed role from "${targetUser.role}" to "${role}" for user "${targetUser.name}" (${targetUser.email})`,
        ipAddress: clientIp || undefined,
      })
    }

    if (status !== undefined && status !== targetUser.status) {
      await logAuditAction({
        adminUserId: userId,
        action: 'user.status_change',
        target: targetUser.email,
        details: `Changed status from "${targetUser.status}" to "${status}" for user "${targetUser.name}" (${targetUser.email})`,
        ipAddress: clientIp || undefined,
      })
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
        emailVerified: updatedUser.emailVerified,
        lastLoginAt: updatedUser.lastLoginAt?.toISOString() ?? null,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/users/[id] ────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const superAdmin = await isSuperAdmin(userId)
    if (!superAdmin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    const { id } = await params

    // Cannot delete yourself
    if (id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Fetch target user
    const targetUser = await db.authUser.findUnique({ where: { id } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Cannot delete the last super_admin
    if (targetUser.role === 'super_admin') {
      const superAdminCount = await db.authUser.count({
        where: { role: 'super_admin' },
      })
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last super admin' },
          { status: 400 }
        )
      }
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''

    // Delete all related data in a transaction
    await db.$transaction([
      db.wooCommerceOrder.deleteMany({ where: { userId: id } }),
      db.customer.deleteMany({ where: { userId: id } }),
      db.product.deleteMany({ where: { userId: id } }),
      db.userSettings.deleteMany({ where: { userId: id } }),
      db.otpRecord.deleteMany({ where: { email: targetUser.email } }),
      db.platformEvent.deleteMany({ where: { userId: id } }),
      db.auditLog.deleteMany({ where: { userId: id } }),
      db.authUser.delete({ where: { id } }),
    ])

    // Log the deletion (after transaction, using the admin's own userId)
    await logAuditAction({
      adminUserId: userId,
      action: 'user.delete',
      target: targetUser.email,
      details: `Deleted user "${targetUser.name}" (${targetUser.email}) with role "${targetUser.role}"`,
      ipAddress: clientIp || undefined,
    })

    return NextResponse.json({
      success: true,
      message: `User "${targetUser.email}" has been deleted`,
    })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
