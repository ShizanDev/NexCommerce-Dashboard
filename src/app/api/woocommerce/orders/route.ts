import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, validateUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    const where: Record<string, unknown> = { userId }

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
        { orderNumber: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      db.wooCommerceOrder.findMany({
        where,
        orderBy: { dateCreated: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.wooCommerceOrder.count({ where }),
    ])

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        total: o.totalAmount,
        dateCreated: o.dateCreated.toISOString(),
        dateModified: o.dateModified?.toISOString() || null,
        datePaid: o.datePaid?.toISOString() || null,
        syncedAt: o.syncedAt.toISOString(),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
