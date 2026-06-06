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
  Users,
  UserPlus,
  Activity,
  Wifi,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Mail,
  Monitor,
  ShieldCheck,
} from 'lucide-react'
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'

// ─── Chart Configuration ────────────────────────────────────────────────

const signupChartConfig = {
  count: {
    label: 'Signups',
    color: '#059669',
  },
} satisfies ChartConfig

// ─── Type Definitions ───────────────────────────────────────────────────

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

// ─── Currency Formatter ─────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

// ─── Stat Card Component ───────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ElementType
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
        <div className="text-2xl font-bold">{value}</div>
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
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  )
}

// ─── Role Badge Helper ──────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  if (role === 'super_admin') {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300">
        Owner
      </Badge>
    )
  }
  if (role === 'admin') {
    return (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300">
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      {role.replace(/_/g, ' ')}
    </Badge>
  )
}

// ─── WC Connection Badge Helper ─────────────────────────────────────────

function WcConnectionBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300">
        Connected
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400">
      Not Connected
    </Badge>
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
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load admin dashboard data')
      toast.error('Failed to load admin dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // ─── Error State ─────────────────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
        <p className="text-muted-foreground mt-1">System overview and user management</p>
      </div>

      {/* ── 1. Overview Stats (7 cards) ──────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : data ? (
          <>
            <StatCard
              title="Total Users"
              value={data.totalUsers}
              icon={Users}
              color="bg-emerald-600"
            />
            <StatCard
              title="New Signups Today"
              value={data.todaySignups}
              icon={UserPlus}
              color="bg-blue-600"
            />
            <StatCard
              title="Active Users (7 days)"
              value={data.activeUsers}
              icon={Activity}
              color="bg-amber-600"
            />
            <StatCard
              title="WC Connected"
              value={data.wcConnectedCount}
              icon={Wifi}
              color="bg-purple-600"
            />
            <StatCard
              title="Total Orders"
              value={data.totalOrders}
              icon={ShoppingCart}
              color="bg-teal-600"
            />
            <StatCard
              title="Total Customers"
              value={data.totalCustomers}
              icon={Users}
              color="bg-indigo-600"
            />
            <StatCard
              title="Total Revenue"
              value={currencyFormatter.format(data.totalRevenue)}
              icon={DollarSign}
              color="bg-rose-600"
            />
          </>
        ) : null}
      </div>

      {/* ── 2. User Signup Trend Chart ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>User Signup Trend</CardTitle>
          <CardDescription>Daily new signups over the last 30 days</CardDescription>
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
                  <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="count"
                  type="monotone"
                  fill="url(#fillSignups)"
                  stroke="#059669"
                  strokeWidth={2}
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

      {/* ── 3. User Management Table ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>All registered users and their store details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.users.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>WC Connected</TableHead>
                    <TableHead className="hidden md:table-cell">Orders</TableHead>
                    <TableHead className="hidden md:table-cell">Revenue</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        <WcConnectionBadge connected={user.wcConnected} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.orderCount}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {currencyFormatter.format(user.revenue)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {user.lastLoginAt
                          ? format(new Date(user.lastLoginAt), 'dd MMM, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {format(new Date(user.createdAt), 'dd MMM, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No users registered yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. System Status ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>Platform configuration and service status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Email Service */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/50">
                    <Mail className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Service</p>
                    <p className="text-xs text-muted-foreground">
                      Provider: {data.emailProvider || 'Not configured'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  {data.emailConfigured ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300">
                      Sandbox
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
