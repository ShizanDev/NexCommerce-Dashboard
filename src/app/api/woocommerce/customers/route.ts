import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    // Get user's currency setting
    const userSettings = await db.userSettings.findMany({ where: { userId } })
    const currencySetting = userSettings.find(s => s.key === 'currency')
    const currency = currencySetting?.value || 'INR'

    const where: Record<string, unknown> = { userId }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      db.customer.count({ where }),
    ])

    // Enrich with per-user order data
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const orders = await db.wooCommerceOrder.findMany({
          where: { customerEmail: customer.email, userId },
          select: { totalAmount: true, paymentStatus: true },
        })
        const paidOrders = orders.filter((o) => o.paymentStatus === 'paid')
        const totalSpent = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        const orderCount = orders.length

        return {
          ...customer,
          totalSpent,
          orderCount,
        }
      })
    )

    return NextResponse.json({
      customers: enrichedCustomers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      currency,
    })
  } catch (error) {
    console.error('Customers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}
