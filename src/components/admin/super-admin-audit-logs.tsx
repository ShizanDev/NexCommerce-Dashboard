'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ScrollText,
  RefreshCw,
  AlertTriangle,
  Search,
  ShieldCheck,
  Clock,
  UserPlus,
  Settings,
  Server,
  UserX,
  Trash2,
  MonitorUp,
  ChevronDown,
  ChevronUp,
  Info,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'

// ─── Type Definitions ───────────────────────────────────────────────

interface AuditLog {
  id: string
  userId: string
  userName: string
  userEmail: string
  action: string
  target: string
  details: string
  ipAddress: string
  createdAt: string
}

interface AuditLogsResponse {
  logs: AuditLog[]
}

// ─── Action Categories ───────────────────────────────────────────────

type ActionCategory = 'all' | 'user' | 'system' | 'settings'

const actionCategories: { value: ActionCategory; label: string }[] = [
  { value: 'all', label: 'All Actions' },
  { value: 'user', label: 'User Actions' },
  { value: 'system', label: 'System Actions' },
  { value: 'settings', label: 'Settings' },
]

function categorizeAction(action: string): ActionCategory {
  if (action.startsWith('user.')) return 'user'
  if (action.startsWith('system.') || action === 'system.backup') return 'system'
  if (action.startsWith('settings.') || action === 'settings.update') return 'settings'
  return 'system'
}

// ─── Action Icons ───────────────────────────────────────────────────

function getActionIcon(action: string) {
  switch (action) {
    case 'user.create':
      return <UserPlus className="h-3.5 w-3.5" />
    case 'user.suspend':
    case 'user.delete':
      return <UserX className="h-3.5 w-3.5" />
    case 'user.role_change':
      return <ShieldCheck className="h-3.5 w-3.5" />
    case 'user.login':
      return <MonitorUp className="h-3.5 w-3.5" />
    case 'settings.update':
      return <Settings className="h-3.5 w-3.5" />
    case 'system.backup':
      return <Server className="h-3.5 w-3.5" />
    default:
      return <Clock className="h-3.5 w-3.5" />
  }
}

// ─── Action Badge Colors ──────────────────────────────────────────────

function getActionBadgeClasses(action: string) {
  const category = categorizeAction(action)
  switch (category) {
    case 'user':
      return 'bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300'
    case 'system':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300'
    case 'settings':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300'
    default:
      return ''
  }
}

// ─── Format Action Label ────────────────────────────────────────────

function formatActionLabel(action: string): string {
  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

// ─── Relative Time ───────────────────────────────────────────────────

function RelativeTime({ date }: { date: string }) {
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }, [date])

  const exactTime = useMemo(() => {
    try {
      return format(new Date(date), 'MMM dd, yyyy HH:mm:ss')
    } catch {
      return ''
    }
  }, [date])

  return (
    <span title={exactTime} className="text-sm text-muted-foreground tabular-nums">
      {timeAgo}
    </span>
  )
}

// ─── Audit Log Row ───────────────────────────────────────────────────

function AuditLogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-accent/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Action + User */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Action Badge */}
          <div className="shrink-0">
            <Badge
              variant="secondary"
              className={`gap-1.5 text-xs font-medium whitespace-nowrap ${getActionBadgeClasses(log.action)}`}
            >
              {getActionIcon(log.action)}
              {formatActionLabel(log.action)}
            </Badge>
          </div>

          {/* User Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {log.userName || 'System'}
            </p>
            {log.userEmail && (
              <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
            )}
          </div>
        </div>

        {/* Right: Timestamp */}
        <div className="shrink-0 flex items-center gap-2 sm:text-right">
          <RelativeTime date={log.createdAt} />
        </div>
      </div>

      {/* Target & IP */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {log.target && (
          <span>
            <span className="font-medium text-foreground/70">Target:</span>{' '}
            {log.target}
          </span>
        )}
        {log.ipAddress && (
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {log.ipAddress}
          </span>
        )}
      </div>

      {/* Expandable Details */}
      {log.details && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          {expanded && (
            <div className="mt-1.5 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {log.details}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<ActionCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  async function fetchLogs() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet('/api/admin/audit-logs')
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      const json: AuditLogsResponse = await res.json()
      setLogs(json.logs || [])
    } catch {
      setError('Failed to load audit logs')
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // ─── Filter & Search ─────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    let result = logs

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter((log) => categorizeAction(log.action) === filterCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (log) =>
          log.userName.toLowerCase().includes(q) ||
          log.userEmail.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.target.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.ipAddress.toLowerCase().includes(q)
      )
    }

    return result
  }, [logs, filterCategory, searchQuery])

  // ─── Error State ──────────────────────────────────────────────────

  if (error && !logs.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button onClick={fetchLogs} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 view-enter">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track platform activity and security events
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {actionCategories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={filterCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory(cat.value)}
                  className={
                    filterCategory === cat.value
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : ''
                  }
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Logs List ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-3">
          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} log entries
          </p>

          {/* Log Entries */}
          {filteredLogs.map((log) => (
            <AuditLogRow key={log.id} log={log} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="rounded-full bg-muted p-4">
              <ScrollText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No audit logs recorded yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {searchQuery || filterCategory !== 'all'
                ? 'No logs match your current filters. Try adjusting your search criteria.'
                : 'Audit logs will appear here as platform actions are performed.'}
            </p>
            {(searchQuery || filterCategory !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterCategory('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Info Card ──────────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="shrink-0 rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/40">
              <Info className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">What gets logged?</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                The audit trail records all significant platform actions for security and accountability.
                This includes user creation, role changes, account suspensions, login events,
                system-level configuration changes, and administrative actions. Each entry captures
                the acting user, timestamp, action performed, target affected, and relevant details.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300">
                  <UserPlus className="mr-1 h-3 w-3" /> User Events
                </Badge>
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300">
                  <Server className="mr-1 h-3 w-3" /> System Events
                </Badge>
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Settings className="mr-1 h-3 w-3" /> Settings Changes
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
