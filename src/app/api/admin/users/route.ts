import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, isSuperAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const superAdmin = await isSuperAdmin(userId)
    if (!superAdmin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    // Fetch all users with their core fields
    const allUsers = await db.authUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Fetch all WooCommerce-connected settings to build a lookup set
    const allUserSettings = await db.userSettings.findMany()
    const wcConnectedUsers = new Set<string>()
    for (const s of allUserSettings) {
      if (s.key === 'wc_store_url' && s.value) wcConnectedUsers.add(s.userId)
    }

    // Fetch system-wide data for per-user aggregation
    const allOrders = await db.wooCommerceOrder.findMany()
    const allCustomers = await db.customer.findMany()
    const allProducts = await db.product.findMany()

    // Build per-user enriched data
    const users = allUsers.map((user) => {
      const userOrders = allOrders.filter((o) => o.userId === user.id)
      const userCustomers = allCustomers.filter((c) => c.userId === user.id)
      const userProducts = allProducts.filter((p) => p.userId === user.id)
      const userRevenue = userOrders
        .filter((o) => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.totalAmount, 0)

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        wcConnected: wcConnectedUsers.has(user.id),
        orderCount: userOrders.length,
        customerCount: userCustomers.length,
        productCount: userProducts.length,
        revenue: Math.round(userRevenue * 100) / 100,
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin users list error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
