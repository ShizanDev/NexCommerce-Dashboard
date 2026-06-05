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
    const order = (await request.json()) as Record<string, unknown>

    if (!order.id || !order.billing) {
      return NextResponse.json({ received: true, note: 'Not a valid WC order payload' })
    }

    const wooId = order.id as number
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
      name: li.name || '', sku: li.sku || '', quantity: li.quantity || 0,
      price: li.price || '0', total: li.total || '0',
    })))

    const wcStatus = (order.status as string) || 'pending'
    const paymentStatus = mapPaymentStatus(wcStatus, (order.date_paid as string) || null)

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

    console.log(`🔔 Webhook received: Order #${wooId} (${wcStatus}) from ${customerName}`)

    return NextResponse.json({ received: true, order_id: wooId })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ received: true, error: 'Failed to process webhook' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'woocommerce-webhook-receiver' })
}
