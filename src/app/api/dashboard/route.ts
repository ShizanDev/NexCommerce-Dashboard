import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, validateUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await validateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // ── Fetch per-user data ──
    const allOrders = await db.wooCommerceOrder.findMany({
      where: { userId },
    })
    const customers = await db.customer.findMany({
      where: { userId },
    })

    // ── Per-user settings ──
    const userSettings = await db.userSettings.findMany({ where: { userId } })
    const settingsMap: Record<string, string> = {}
    userSettings.forEach((s) => { settingsMap[s.key] = s.value })

    const wcConnected = !!(settingsMap.wc_store_url && settingsMap.wc_consumer_key && settingsMap.wc_consumer_secret)
    const currency = settingsMap.currency || 'INR'
    const currencySymbol = settingsMap.currency_symbol || '₹'

    // Stats
    const paidOrders = allOrders.filter((o) => o.paymentStatus === 'paid')
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalOrders = allOrders.length
    const pendingOrders = allOrders.filter((o) => ['pending', 'processing'].includes(o.status)).length
    const totalCustomers = customers.length

    // Monthly revenue (last 6 months)
    const now = new Date()
    const monthlyRevenue: { month: string; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      const monthOrders = paidOrders.filter((o) => {
        const d = new Date(o.dateCreated)
        return d >= monthStart && d <= monthEnd
      })
      const revenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0)
      monthlyRevenue.push({ month: monthLabel, revenue: Math.round(revenue * 100) / 100 })
    }

    // Recent orders
    const recentOrders = [...allOrders]
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        total: o.totalAmount,
        totalAmount: o.totalAmount,
        currency: o.currency,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        dateCreated: o.dateCreated.toISOString(),
        itemsJson: o.itemsJson,
      }))

    // Status breakdown
    const statusBreakdown: Record<string, number> = {}
    allOrders.forEach((o) => {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1
    })

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      pendingOrders,
      totalCustomers,
      monthlyRevenue,
      recentOrders,
      statusBreakdown,
      wcConnected,
      currency,
      currencySymbol,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
