'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  'on-hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
}

const getCurrencyFormatter = (currency?: string) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: currency || 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

interface Order {
  id: string
  wooOrderId: string
  orderNumber: string
  customerName: string
  customerEmail: string
  total: number
  subtotal: number
  currency: string
  paymentMethod: string
  status: string
  paymentStatus: string
  itemsJson: string
  dateCreated: string
  dateModified: string
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await apiGet(`/api/woocommerce/orders?${params}`)
      const data: OrdersResponse = await res.json()
      setOrders(data.orders)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Calculate summary stats
  const totalRevenue = orders.reduce((sum, o) => (o.paymentStatus === 'paid' ? sum + o.total : sum), 0)
  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length
  const completedCount = orders.filter((o) => o.status === 'completed').length

  function handleOrderClick(order: Order) {
    setSelectedOrder(order)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage and track your WooCommerce orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-24" /> : getCurrencyFormatter().format(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : completedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer or order #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  let items: { name: string }[] = []
                  try {
                    items = JSON.parse(order.itemsJson)
                  } catch {
                    // ignore
                  }

                  return (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => handleOrderClick(order)}>
                      <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {items.length > 0
                          ? items.slice(0, 2).map((i) => i.name).join(', ') + (items.length > 2 ? ` +${items.length - 2}` : '')
                          : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{getCurrencyFormatter().format(order.total)}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize text-muted-foreground text-sm">
                        {order.paymentMethod.replace(/_/g, ' ') || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[order.status] || ''}>
                          {order.status.replace(/-/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(order.dateCreated), 'dd MMM yyyy')}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} &bull; {total} orders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            let items: any[] = []
            try {
              items = JSON.parse(selectedOrder.itemsJson)
            } catch {
              // ignore
            }

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Customer</span>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                    <p className="text-muted-foreground">{selectedOrder.customerEmail}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <Badge variant="secondary" className={statusColors[selectedOrder.status] || ''}>
                        {selectedOrder.status.replace(/-/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <p className="text-lg font-bold">{getCurrencyFormatter().format(selectedOrder.total)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Method</span>
                    <p className="font-medium capitalize">{selectedOrder.paymentMethod.replace(/_/g, ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p>{format(new Date(selectedOrder.dateCreated), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modified</span>
                    <p>{format(new Date(selectedOrder.dateModified), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                </div>

                {items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Items</h4>
                    <div className="border rounded-lg divide-y">
                      {items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 text-sm">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                          </div>
                          <div className="text-right">
                            <p>{getCurrencyFormatter().format(item.price)} x {item.quantity}</p>
                            <p className="font-medium">{getCurrencyFormatter().format(item.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
