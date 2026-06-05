import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const allOrders = await db.wooCommerceOrder.findMany()
    const customers = await db.customer.findMany()
    const settings = await db.systemSettings.findMany()

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => { settingsMap[s.key] = s.value })
    const wcConnected = !!(settingsMap.wc_store_url && settingsMap.wc_consumer_key && settingsMap.wc_consumer_secret)

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
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
