import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.systemSettings.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => { settingsMap[s.key] = s.value })

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
    const allProducts: any[] = []

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

      const products = await response.json()
      allProducts.push(...products)

      const totalPagesHeader = response.headers.get('X-WP-TotalPages')
      if (totalPagesHeader) {
        totalPages = parseInt(totalPagesHeader, 10)
      }

      page++
    }

    // Sync products to local DB
    for (const product of allProducts) {
      try {
        await db.product.upsert({
          where: { wooProductId: product.id.toString() },
          update: {
            name: product.name,
            sku: product.sku || '',
            price: parseFloat(product.price) || 0,
            regularPrice: parseFloat(product.regular_price) || 0,
            salePrice: parseFloat(product.sale_price) || 0,
            stockStatus: product.stock_status || 'instock',
            stockQuantity: product.stock_quantity || 0,
            imageUrl: product.images?.[0]?.src || '',
            category: product.categories?.[0]?.name || '',
            status: product.status || 'publish',
          },
          create: {
            wooProductId: product.id.toString(),
            name: product.name,
            sku: product.sku || '',
            price: parseFloat(product.price) || 0,
            regularPrice: parseFloat(product.regular_price) || 0,
            salePrice: parseFloat(product.sale_price) || 0,
            stockStatus: product.stock_status || 'instock',
            stockQuantity: product.stock_quantity || 0,
            imageUrl: product.images?.[0]?.src || '',
            category: product.categories?.[0]?.name || '',
            status: product.status || 'publish',
          },
        })
      } catch {
        // Skip products that fail to sync
      }
    }

    return NextResponse.json({ products: allProducts, total: allProducts.length })
  } catch (error: any) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: `Failed to fetch products: ${error.message}` }, { status: 500 })
  }
}
