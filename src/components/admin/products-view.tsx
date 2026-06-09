'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, RefreshCw, Package, ImageOff } from 'lucide-react'
import { apiGet } from '@/lib/api-fetch'
import { toast } from 'sonner'

const getCurrencyFormatter = (currency?: string) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: currency || 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

interface WCProduct {
  id: number
  name: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  stock_status: string
  stock_quantity: number | null
  status: string
  images: { src: string; alt: string }[]
  categories: { name: string }[]
  permalink: string
}

export default function ProductsView() {
  const [products, setProducts] = useState<WCProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currency, setCurrency] = useState('INR')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/api/woocommerce/products')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProducts(data.products || [])
      if (data.currency) setCurrency(data.currency)
    } catch {
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1">Browse products from your WooCommerce store</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <button onClick={fetchProducts} className="p-2 border rounded-md hover:bg-accent">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm">Connect your WooCommerce store to see products</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => {
            const imageUrl = product.images?.[0]?.src
            const category = product.categories?.[0]?.name

            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <Badge
                    variant="secondary"
                    className={`absolute top-2 right-2 ${
                      product.stock_status === 'instock'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300'
                    }`}
                  >
                    {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </div>
                <CardContent className="p-4 space-y-1.5">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
                  {category && <p className="text-xs text-muted-foreground">{category}</p>}
                  {product.sku && <p className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {getCurrencyFormatter(currency).format(parseFloat(product.price) || 0)}
                    </span>
                    {product.sale_price && parseFloat(product.sale_price) < parseFloat(product.regular_price) && (
                      <span className="text-sm text-muted-foreground line-through">
                        {getCurrencyFormatter(currency).format(parseFloat(product.regular_price) || 0)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filtered.length} of {products.length} products
        </p>
      )}
    </div>
  )
}
