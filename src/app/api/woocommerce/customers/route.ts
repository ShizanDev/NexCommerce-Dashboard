import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      db.customer.count({ where: Object.keys(where).length > 0 ? where : undefined }),
    ])

    // Calculate total spent and order count per customer from orders
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const orders = await db.wooCommerceOrder.findMany({
          where: { customerEmail: customer.email },
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
    })
  } catch (error) {
    console.error('Customers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}
