'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  UserPlus,
  Activity,
  Wifi,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Mail,
  Database,
  Globe,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Store,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'
import { cn } from '@/lib/utils'

// ─── Chart Configuration ────────────────────────────────────────────────

const signupChartConfig = {
  count: {
    label: 'Signups',
    color: 'hsl(160, 84%, 39%)',
  },
} satisfies ChartConfig

const revenueChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(350, 89%, 60%)',
  },
} satisfies ChartConfig

// ─── Type Definitions ───────────────────────────────────────────────────

interface DailySignup {
  date: string
  count: number
}

interface DailyRevenue {
  date: string
  revenue: number
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
  dailyRevenue?: DailyRevenue[]
  users: UserRecord[]
  emailConfigured: boolean
  emailProvider: string
}

interface ActivityEvent {
  id: string
  type: 'signup' | 'wc_connect' | 'login' | 'order'
  title: string
  timestamp: string
}

// ─── Currency Formatter ─────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  notation: 'compact',
})

// ─── KPI Card Component ────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendUp,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  trend?: string
  trendUp?: boolean
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('rounded-lg p-2.5', color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {trend && (
            <span
              className={cn(
                'mb-0.5 flex items-center gap-0.5 text-xs font-medium',
                trendUp ? 'text-emerald-600' : 'text-rose-500'
              )}
            >
              <TrendingUp className={cn('h-3 w-3', !trendUp && 'rotate-180')} />
              {trend}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-3 w-36" />
      </CardContent>
    </Card>
  )
}

// ─── Role Badge Helper ─────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  if (role === 'super_admin') {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300">
        Super Admin
      </Badge>
    )
  }
  if (role === 'admin') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300">
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">{role.replace(/_/g, ' ')}</Badge>
  )
}

// ─── WC Connection Badge Helper ─────────────────────────────────────────

function WcConnectionBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300">
        <Wifi className="mr-1 h-3 w-3" />
        Connected
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400">
      Disconnected
    </Badge>
  )
}

// ─── Activity Feed Item ────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ActivityEvent['type'] }) {
  switch (type) {
    case 'signup':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      )
    case 'wc_connect':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
          <Wifi className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
      )
    case 'login':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      )
    case 'order':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
      )
    default:
      return null
  }
}

// ─── Service Status Card ───────────────────────────────────────────────

