import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, isSuperAdmin } from '@/lib/api-auth'
import { statSync } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only super admins can access this
    const admin = await isSuperAdmin(userId)
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    // ── User Stats ──
    const allUsers = await db.authUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        status: true,
        updatedAt: true,
      },
    })

    const totalUsers = allUsers.length
    const superAdminCount = allUsers.filter((u) => u.role === 'super_admin').length
    const regularAdminCount = totalUsers - superAdminCount

    // New signups: today, this week, this month
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 0)

    const todaySignups = allUsers.filter((u) => u.createdAt >= today).length
    const weekSignups = allUsers.filter((u) => u.createdAt >= weekAgo).length
    const monthSignups = allUsers.filter((u) => u.createdAt >= monthAgo).length

    // Active users (logged in within last 7 days)
    const activeUsers = allUsers.filter((u) => u.lastLoginAt && u.lastLoginAt >= weekAgo).length

    // Users with WC connected
    const allUserSettings = await db.userSettings.findMany()
    const wcConnectedUsers = new Set<string>()
    for (const s of allUserSettings) {
      if (s.key === 'wc_store_url' && s.value) wcConnectedUsers.add(s.userId)
    }

    // ── System-wide Stats ──
    const allOrders = await db.wooCommerceOrder.findMany()
    const allCustomers = await db.customer.findMany()
    const allProducts = await db.product.findMany()

    const totalOrders = allOrders.length
    const totalCustomers = allCustomers.length
    const totalProducts = allProducts.length

    const paidOrders = allOrders.filter((o) => o.paymentStatus === 'paid')
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)

    // ── NEW: avgOrderValue ──
    const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0

    // Daily signups chart (last 30 days)
    const dailySignups: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const count = allUsers.filter((u) => u.createdAt >= dayStart && u.createdAt < dayEnd).length
      dailySignups.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      })
    }

    // ── NEW: platformGrowthPercent ──
    // Compare last 7 days signups vs previous 7 days
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    const last7DaysSignups = allUsers.filter((u) => u.createdAt >= weekAgo && u.createdAt < today).length
    const prev7DaysSignups = allUsers.filter((u) => u.createdAt >= twoWeeksAgo && u.createdAt < weekAgo).length
    let platformGrowthPercent = 0
    if (prev7DaysSignups > 0) {
      platformGrowthPercent = Math.round(((last7DaysSignups - prev7DaysSignups) / prev7DaysSignups) * 100)
    } else if (last7DaysSignups > 0) {
      platformGrowthPercent = 100 // 100% growth when going from 0 to N
    }

    // Per-user breakdown
    const perUserStats = allUsers.map((user) => {
      const userOrders = allOrders.filter((o) => o.userId === user.id)
      const userCustomers = allCustomers.filter((c) => c.userId === user.id)
      const userProducts = allProducts.filter((p) => p.userId === user.id)
      const wcConnected = wcConnectedUsers.has(user.id)
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
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        wcConnected,
        orderCount: userOrders.length,
        customerCount: userCustomers.length,
        productCount: userProducts.length,
        revenue: Math.round(userRevenue * 100) / 100,
      }
    })

    // ── NEW: recentActivity (latest 10 PlatformEvents) ──
    const recentActivity = await db.platformEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // ── NEW: dbSize ──
    let dbSize = 0
    try {
      const dbPath = path.join(process.cwd(), 'db', 'custom.db')
      const stats = statSync(dbPath)
      dbSize = stats.size
    } catch {
      // If we can't read the file, return 0
      dbSize = 0
    }

    // Email status
    const emailInfo = await import('@/lib/email').then((m) => m.getEmailProviderInfo())

    return NextResponse.json({
      // Overview
      totalUsers,
      superAdminCount,
      regularAdminCount,
      todaySignups,
      weekSignups,
      monthSignups,
      activeUsers,
      wcConnectedCount: wcConnectedUsers.size,

      // System-wide
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue: Math.round(totalRevenue * 100) / 100,

      // NEW fields
      avgOrderValue,
      platformGrowthPercent,
      recentActivity,
      dbSize,

      // Charts
      dailySignups,

      // Per-user
      users: perUserStats,

      // Email
      emailConfigured: emailInfo.configured,
      emailProvider: emailInfo.provider,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
