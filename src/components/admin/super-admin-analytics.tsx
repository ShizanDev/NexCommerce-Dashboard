'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'

// ─── Chart Configurations ─────────────────────────────────────────────

const signupChartConfig = {
  count: {
    label: 'Signups',
    color: '#059669',
  },
} satisfies ChartConfig

const revenueChartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#d97706',
  },
} satisfies ChartConfig

const compositionChartConfig = {
  active: {
    label: 'Active Users',
    color: '#059669',
  },
  suspended: {
    label: 'Suspended',
    color: '#dc2626',
  },
  wcConnected: {
    label: 'WC Connected',
    color: '#d97706',
  },
  wcNotConnected: {
    label: 'WC Not Connected',
    color: '#d4d4d4',
  },
} satisfies ChartConfig

// ─── Type Definitions ───────────────────────────────────────────────

interface DailySignup {
  date: string
  count: number
}

interface UserRecord {
  id: string
  email: string
  name: string
  role: string
  lastLoginAt: string | null
  createdAt: string
  wcConnected: boolean
  orderCount: number
  customerCount: number
  productCount: number
  revenue: number
}

interface AdminStatsData {
  totalUsers: number
  todaySignups: number
  weekSignups: number
  monthSignups: number
  activeUsers: number
  wcConnectedCount: number
  superAdminCount: number
  regularAdminCount: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  totalRevenue: number
  dailySignups: DailySignup[]
  users: UserRecord[]
  emailConfigured: boolean
  emailProvider: string
}

// ─── Currency Formatter ──────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

// ─── Summary Card Component ──────────────────────────────────────────

function SummaryCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color,
}: {
  title: string
  value: string
  icon: React.ElementType
  trend: 'up' | 'down' | 'neutral'
  trendLabel: string
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && (
            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
          )}
          {trend === 'down' && (
            <ArrowDownRight className="h-3 w-3 text-red-500" />
          )}
          <span
            className={`text-xs ${
              trend === 'up'
                ? 'text-emerald-600 dark:text-emerald-400'
                : trend === 'down'
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-muted-foreground'
            }`}
          >
            {trendLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  )
}

// ─── WC Status Badge ─────────────────────────────────────────────────

function WcStatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300">
      Connected
    </Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400">
      Not Connected
    </Badge>
  )
}

// ─── Composition Chart Colors ────────────────────────────────────────

const COMPOSITION_COLORS = ['#059669', '#dc2626', '#d97706', '#d4d4d4']

// ─── Main Component ─────────────────────────────────────────────────

export default function SuperAdminAnalytics() {
  const [data, setData] = useState<AdminStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch analytics data')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load platform analytics')
      toast.error('Failed to load platform analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // ─── Derived Data ─────────────────────────────────────────────────

  const topRevenueStores = data
    ? [...data.users]
        .filter((u) => u.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((u) => ({
          name: u.name || u.email.split('@')[0],
          revenue: Math.round(u.revenue),
        }))
    : []

  const topActiveUsers = data
    ? [...data.users]
        .filter((u) => u.orderCount > 0)
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5)
    : []

  const suspendedCount = data
    ? data.users.filter(
        (u) => u.role === 'suspended' || u.status === 'suspended'
      ).length
    : 0

  const compositionData = data
    ? [
        { name: 'Active Users', value: data.totalUsers - suspendedCount },
        { name: 'Suspended', value: suspendedCount },
        { name: 'WC Connected', value: data.wcConnectedCount },
        { name: 'WC Not Connected', value: data.totalUsers - data.wcConnectedCount },
      ]
    : []

  const avgOrderValue =
    data && data.totalOrders > 0
      ? data.totalRevenue / data.totalOrders
      : 0

  // ─── Error State ──────────────────────────────────────────────────

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button onClick={fetchStats} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Revenue, growth, and store performance insights
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── 1. Summary Cards Row ──────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : data ? (
          <>
            <SummaryCard
              title="Total Revenue"
              value={currencyFormatter.format(data.totalRevenue)}
              icon={DollarSign}
              color="bg-emerald-600"
              trend={data.totalRevenue > 0 ? 'up' : 'neutral'}
              trendLabel={
                data.totalRevenue > 0
                  ? `Across ${data.totalOrders} orders`
                  : 'No revenue yet'
              }
            />
            <SummaryCard
              title="Total Orders"
              value={data.totalOrders.toLocaleString()}
              icon={ShoppingCart}
              color="bg-amber-600"
              trend={data.weekSignups > 0 ? 'up' : 'neutral'}
              trendLabel={`${data.weekSignups} new users this week`}
            />
            <SummaryCard
              title="Avg Order Value"
              value={currencyFormatter.format(avgOrderValue)}
              icon={TrendingUp}
              color="bg-teal-600"
              trend="neutral"
              trendLabel="Platform average"
            />
            <SummaryCard
              title="Total Customers"
              value={data.totalCustomers.toLocaleString()}
              icon={Users}
              color="bg-rose-600"
              trend={data.totalCustomers > 0 ? 'up' : 'neutral'}
              trendLabel={`From ${data.wcConnectedCount} stores`}
            />
          </>
        ) : null}
      </div>

      {/* ── 2. User Growth Chart ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            User Growth
          </CardTitle>
          <CardDescription>New user signups over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : data && data.dailySignups.length > 0 ? (
            <ChartContainer config={signupChartConfig} className="h-[300px] w-full">
              <AreaChart data={data.dailySignups} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value: string) => {
                    try {
                      return format(new Date(value), 'MMM dd')
                    } catch {
                      return value
                    }
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => String(label)}
                      formatter={(value) => [`${value} signups`, 'New Users']}
                    />
                  }
                />
                <defs>
                  <linearGradient id="fillSignupsAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="count"
                  type="monotone"
                  fill="url(#fillSignupsAnalytics)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No signup data available for the last 30 days
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Charts Row: Revenue Distribution + Composition ────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Distribution - Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-600" />
              Revenue by Store
            </CardTitle>
            <CardDescription>Top stores by revenue contribution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : topRevenueStores.length > 0 ? (
              <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
                <BarChart
                  data={topRevenueStores}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={100}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          currencyFormatter.format(value as number),
                          'Revenue',
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#d97706"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                No revenue data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Composition - Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Platform Composition
            </CardTitle>
            <CardDescription>User status and WooCommerce connectivity breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : data ? (
              <ChartContainer config={compositionChartConfig} className="h-[280px] w-full">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="name"
                        formatter={(value, name) => [
                          `${value} (${data.totalUsers > 0 ? ((Number(value) / data.totalUsers) * 100).toFixed(1) : 0}%)`,
                          name,
                        ]}
                      />
                    }
                  />
                  <Pie
                    data={compositionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    cornerRadius={3}
                  >
                    {compositionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                No composition data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 4. User Activity Table ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            Most Active Stores
          </CardTitle>
          <CardDescription>Top 5 users by order count</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topActiveUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Owner</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="hidden md:table-cell">Revenue</TableHead>
                  <TableHead className="hidden lg:table-cell">Customers</TableHead>
                  <TableHead className="text-right">WC Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topActiveUsers.map((user, idx) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                            idx === 0
                              ? 'bg-amber-500'
                              : idx === 1
                                ? 'bg-gray-400'
                                : idx === 2
                                  ? 'bg-amber-700'
                                  : 'bg-gray-300'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span className="font-medium">{user.name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {user.orderCount}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {currencyFormatter.format(user.revenue)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.customerCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <WcStatusBadge connected={user.wcConnected} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No active stores with orders yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
