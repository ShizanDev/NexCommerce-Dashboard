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
    const settingsMap: Record<string, string> = {}
    userSettings.forEach((s) => { settingsMap[s.key] = s.value })

    const storeUrl = settingsMap.wc_store_url
    const consumerKey = settingsMap.wc_consumer_key
    const consumerSecret = settingsMap.wc_consumer_secret

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'WooCommerce credentials not configured' }, { status: 400 })
    }

    const cleanUrl = storeUrl.replace(/\/+$/, '')
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    // Fetch all products with pagination
    let page = 1
    let totalPages = 1
    const allProducts: Array<Record<string, unknown>> = []

    while (page <= totalPages) {
      const endpoint = `${cleanUrl}/wp-json/wc/v3/products?per_page=100&page=${page}`
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        break
      }

      const products = (await response.json()) as Array<Record<string, unknown>>
      allProducts.push(...products)

      const totalPagesHeader = response.headers.get('X-WP-TotalPages')
      if (totalPagesHeader) {
        totalPages = parseInt(totalPagesHeader, 10)
      }

      page++
    }

    // Sync products to local DB with userId
    for (const product of allProducts) {
      try {
        const images = product.images as Array<{ src: string }> | null
        const categories = product.categories as Array<{ name: string }> | null

        await db.product.upsert({
          where: { wooId: product.id as number },
          update: {
            userId,
            name: (product.name as string) || '',
            sku: (product.sku as string) || '',
            price: parseFloat(String(product.price || '0')) || 0,
            regularPrice: parseFloat(String(product.regular_price || '0')) || 0,
            salePrice: parseFloat(String(product.sale_price || '0')) || 0,
            stockStatus: (product.stock_status as string) || 'instock',
            stockQty: (product.stock_quantity as number) || 0,
            imageUrl: images?.[0]?.src || '',
            category: categories?.[0]?.name || '',
            status: (product.status as string) || 'publish',
          },
          create: {
            userId,
            wooId: product.id as number,
            name: (product.name as string) || '',
            sku: (product.sku as string) || '',
            price: parseFloat(String(product.price || '0')) || 0,
            regularPrice: parseFloat(String(product.regular_price || '0')) || 0,
            salePrice: parseFloat(String(product.sale_price || '0')) || 0,
            stockStatus: (product.stock_status as string) || 'instock',
            stockQty: (product.stock_quantity as number) || 0,
            imageUrl: images?.[0]?.src || '',
            category: categories?.[0]?.name || '',
            status: (product.status as string) || 'publish',
          },
        })
      } catch {
        // Skip products that fail to sync
      }
    }

    // Update user's last sync time
    await db.userSettings.upsert({
      where: { userId_key: { userId, key: 'wc_last_sync' } },
      update: { value: new Date().toISOString() },
      create: { userId, key: 'wc_last_sync', value: new Date().toISOString() },
    })

    return NextResponse.json({ products: allProducts, total: allProducts.length })
  } catch (error: unknown) {
    console.error('Products fetch error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch products: ${msg}` }, { status: 500 })
  }
}