function ServiceStatusCard({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  status,
  statusColor,
  badgeVariant,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  iconColor: string
  status: string
  statusColor: string
  badgeVariant: 'active' | 'warning' | 'healthy'
}) {
  const badgeClass = {
    active: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300',
    healthy: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300',
  }[badgeVariant]

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', iconColor)}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Badge className={badgeClass}>{status}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminView() {
  const [data, setData] = useState<AdminStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch admin stats')
      const json: AdminStatsData = await res.json()
      setData(json)
    } catch {
      setError('Failed to load platform dashboard data')
      toast.error('Failed to load platform dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // ─── Derived Data ──────────────────────────────────────────────────────

  const topStores = useMemo(() => {
    if (!data) return []
    return [...data.users]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [data])

  const recentActivity = useMemo(() => {
    if (!data) return []
    const events: ActivityEvent[] = []

    // Build recent events from user data
    for (const user of data.users) {
      events.push({
        id: `${user.id}-signup`,
        type: 'signup',
        title: `${user.name || user.email} joined the platform`,
        timestamp: user.createdAt,
      })
      if (user.wcConnected) {
        events.push({
          id: `${user.id}-wc`,
          type: 'wc_connect',
          title: `${user.name || user.email} connected WooCommerce`,
          timestamp: user.createdAt,
        })
      }
      if (user.lastLoginAt) {
        events.push({
          id: `${user.id}-login`,
          type: 'login',
          title: `${user.name || user.email} logged in`,
          timestamp: user.lastLoginAt,
        })
      }
    }

    // Sort by most recent first and limit to 8
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    return events.slice(0, 8)
  }, [data])

  const platformGrowth = useMemo(() => {
    if (!data || data.dailySignups.length < 2) return null
    const last7 = data.dailySignups.slice(-7)
    const prev7 = data.dailySignups.slice(-14, -7)
    const lastSum = last7.reduce((s, d) => s + d.count, 0)
    const prevSum = prev7.reduce((s, d) => s + d.count, 0)
    if (prevSum === 0) return lastSum > 0 ? '+100%' : '0%'
    const growth = ((lastSum - prevSum) / prevSum) * 100
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`
  }, [data])

  const avgOrderValue = useMemo(() => {
    if (!data || data.totalOrders === 0) return '₹0'
    return currencyFormatter.format(data.totalRevenue / data.totalOrders)
  }, [data])

  // ─── Error State ─────────────────────────────────────────────────────

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <p className="text-lg font-semibold">{error}</p>
        <p className="text-sm text-muted-foreground">
          Please check your connection and try again.
        </p>
        <Button onClick={fetchStats} variant="outline" className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Platform Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time platform metrics and key performance indicators
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live data
            <span className="text-xs">
              · Updated{' '}
              {formatDistanceToNow(new Date(), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>

      {/* ── 1. KPI Stat Cards (8 cards) ─────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </>
        ) : data ? (
          <>
            <StatCard
              title="Total Users"
              value={data.totalUsers.toLocaleString()}
              subtitle={`${data.superAdminCount} super admins, ${data.regularAdminCount} admins`}
              icon={Users}
              color="bg-emerald-600"
            />
            <StatCard
              title="New Signups Today"
              value={data.todaySignups}
              subtitle={`${data.weekSignups} this week · ${data.monthSignups} this month`}
              icon={UserPlus}
              color="bg-blue-600"
            />
            <StatCard
              title="Active Users (7d)"
              value={data.activeUsers.toLocaleString()}
              subtitle={`${data.totalUsers > 0 ? ((data.activeUsers / data.totalUsers) * 100).toFixed(1) : 0}% of total users`}
              icon={Activity}
              color="bg-amber-600"
            />
            <StatCard
              title="WC Connected"
              value={data.wcConnectedCount}
              subtitle={`${data.totalUsers > 0 ? ((data.wcConnectedCount / data.totalUsers) * 100).toFixed(1) : 0}% connection rate`}
              icon={Wifi}
              color="bg-purple-600"
            />
            <StatCard
              title="Total Orders"
              value={data.totalOrders.toLocaleString()}
              subtitle={`From ${data.totalCustomers.toLocaleString()} customers`}
              icon={ShoppingCart}
              color="bg-teal-600"
            />
            <StatCard
              title="Total Revenue"
              value={compactCurrencyFormatter.format(data.totalRevenue)}
              subtitle={`${data.totalProducts} products listed`}
              icon={DollarSign}
              color="bg-rose-600"
            />
            <StatCard
              title="Avg Order Value"
              value={avgOrderValue}
              subtitle="Per order average"
              icon={TrendingUp}
              color="bg-cyan-600"
            />
            <StatCard
              title="Platform Growth"
              value={platformGrowth || 'N/A'}
              subtitle="7-day vs previous 7-day signups"
              icon={TrendingUp}
              color="bg-emerald-600"
              trend={platformGrowth || undefined}
              trendUp={platformGrowth ? !platformGrowth.startsWith('-') : true}
            />
          </>
        ) : null}
      </div>

      {/* ── 2. Charts: User Growth + Revenue Trend ───────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              User Growth Trend
            </CardTitle>
            <CardDescription>
              Daily new user signups over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : data && data.dailySignups.length > 0 ? (
              <ChartContainer
                config={signupChartConfig}
                className="h-[300px] w-full"
              >
                <AreaChart
                  data={data.dailySignups}
                  margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-count)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-count)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    strokeDashoffset="3"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickMargin={8}
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
                        formatter={(value, _name, _item, index) => [
                          `${value} new signups`,
                          'Signups',
                        ]}
                      />
                    }
                  />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="url(#fillSignups)"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: 'var(--background)',
                    }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-10 w-10 opacity-30" />
                <p className="text-sm">No signup data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-rose-600" />
              Revenue Trend
            </CardTitle>
            <CardDescription>
              Daily revenue performance over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : data && data.dailyRevenue && data.dailyRevenue.length > 0 ? (
              <ChartContainer
                config={revenueChartConfig}
                className="h-[300px] w-full"
              >
                <BarChart
                  data={data.dailyRevenue}
                  margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    strokeDashoffset="3"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickMargin={8}
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
                    tickFormatter={(value: number) =>
                      compactCurrencyFormatter.format(value)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => String(label)}
                        formatter={(value) => [
                          currencyFormatter.format(Number(value)),
                          'Revenue',
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--color-revenue)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <DollarSign className="h-10 w-10 opacity-30" />
                <p className="text-sm">Revenue data will appear here as orders come in</p>
                <p className="text-xs">
                  Current total:{' '}
                  {data ? currencyFormatter.format(data.totalRevenue) : '₹0'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Recent Activity + Top Stores ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform events and user actions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <ScrollArea className="h-[380px] pr-4">
                <div className="space-y-4">
                  {recentActivity.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3"
                    >
                      <ActivityIcon type={event.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(event.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <Zap className="h-10 w-10 opacity-30" />
                <p className="text-sm">No recent activity yet</p>
                <p className="text-xs">
                  Activity will appear here as users sign up and connect stores
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Stores Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-teal-600" />
              Top Stores Performance
            </CardTitle>
            <CardDescription>
              Stores ranked by total revenue generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : topStores.length > 0 ? (
              <ScrollArea className="h-[380px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Owner</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Email
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Role
                      </TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">
                        Revenue
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStores.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                              {index + 1}
                            </div>
                            <span className="font-medium truncate max-w-[120px]">
                              {user.name || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs truncate max-w-[160px]">
                          {user.email}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {user.orderCount}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell font-mono text-sm">
                          {currencyFormatter.format(user.revenue)}
                        </TableCell>
                        <TableCell>
                          <WcConnectionBadge connected={user.wcConnected} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <Store className="h-10 w-10 opacity-30" />
                <p className="text-sm">No stores with revenue data yet</p>
                <p className="text-xs">
                  Stores will appear here once they start generating orders
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 4. System Status Quick View ──────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          System Status
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ServiceStatusCard
              title="Email Service"
              subtitle={
                data.emailConfigured
                  ? `Provider: ${data.emailProvider || 'Configured'}`
                  : 'Using development sandbox mode'
              }
              icon={Mail}
              iconColor="bg-emerald-600"
              status={data.emailConfigured ? 'Active' : 'Sandbox'}
              statusColor=""
              badgeVariant={data.emailConfigured ? 'active' : 'warning'}
            />
            <ServiceStatusCard
              title="Database"
              subtitle="SQLite — Primary data store"
              icon={Database}
              iconColor="bg-amber-600"
              status="Connected"
              statusColor=""
              badgeVariant="healthy"
            />
            <ServiceStatusCard
              title="API Service"
              subtitle={`Serving ${data.totalUsers} users`}
              icon={Globe}
              iconColor="bg-teal-600"
              status="Operational"
              statusColor=""
              badgeVariant="active"
            />
          </div>
        ) : null}
      </div>

      {/* ── Error banner (when there is previous data but fetch failed) ── */}
      {error && data && (
        <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed to refresh data. Showing cached results.</span>
            </div>
            <Button
              onClick={fetchStats}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
