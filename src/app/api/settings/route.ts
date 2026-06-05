import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Return all system settings
export async function GET() {
  try {
    const settings = await db.systemSettings.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    const wcConnected = !!(settingsMap.wc_store_url && settingsMap.wc_consumer_key && settingsMap.wc_consumer_secret)
    const lastSync = settingsMap.wc_last_sync || null

    return NextResponse.json({ ...settingsMap, wcConnected: String(wcConnected), wc_last_sync: lastSync })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT: Bulk upsert settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Settings object required' }, { status: 400 })
    }

    const entries = Object.entries(body) as [string, string][]
    for (const [key, value] of entries) {
      await db.systemSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

// POST with actions: test_connection, disconnect
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'disconnect') {
      return handleDisconnect()
    }

    if (action !== 'test_connection') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { store_url, consumer_key, consumer_secret } = body

    if (!store_url || !consumer_key || !consumer_secret) {
      return NextResponse.json({ error: 'Store URL, Consumer Key, and Consumer Secret are required' }, { status: 400 })
    }

    const cleanUrl = store_url.replace(/\/+$/, '')
    const endpoint = `${cleanUrl}/wp-json/wc/v3/orders?per_page=50`
    const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64')

    console.log(`🔗 Testing WC connection: ${cleanUrl}`)

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ WC API error ${response.status}:`, errorText.substring(0, 300))
      let errorMessage = `Connection failed (${response.status})`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.code || errorMessage
      } catch {
        errorMessage = errorText.substring(0, 200)
      }

      if (response.status === 401) errorMessage = 'Authentication failed — wrong Consumer Key or Secret'
      if (response.status === 404) errorMessage = 'WooCommerce REST API not found. Is WooCommerce installed?'
      if (response.status === 403) errorMessage = 'Permission denied. Check your API key permissions.'

      return NextResponse.json({ success: false, error: errorMessage })
    }

    const orders = (await response.json()) as Array<Record<string, unknown>>
    const totalCount = response.headers.get('X-WP-Total') || '0'
    console.log(`✅ WC connection OK — ${orders.length} orders fetched, ${totalCount} total`)

    // Map WC order statuses to payment statuses
    function mapPaymentStatus(status: string): string {
      if (status === 'completed' || status === 'processing') return 'paid'
      if (status === 'refunded') return 'refunded'
      if (status === 'failed' || status === 'cancelled') return 'failed'
      return status
    }

    // Sync orders to DB
    let syncedCount = 0
    for (const order of orders) {
      const wooId = order.id as number
      if (!wooId) continue

      const billing = order.billing as Record<string, string> | null
      const shipping = order.shipping as Record<string, string> | null
      const lineItems = order.line_items as Array<Record<string, unknown>> | null

      const customerName = billing
        ? [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim()
        : 'Guest'
      const customerEmail = billing?.email || ''

      const billingAddr = billing
        ? [billing.address_1, billing.city, billing.state, billing.postcode, billing.country].filter(Boolean).join(', ')
        : ''
      const shippingAddr = shipping
        ? [shipping.address_1, shipping.city, shipping.state, shipping.postcode, shipping.country].filter(Boolean).join(', ')
        : ''

      const itemsStr = JSON.stringify((lineItems || []).map((li) => ({
        name: li.name || '',
        sku: li.sku || '',
        quantity: li.quantity || 0,
        price: li.price || '0',
        total: li.total || '0',
      })))

      const wcStatus = (order.status as string) || 'pending'
      const paymentStatus = order.date_paid ? 'paid' : mapPaymentStatus(wcStatus)

      await db.wooCommerceOrder.upsert({
        where: { wooOrderId: wooId },
        update: {
          orderNumber: (order.number as string) || String(wooId),
          status: wcStatus,
          customerName,
          customerEmail,
          itemsJson: itemsStr,
          totalAmount: parseFloat(String(order.total || '0')),
          currency: (order.currency as string) || 'INR',
          paymentMethod: (order.payment_method_title as string) || '',
          paymentStatus,
          billingAddress: billingAddr,
          shippingAddress: shippingAddr,
          customerNote: (order.customer_note as string) || '',
          dateCreated: new Date(String(order.date_created || Date.now())),
          dateModified: order.date_modified ? new Date(String(order.date_modified)) : null,
          datePaid: order.date_paid ? new Date(String(order.date_paid)) : null,
          syncedAt: new Date(),
        },
        create: {
          wooOrderId: wooId,
          orderNumber: (order.number as string) || String(wooId),
          status: wcStatus,
          customerName,
          customerEmail,
          itemsJson: itemsStr,
          totalAmount: parseFloat(String(order.total || '0')),
          currency: (order.currency as string) || 'INR',
          paymentMethod: (order.payment_method_title as string) || '',
          paymentStatus,
          billingAddress: billingAddr,
          shippingAddress: shippingAddr,
          customerNote: (order.customer_note as string) || '',
          dateCreated: new Date(String(order.date_created || Date.now())),
          dateModified: order.date_modified ? new Date(String(order.date_modified)) : null,
          datePaid: order.date_paid ? new Date(String(order.date_paid)) : null,
        },
      })

      // Upsert Customer
      if (customerEmail) {
        await db.customer.upsert({
          where: { email: customerEmail },
          update: {
            name: customerName || undefined,
            phone: billing?.phone || undefined,
            address: billing?.address_1 || undefined,
            city: billing?.city || undefined,
            state: billing?.state || undefined,
            zipCode: billing?.postcode || undefined,
            country: billing?.country || undefined,
          },
          create: {
            email: customerEmail,
            name: customerName,
            phone: billing?.phone || '',
            address: billing?.address_1 || '',
            city: billing?.city || '',
            state: billing?.state || '',
            zipCode: billing?.postcode || '',
            country: billing?.country || '',
          },
        })
      }

      syncedCount++
    }

    // Save credentials to SystemSettings
    await db.systemSettings.upsert({ where: { key: 'wc_store_url' }, update: { value: cleanUrl }, create: { key: 'wc_store_url', value: cleanUrl } })
    await db.systemSettings.upsert({ where: { key: 'wc_consumer_key' }, update: { value: consumer_key }, create: { key: 'wc_consumer_key', value: consumer_key } })
    await db.systemSettings.upsert({ where: { key: 'wc_consumer_secret' }, update: { value: consumer_secret }, create: { key: 'wc_consumer_secret', value: consumer_secret } })

    // Save last sync time
    const syncTime = new Date().toISOString()
    await db.systemSettings.upsert({ where: { key: 'wc_last_sync' }, update: { value: syncTime }, create: { key: 'wc_last_sync', value: syncTime } })

    return NextResponse.json({
      success: true,
      count: syncedCount,
      totalOrders: parseInt(totalCount, 10),
      lastSync: syncTime,
    })
  } catch (error: unknown) {
    console.error('Test connection error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = msg.includes('timeout') || msg.includes('aborted') || msg.includes('TimeoutError')
    const isNetwork = msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')
    if (isTimeout) return NextResponse.json({ success: false, error: 'Connection timed out (15s). Check if your store is reachable.' })
    if (isNetwork) return NextResponse.json({ success: false, error: 'Could not resolve your store URL. Please check the URL and try again.' })
    return NextResponse.json({ success: false, error: `Connection failed: ${msg}` })
  }
}

async function handleDisconnect() {
  // Delete WC credentials but keep other settings
  const keysToDelete = ['wc_store_url', 'wc_consumer_key', 'wc_consumer_secret', 'wc_last_sync', 'wc_webhook_secret']
  for (const key of keysToDelete) {
    try {
      await db.systemSettings.delete({ where: { key } })
    } catch {
      // Key may not exist
    }
  }

  return NextResponse.json({ success: true, message: 'WooCommerce disconnected successfully' })
}
