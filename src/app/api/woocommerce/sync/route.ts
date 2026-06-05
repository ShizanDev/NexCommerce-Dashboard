import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's WC credentials from UserSettings
    const userSettings = await db.userSettings.findMany({ where: { userId } })
    const s: Record<string, string> = {}
    userSettings.forEach((x) => { s[x.key] = x.value })

    const storeUrl = s.wc_store_url
    const consumerKey = s.wc_consumer_key
    const consumerSecret = s.wc_consumer_secret

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'WooCommerce credentials not configured' }, { status: 400 })
    }

    const cleanUrl = storeUrl.replace(/\/+$/, '')
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    let page = 1
    let totalPages = 1
    let totalSynced = 0

    while (page <= totalPages) {
      const endpoint = `${cleanUrl}/wp-json/wc/v3/orders?per_page=100&page=${page}`
      const response = await fetch(endpoint, {
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch page ${page}: ${response.status}` }, { status: response.status })
      }

      const orders = await response.json() as Array<Record<string, unknown>>
      const tpHeader = response.headers.get('X-WP-TotalPages')
      if (tpHeader) totalPages = parseInt(tpHeader, 10)

      for (const order of orders) {
        const wooId = order.id as number
        if (!wooId) continue

        const billing = order.billing as Record<string, string> | null
        const customerName = billing ? [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim() : 'Guest'
        const customerEmail = billing?.email || ''
        const wcStatus = (order.status as string) || 'pending'
        const paymentStatus = (order.date_paid ? 'paid' : (wcStatus === 'completed' || wcStatus === 'processing' ? 'paid' : wcStatus === 'refunded' ? 'refunded' : wcStatus === 'failed' || wcStatus === 'cancelled' ? 'failed' : wcStatus))

        const lineItems = order.line_items as Array<Record<string, unknown>> | null
        const itemsStr = JSON.stringify((lineItems || []).map((li) => ({
          name: li.name || '', sku: li.sku || '', quantity: li.quantity || 0,
          price: li.price || '0', total: li.total || '0',
        })))

        await db.wooCommerceOrder.upsert({
          where: { wooOrderId: wooId },
          update: {
            userId,
            orderNumber: (order.number as string) || String(wooId),
            status: wcStatus, paymentStatus,
            totalAmount: parseFloat(String(order.total || '0')),
            currency: (order.currency as string) || 'INR',
            paymentMethod: (order.payment_method_title as string) || '',
            customerName, customerEmail, itemsJson: itemsStr,
            dateCreated: new Date(String(order.date_created || Date.now())),
            dateModified: order.date_modified ? new Date(String(order.date_modified)) : null,
            datePaid: order.date_paid ? new Date(String(order.date_paid)) : null,
            syncedAt: new Date(),
          },
          create: {
            userId,
            wooOrderId: wooId,
            orderNumber: (order.number as string) || String(wooId),
            status: wcStatus, paymentStatus,
            totalAmount: parseFloat(String(order.total || '0')),
            currency: (order.currency as string) || 'INR',
            paymentMethod: (order.payment_method_title as string) || '',
            customerName, customerEmail, itemsJson: itemsStr,
            dateCreated: new Date(String(order.date_created || Date.now())),
          },
        })

        // Sync customer with userId
        if (customerEmail) {
          try {
            await db.customer.upsert({
              where: { email_userId: { email: customerEmail, userId } },
              update: {
                name: customerName,
                phone: billing?.phone || undefined,
                city: billing?.city || undefined,
                country: billing?.country || undefined,
              },
              create: {
                userId,
                email: customerEmail,
                name: customerName,
                phone: billing?.phone || '',
                city: billing?.city || '',
                country: billing?.country || '',
              },
            })
          } catch {
            // Customer might exist without userId — try creating with unique email+userId
          }
        }

        totalSynced++
      }

      page++
    }

    // Update user's last sync time
    await db.userSettings.upsert({
      where: { userId_key: { userId, key: 'wc_last_sync' } },
      update: { value: new Date().toISOString() },
      create: { userId, key: 'wc_last_sync', value: new Date().toISOString() },
    })

    return NextResponse.json({ success: true, totalSynced, totalPages })
  } catch (error: unknown) {
    console.error('Sync error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Sync failed: ${msg}` }, { status: 500 })
  }
}
