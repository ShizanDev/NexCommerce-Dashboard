import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function mapPaymentStatus(status: string, datePaid: string | null): string {
  if (datePaid) return 'paid'
  if (status === 'completed' || status === 'processing') return 'paid'
  if (status === 'refunded') return 'refunded'
  if (status === 'failed' || status === 'cancelled') return 'failed'
  return status
}

export async function POST(request: NextRequest) {
  try {
    // Log incoming webhook for debugging
    const webhookTopic = request.headers.get('x-wc-webhook-topic') || 'unknown'
    const webhookSource = request.headers.get('x-wc-webhook-source') || 'unknown'
    console.log(`🔔 Incoming webhook: topic=${webhookTopic}, source=${webhookSource}`)

    let order: Record<string, unknown>
    try {
      order = await request.json()
    } catch {
      console.log('📧 Webhook: Could not parse JSON body, returning 200 OK')
      return NextResponse.json({ received: true, note: 'Payload acknowledged' })
    }

    // WooCommerce sends a test ping — just acknowledge it
    if (!order || !order.id) {
      console.log('📧 Webhook: No order ID in payload, returning 200 OK')
      return NextResponse.json({ received: true, note: 'No order ID — payload acknowledged' })
    }

    const wooId = parseInt(String(order.id), 10)
    if (isNaN(wooId) || wooId <= 0) {
      console.log(`📧 Webhook: Invalid order ID (${order.id}), returning 200 OK`)
      return NextResponse.json({ received: true, note: 'Invalid order ID — payload acknowledged' })
    }

    // If this is just a test/hook event without billing, acknowledge it
    const billing = order.billing as Record<string, string> | null
    const shipping = order.shipping as Record<string, string> | null
    const lineItems = order.line_items as Array<Record<string, unknown>> | null

    if (!billing) {
      console.log(`📧 Webhook: Order #${wooId} has no billing data, returning 200 OK`)
      return NextResponse.json({ received: true, note: 'No billing data — payload acknowledged' })
    }

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
      name: li.name || '', sku: li.sku || '', quantity: li.quantity || 0,
      price: li.price || '0', total: li.total || '0',
    })))

    const wcStatus = String(order.status || 'pending')
    const paymentStatus = mapPaymentStatus(wcStatus, order.date_paid ? String(order.date_paid) : null)

    await db.wooCommerceOrder.upsert({
      where: { wooOrderId: wooId },
      update: {
        orderNumber: String(order.number || wooId),
        status: wcStatus,
        customerName,
        customerEmail,
        itemsJson: itemsStr,
        totalAmount: parseFloat(String(order.total || '0')) || 0,
        currency: String(order.currency || 'INR'),
        paymentMethod: String(order.payment_method_title || ''),
        paymentStatus,
        billingAddress: billingAddr,
        shippingAddress: shippingAddr,
        customerNote: String(order.customer_note || ''),
        dateCreated: order.date_created ? new Date(String(order.date_created)) : new Date(),
        dateModified: order.date_modified ? new Date(String(order.date_modified)) : null,
        datePaid: order.date_paid ? new Date(String(order.date_paid)) : null,
        syncedAt: new Date(),
      },
      create: {
        wooOrderId: wooId,
        orderNumber: String(order.number || wooId),
        status: wcStatus,
        customerName,
        customerEmail,
        itemsJson: itemsStr,
        totalAmount: parseFloat(String(order.total || '0')) || 0,
        currency: String(order.currency || 'INR'),
        paymentMethod: String(order.payment_method_title || ''),
        paymentStatus,
        billingAddress: billingAddr,
        shippingAddress: shippingAddr,
        customerNote: String(order.customer_note || ''),
        dateCreated: order.date_created ? new Date(String(order.date_created)) : new Date(),
        dateModified: order.date_modified ? new Date(String(order.date_modified)) : null,
        datePaid: order.date_paid ? new Date(String(order.date_paid)) : null,
      },
    })

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

    // Update last sync time
    await db.systemSettings.upsert({
      where: { key: 'wc_last_sync' },
      update: { value: new Date().toISOString() },
      create: { key: 'wc_last_sync', value: new Date().toISOString() },
    })

    console.log(`✅ Webhook processed: Order #${wooId} (${wcStatus}) from ${customerName}`)

    return NextResponse.json({ received: true, order_id: wooId })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    // Still return 200 to WooCommerce so it doesn't retry
    return NextResponse.json({ received: true, error: 'Processed with warnings' })
  }
}

// WooCommerce may also send GET to test the endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'woocommerce-webhook-receiver' })
}

// Handle OPTIONS for CORS preflight (just in case)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-WC-Webhook-Signature, X-WC-Webhook-Topic, X-WC-Webhook-Source',
    },
  })
}
