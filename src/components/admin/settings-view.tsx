'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Globe,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  Link2,
  Zap,
  Settings,
  Webhook,
  Info,
  RotateCcw,
  RefreshCw,
  Clock,
  Unplug,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { apiGet, apiPost, apiPut } from '@/lib/api-fetch'

interface SettingsMap {
  [key: string]: string
}

type ConnectionStatus = 'idle' | 'connected' | 'failed' | 'disconnected'

export default function SettingsView() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form fields - WC Connection
  const [storeUrl, setStoreUrl] = useState('')
  const [consumerKey, setConsumerKey] = useState('')
  const [consumerSecret, setConsumerSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  // General settings
  const [currency, setCurrency] = useState('INR')
  const [currencySymbol, setCurrencySymbol] = useState('₹')

  // Notification toggles
  const [notifyNewOrder, setNotifyNewOrder] = useState(true)
  const [notifyLowStock, setNotifyLowStock] = useState(true)
  const [notifyStatusChange, setNotifyStatusChange] = useState(false)

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [lastSync, setLastSync] = useState<string | null>(null)

  // Email status (read-only from backend)
  const [emailConfigured, setEmailConfigured] = useState(false)

  async function fetchSettings() {
    setLoading(true)
    try {
      const res = await apiGet('/api/settings')
      const data = await res.json()
      setSettings(data)

      const isConnected = data.wcConnected === 'true' || data.wcConnected === true
      setStoreUrl(data.wc_store_url || '')
      setConsumerKey(data.wc_consumer_key || '')
      setConsumerSecret(data.wc_consumer_secret || '')

      // Email status (read-only, configured by owner)
      setEmailConfigured(data.emailConfigured === 'true' || data.emailConfigured === true)

      setCurrency(data.currency || 'INR')
      setCurrencySymbol(data.currency_symbol || '₹')
      setNotifyNewOrder(data.notify_new_order !== 'false')
      setNotifyLowStock(data.notify_low_stock !== 'false')
      setNotifyStatusChange(data.notify_status_change === 'true')
      setLastSync(data.wc_last_sync || null)

      if (isConnected) {
        setConnectionStatus('connected')
      } else if (data.wc_store_url) {
        setConnectionStatus('disconnected')
      }
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  async function handleTestConnection() {
    setTesting(true)
    setConnectionStatus('idle')
    try {
      const res = await apiPost('/api/settings', {
        action: 'test_connection',
        store_url: storeUrl,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('connected')
        setLastSync(data.lastSync || new Date().toISOString())
        toast.success(`Connected! Synced ${data.count} orders.`)
        fetchSettings()
      } else {
        setConnectionStatus('failed')
        toast.error(data.error || 'Connection failed')
      }
    } catch {
      setConnectionStatus('failed')
      toast.error('Connection failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await apiGet('/api/woocommerce/sync')
      const data = await res.json()
      if (data.success) {
        toast.success(`Synced ${data.totalSynced} orders from WooCommerce`)
        setLastSync(new Date().toISOString())
        fetchSettings()
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    try {
      const res = await apiPost('/api/settings', { action: 'disconnect' })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('disconnected')
        setStoreUrl('')
        setConsumerKey('')
        setConsumerSecret('')
        setLastSync(null)
        toast.success('WooCommerce disconnected')
        fetchSettings()
      } else {
        toast.error('Failed to disconnect')
      }
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await apiPut('/api/settings', {
        currency,
        currency_symbol: currencySymbol,
        notify_new_order: String(notifyNewOrder),
        notify_low_stock: String(notifyLowStock),
        notify_status_change: String(notifyStatusChange),
      })

      if (res.ok) {
        toast.success('Settings saved successfully')
      } else {
        toast.error('Failed to save settings')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setSaving(true)
    try {
      const res = await apiPut('/api/settings', {
        currency: 'INR',
        currency_symbol: '₹',
        notify_new_order: 'true',
        notify_low_stock: 'true',
        notify_status_change: 'false',
      })

      if (res.ok) {
        setCurrency('INR')
        setCurrencySymbol('₹')
        setNotifyNewOrder(true)
        setNotifyLowStock(true)
        setNotifyStatusChange(false)
        toast.success('Settings reset to defaults')
      }
    } catch {
      toast.error('Failed to reset settings')
    } finally {
      setSaving(false)
    }
  }

  // Get webhook URL with userId
  function getWebhookUrl() {
    try {
      const session = JSON.parse(localStorage.getItem('wc_dashboard_session') || '{}')
      const uid = session.id || ''
      if (uid) {
        return `https://woocommercemanager.space-z.ai/api/webhook/woocommerce?uid=${uid}`
      }
    } catch { /* ignore */ }
    return 'https://woocommercemanager.space-z.ai/api/webhook/woocommerce'
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(getWebhookUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Webhook URL copied')
  }

  const webhookEvents = [
    { event: 'order.created', desc: 'New order placed' },
    { event: 'order.updated', desc: 'Order details or status changed' },
    { event: 'order.deleted', desc: 'Order deleted' },
    { event: 'order.restored', desc: 'Order restored from trash' },
  ]

  function getLastSyncText() {
    if (!lastSync) return null
    try {
      return formatDistanceToNow(new Date(lastSync), { addSuffix: true })
    } catch {
      return null
    }
  }

  const isConnected = connectionStatus === 'connected'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your WooCommerce connection and preferences</p>
      </div>

      {/* Connection Status Banner */}
      <Card className={isConnected
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
        : connectionStatus === 'failed'
        ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
        : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
      }>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${isConnected ? 'bg-emerald-100 dark:bg-emerald-900/40' : connectionStatus === 'failed' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-emerald-600" />
                ) : connectionStatus === 'failed' ? (
                  <WifiOff className="h-5 w-5 text-red-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${isConnected ? 'text-emerald-800 dark:text-emerald-300' : connectionStatus === 'failed' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                    {isConnected ? 'Connected to WooCommerce' : connectionStatus === 'failed' ? 'Connection Failed' : 'Not Connected'}
                  </p>
                  <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-emerald-600' : ''}>
                    {isConnected ? 'Active' : connectionStatus === 'failed' ? 'Error' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {isConnected && storeUrl && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {storeUrl}
                    </p>
                  )}
                  {lastSync && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last synced {getLastSyncText()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected && (
                <>
                  <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span className="ml-1.5">Sync Now</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Unplug className="h-3.5 w-3.5" />
                        <span className="ml-1.5">Disconnect</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect WooCommerce?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your WooCommerce API credentials and stop syncing orders. Your existing order data will be preserved.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Status (read-only) */}
      <Card className={emailConfigured
        ? 'border-emerald-200 dark:border-emerald-800'
        : 'border-amber-200 dark:border-amber-800'
      }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className={`h-5 w-5 ${emailConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
            Email Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {emailConfigured ? (
              <>
                <Badge className="bg-emerald-600">✓ Email Active</Badge>
                <span className="text-xs text-muted-foreground">OTP verification emails are being sent automatically</span>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Sandbox Mode
                </Badge>
                <span className="text-xs text-muted-foreground">Email not configured — OTP codes will be shown on-screen during login/signup</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-emerald-600" />
            WooCommerce Setup Guide
          </CardTitle>
          <CardDescription>Follow these steps to connect your WooCommerce store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { step: 1, title: 'Generate Keys', desc: 'WooCommerce → Settings → API → Add Key' },
              { step: 2, title: 'Enter Credentials', desc: 'Paste Store URL, Key, and Secret below' },
              { step: 3, title: 'Test Connection', desc: 'Click "Test Connection" to verify' },
              { step: 4, title: 'Setup Webhook', desc: 'Add webhook URL in WooCommerce settings' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WC Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            WooCommerce Connection
          </CardTitle>
          <CardDescription>Enter your WooCommerce store API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-url">Store URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="store-url"
                placeholder="https://your-store.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumer-key">Consumer Key</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="consumer-key"
                type={showKey ? 'text' : 'password'}
                placeholder="ck_xxxxxxxxxxxxx"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumer-secret">Consumer Secret</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="consumer-secret"
                type={showSecret ? 'text' : 'password'}
                placeholder="cs_xxxxxxxxxxxxx"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleTestConnection}
              disabled={testing || !storeUrl || !consumerKey || !consumerSecret}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {testing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" /> Test Connection</>
              )}
            </Button>
            {isConnected && (
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Re-sync Orders
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure WooCommerce to push real-time order updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook Delivery URL</Label>
            <div className="flex gap-2">
              <Input value={getWebhookUrl()} readOnly className="font-mono text-sm bg-muted" />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              WooCommerce → Settings → Webhooks → Add New → Paste this URL in Delivery URL field
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium">Recommended Webhook Events</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Create separate webhooks in WooCommerce for each event, all pointing to the same URL above
            </p>
            <div className="space-y-2">
              {webhookEvents.map((item) => (
                <div key={item.event} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{item.event}</code>
                    <span className="text-sm text-muted-foreground">{item.desc}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">Recommended</Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
            <div className="flex gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                <p className="font-medium">Webhook Security</p>
                <p className="mt-0.5">
                  WooCommerce webhooks use HMAC-SHA256 signatures. Set a Webhook Secret in WooCommerce settings for additional verification.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Configure display and notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency-symbol">Currency Symbol</Label>
              <Input
                id="currency-symbol"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="₹"
              />
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium mb-3 block">Notifications</Label>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New Order Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when a new order is placed</p>
                </div>
                <Switch checked={notifyNewOrder} onCheckedChange={setNotifyNewOrder} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Low Stock Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when product stock is low</p>
                </div>
                <Switch checked={notifyLowStock} onCheckedChange={setNotifyLowStock} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Status Change Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when order status changes</p>
                </div>
                <Switch checked={notifyStatusChange} onCheckedChange={setNotifyStatusChange} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save / Reset */}
      <div className="flex gap-3 pb-4">
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            'Save Settings'
          )}
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
