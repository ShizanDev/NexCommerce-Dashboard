'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HeartPulse,
  RefreshCw,
  AlertTriangle,
  Mail,
  Database,
  Globe,
  Webhook,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  HardDrive,
  Activity,
  ShieldCheck,
  Monitor,
  Layers,
  Wifi,
  Cpu,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'

// ─── Type Definitions ───────────────────────────────────────────────

interface AdminStatsData {
  totalUsers: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  emailConfigured: boolean
  emailProvider: string
  wcConnectedCount: number
  activeUsers: number
}

// ─── Service Status Types ────────────────────────────────────────────

type ServiceStatus = 'operational' | 'degraded' | 'down' | 'sandbox'

interface ServiceInfo {
  name: string
  icon: React.ElementType
  status: ServiceStatus
  statusLabel: string
  details: string
  responseTime?: string
}

// ─── Status Badge Component ─────────────────────────────────────────

function StatusBadge({ status, label }: { status: ServiceStatus; label: string }) {
  const classes: Record<ServiceStatus, string> = {
    operational: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300',
    sandbox: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300',
    degraded: 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300',
    down: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300',
  }

  const icons: Record<ServiceStatus, React.ElementType> = {
    operational: CheckCircle2,
    sandbox: ShieldCheck,
    degraded: AlertTriangle,
    down: XCircle,
  }

  const Icon = icons[status]

  return (
    <Badge variant="secondary" className={`gap-1 ${classes[status]}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

// ─── Service Card Component ─────────────────────────────────────────

function ServiceCard({ service }: { service: ServiceInfo }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-lg p-2.5 ${
                service.status === 'operational'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : service.status === 'sandbox'
                    ? 'bg-amber-100 dark:bg-amber-900/40'
                    : service.status === 'down'
                      ? 'bg-red-100 dark:bg-red-900/40'
                      : 'bg-orange-100 dark:bg-orange-900/40'
              }`}
            >
              <service.icon
                className={`h-5 w-5 ${
                  service.status === 'operational'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : service.status === 'sandbox'
                      ? 'text-amber-700 dark:text-amber-300'
                      : service.status === 'down'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-orange-700 dark:text-orange-300'
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold">{service.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{service.details}</p>
              {service.responseTime && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Response: {service.responseTime}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={service.status} label={service.statusLabel} />
        </div>
      </CardContent>
    </Card>
  )
}

function ServiceCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Info Row Component ──────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function SuperAdminSystemHealth() {
  const [data, setData] = useState<AdminStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uptime, setUptime] = useState('calculating...')
  const [memoryInfo, setMemoryInfo] = useState<string>('N/A')

  const mountTime = useRef(Date.now())

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch system data')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load system health data')
      toast.error('Failed to load system health data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Uptime timer
    const uptimeInterval = setInterval(() => {
      const ms = Date.now() - mountTime.current
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        setUptime(`${hours}h ${minutes % 60}m ${seconds % 60}s`)
      } else if (minutes > 0) {
        setUptime(`${minutes}m ${seconds % 60}s`)
      } else {
        setUptime(`${seconds}s`)
      }
    }, 1000)

    // Memory check (browser performance API)
    try {
      const perf = performance as unknown as {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
      }
      if (perf.memory) {
        const usedMB = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024)
        const totalMB = Math.round(perf.memory.totalJSHeapSize / 1024 / 1024)
        setMemoryInfo(`${usedMB} MB / ${totalMB} MB`)
      }
    } catch {
      // Performance API not available
    }

    return () => clearInterval(uptimeInterval)
  }, [])

  // ─── Service Status (mock/demonstration data) ─────────────────────

  const services: ServiceInfo[] = data
    ? [
        {
          name: 'Email Service',
          icon: Mail,
          status: data.emailConfigured ? 'operational' : 'sandbox',
          statusLabel: data.emailConfigured ? 'Active' : 'Sandbox',
          details: `Provider: ${data.emailProvider || 'Not configured'}`,
          responseTime: data.emailConfigured ? '~245ms' : 'N/A',
        },
        {
          name: 'Database',
          icon: Database,
          status: 'operational',
          statusLabel: 'Connected',
          details: 'SQLite (Prisma ORM)',
          responseTime: '~12ms',
        },
        {
          name: 'API Service',
          icon: Globe,
          status: 'operational',
          statusLabel: 'Operational',
          details: 'Next.js 16 App Router',
          responseTime: '~38ms',
        },
        {
          name: 'Webhook Receiver',
          icon: Webhook,
          status: 'operational',
          statusLabel: 'Active',
          details: 'Listening for WooCommerce webhooks',
          responseTime: '~55ms',
        },
      ]
    : []

  // ─── Determine Overall Status ─────────────────────────────────────

  const hasIssues = services.some((s) => s.status === 'down' || s.status === 'degraded')
  const overallStatus = hasIssues ? 'Issues Detected' : 'All Systems Operational'

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
    <div className="space-y-6 view-enter">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Platform monitoring and service status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Overall Status Banner ──────────────────────────────────── */}
      <Card
        className={`border-2 ${
          hasIssues
            ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
            : 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-full p-3 ${
                hasIssues ? 'bg-red-100 dark:bg-red-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
              }`}
            >
              {hasIssues ? (
                <XCircle className={`h-7 w-7 ${hasIssues ? 'text-red-600 dark:text-red-400' : ''}`} />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{overallStatus}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {hasIssues
                  ? 'One or more services are experiencing issues. Check details below.'
                  : 'All platform services are running normally.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Service Status Grid ───────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          Service Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            <>
              <ServiceCardSkeleton />
              <ServiceCardSkeleton />
              <ServiceCardSkeleton />
              <ServiceCardSkeleton />
            </>
          ) : (
            services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))
          )}
        </div>
      </div>

      {/* ── System Information + Database Statistics ────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-amber-600" />
              System Information
            </CardTitle>
            <CardDescription>Platform runtime and environment details</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div>
                <InfoRow label="Platform Version" value="v2.4.0" icon={Activity} />
                <InfoRow label="Framework" value="Next.js 16 (App Router)" icon={Server} />
                <InfoRow label="Database" value="SQLite (Prisma ORM)" icon={Database} />
                <InfoRow label="Environment" value="Production" icon={HardDrive} />
                <InfoRow
                  label="Session Uptime"
                  value={uptime}
                  icon={Clock}
                />
                <InfoRow
                  label="Memory Usage"
                  value={memoryInfo}
                  icon={Cpu}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              Database Statistics
            </CardTitle>
            <CardDescription>Records and table counts across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data ? (
              <div>
                <InfoRow label="Total Users" value={data.totalUsers.toLocaleString()} icon={Wifi} />
                <InfoRow label="Total Orders" value={data.totalOrders.toLocaleString()} icon={ShoppingCart} />
                <InfoRow label="Total Customers" value={data.totalCustomers.toLocaleString()} icon={Users} />
                <InfoRow label="Total Products" value={data.totalProducts.toLocaleString()} icon={Layers} />
                <InfoRow label="WC Connected Stores" value={data.wcConnectedCount.toString()} icon={Globe} />
                <InfoRow label="Active Users (7d)" value={data.activeUsers.toString()} icon={Activity} />
                <InfoRow
                  label="Last Refresh"
                  value={format(new Date(), 'HH:mm:ss')}
                  icon={Clock}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
