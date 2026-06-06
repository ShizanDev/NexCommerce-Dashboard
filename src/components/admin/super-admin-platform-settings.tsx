'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Cog,
  RefreshCw,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Activity,
  Database,
  Server,
  Globe,
  UserPlus,
  UserCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  RotateCcw,
  Send,
  Info,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { apiGet, apiPost, apiPut } from '@/lib/api-fetch'

// ─── Type Definitions ───────────────────────────────────────────────

interface AdminStatsData {
  totalUsers: number
  emailConfigured: boolean
  emailProvider: string
}

interface PlatformSettings {
  allowRegistrations: boolean
  emailVerificationRequired: boolean
  firstUserIsSuperAdmin: boolean
}

// ─── Toggle Setting Row ────────────────────────────────────────────

function ToggleSetting({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  loading,
}: {
  icon: React.ElementType
  label: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
  loading?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3 flex-1">
        <div className="rounded-lg bg-muted p-2 mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={loading}
        aria-label={label}
      />
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function SuperAdminPlatformSettings() {
  const [statsData, setStatsData] = useState<AdminStatsData | null>(null)
  const [settings, setSettings] = useState<PlatformSettings>({
    allowRegistrations: true,
    emailVerificationRequired: true,
    firstUserIsSuperAdmin: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action loading states
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [savingRegistration, setSavingRegistration] = useState<string | null>(null)
  const [clearingLogs, setClearingLogs] = useState(false)
  const [resettingDemo, setResettingDemo] = useState(false)

  // ─── Fetch Functions ──────────────────────────────────────────────

  async function fetchStats() {
    try {
      const res = await apiGet('/api/admin/stats')
      if (!res.ok) return
      const json = await res.json()
      setStatsData(json)
    } catch {
      // Silent fail for stats
    }
  }

  async function fetchSettings() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet('/api/admin/platform-settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      const json = await res.json()
      if (json.settings) {
        setSettings((prev) => ({
          ...prev,
          allowRegistrations: json.settings.allowRegistrations ?? prev.allowRegistrations,
          emailVerificationRequired: json.settings.emailVerificationRequired ?? prev.emailVerificationRequired,
          firstUserIsSuperAdmin: json.settings.firstUserIsSuperAdmin ?? prev.firstUserIsSuperAdmin,
        }))
      }
    } catch {
      // Use defaults if settings endpoint fails
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchSettings()
  }, [])

  // ─── Action Handlers ───────────────────────────────────────────────

  async function handleSendTestEmail() {
    setSendingTestEmail(true)
    try {
      const res = await apiPost('/api/admin/platform-settings', {
        action: 'testEmail',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to send test email')
      }
      toast.success('Test email sent successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setSendingTestEmail(false)
    }
  }

  async function handleToggleSetting(key: keyof PlatformSettings, value: boolean) {
    setSavingRegistration(key)
    try {
      const res = await apiPut('/api/admin/platform-settings', {
        key,
        value,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update setting')
      }
      setSettings((prev) => ({ ...prev, [key]: value }))
      toast.success('Setting updated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update setting')
    } finally {
      setSavingRegistration(null)
    }
  }

  async function handleClearAuditLogs() {
    setClearingLogs(true)
    try {
      const res = await apiPost('/api/admin/platform-settings', {
        action: 'clearAuditLogs',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to clear audit logs')
      }
      toast.success('All audit logs cleared successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear audit logs')
    } finally {
      setClearingLogs(false)
    }
  }

  async function handleResetDemoData() {
    setResettingDemo(true)
    try {
      const res = await apiPost('/api/admin/platform-settings', {
        action: 'resetDemoData',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to reset demo data')
      }
      toast.success('Demo data reset successfully')
      // Refresh stats after reset
      fetchStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset demo data')
    } finally {
      setResettingDemo(false)
    }
  }

  // ─── Error State ──────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button onClick={fetchSettings} variant="outline">
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
          <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure global platform preferences and integrations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchSettings(); }} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Email Configuration Card ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Platform email service status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : statsData ? (
            <div className="space-y-4">
              {/* Status Row */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2.5 ${
                      statsData.emailConfigured
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : 'bg-amber-100 dark:bg-amber-900/40'
                    }`}
                  >
                    <Mail
                      className={`h-5 w-5 ${
                        statsData.emailConfigured
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Service</p>
                    <p className="text-xs text-muted-foreground">
                      Provider: {statsData.emailProvider || 'Not configured'}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    statsData.emailConfigured
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300'
                  }
                >
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  {statsData.emailConfigured ? 'Active' : 'Sandbox Mode'}
                </Badge>
              </div>

              {/* Info */}
              <div className="flex gap-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  {statsData.emailConfigured
                    ? 'Your email service is configured and ready to send transactional emails. Use the button below to verify the configuration.'
                    : 'Email service is running in sandbox mode. Configure SMTP credentials in environment variables to activate production email delivery.'}
                </p>
              </div>

              {/* Test Email Button */}
              <Button
                variant="outline"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail}
                className="w-full sm:w-auto"
              >
                {sendingTestEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Test Email
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Registration Settings Card ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-600" />
            Registration Settings
          </CardTitle>
          <CardDescription>
            Control how new users can join the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div>
              <ToggleSetting
                icon={UserPlus}
                label="Allow New Registrations"
                description="Enable or disable new user signups on the platform"
                checked={settings.allowRegistrations}
                onCheckedChange={(value) => handleToggleSetting('allowRegistrations', value)}
                loading={savingRegistration === 'allowRegistrations'}
              />
              <Separator />
              <ToggleSetting
                icon={Mail}
                label="Email Verification Required"
                description="Require email verification before users can access the platform"
                checked={settings.emailVerificationRequired}
                onCheckedChange={(value) => handleToggleSetting('emailVerificationRequired', value)}
                loading={savingRegistration === 'emailVerificationRequired'}
              />
              <Separator />
              <ToggleSetting
                icon={ShieldAlert}
                label="First User Is Super Admin"
                description="Automatically grant super admin privileges to the first registered user"
                checked={settings.firstUserIsSuperAdmin}
                onCheckedChange={(value) => handleToggleSetting('firstUserIsSuperAdmin', value)}
                loading={savingRegistration === 'firstUserIsSuperAdmin'}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Platform Information Card ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            Platform Information
          </CardTitle>
          <CardDescription>
            General platform details and statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : statsData ? (
            <div className="space-y-3">
              <InfoRow label="Platform Name" value="WC Dashboard" />
              <InfoRow label="Version" value="v2.4.0" />
              <InfoRow label="Environment" value="Production" />
              <InfoRow label="Total Users" value={statsData.totalUsers.toLocaleString()} />
              <InfoRow
                label="Database"
                value={statsData.totalUsers > 0 ? 'Connected' : 'Connected'}
                icon={Database}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Danger Zone Card ──────────────────────────────────────── */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader className="text-red-700 dark:text-red-400">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            Irreversible actions that affect the entire platform. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Clear Audit Logs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-red-200 dark:border-red-900/40 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900/40 p-2 mt-0.5">
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Clear All Audit Logs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete all recorded audit log entries. This cannot be undone.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 shrink-0"
                  disabled={clearingLogs}
                >
                  {clearingLogs ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Clear Logs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Audit Logs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all audit log entries from the database.
                    This action cannot be undone. All security trails and activity history
                    will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAuditLogs}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, Clear All Logs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Reset Demo Data */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-red-200 dark:border-red-900/40 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900/40 p-2 mt-0.5">
                <RotateCcw className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Reset Demo Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reset all platform data to initial demo state. Users, orders, and settings will be affected.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 shrink-0"
                  disabled={resettingDemo}
                >
                  {resettingDemo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Reset Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Demo Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset the platform to its initial demo state. All user data,
                    orders, customers, and products will be removed and replaced with sample
                    data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetDemoData}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, Reset All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Info Row Component ──────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
