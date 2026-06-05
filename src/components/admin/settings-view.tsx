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
} from 'lucide-react'
import { toast } from 'sonner'

interface SettingsMap {
  [key: string]: string
}

export default function SettingsView() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [wcConnected, setWcConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form fields
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
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle')

  async function fetchSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      // API returns flat object: { wc_store_url, wc_consumer_key, ..., wcConnected }
      setSettings(data)
      setWcConnected(data.wcConnected === 'true' || data.wcConnected === true)

      setStoreUrl(data.wc_store_url || '')
      setConsumerKey(data.wc_consumer_key || '')
      setConsumerSecret(data.wc_consumer_secret || '')
      setCurrency(data.currency || 'INR')
      setCurrencySymbol(data.currency_symbol || '₹')
      setNotifyNewOrder(data.notify_new_order !== 'false')
      setNotifyLowStock(data.notify_low_stock !== 'false')
      setNotifyStatusChange(data.notify_status_change === 'true')

      if (data.wcConnected === 'true' || data.wcConnected === true) setConnectionStatus('connected')
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
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          store_url: storeUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('connected')
        setWcConnected(true)
        toast.success(`Connected! Synced ${data.count} orders.`)
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

  async function handleSave() {
    setSaving(true)
    try {
      const newSettings: SettingsMap = {
        ...settings,
        currency,
        currency_symbol: currencySymbol,
        notify_new_order: String(notifyNewOrder),
        notify_low_stock: String(notifyLowStock),
        notify_status_change: String(notifyStatusChange),
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })

      if (res.ok) {
        setSettings(newSettings)
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
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: 'INR',
          currency_symbol: '₹',
          notify_new_order: 'true',
          notify_low_stock: 'true',
          notify_status_change: 'false',
        }),
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

  const webhookUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/woocommerce` : ''

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Webhook URL copied')
  }

  const webhookEvents = [
    'order.created',
    'order.updated',
    'order.deleted',
    'order.status_changed',
    'customer.created',
    'customer.updated',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your WooCommerce connection and preferences</p>
      </div>

      {/* Connection Status Banner */}
      {connectionStatus === 'connected' && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <Wifi className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Connected to WooCommerce</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Your store is successfully connected and orders are being synced.</p>
          </div>
        </div>
      )}
      {connectionStatus === 'failed' && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <WifiOff className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection Failed</p>
            <p className="text-xs text-red-600 dark:text-red-400">Check your credentials and try again.</p>
          </div>
        </div>
      )}

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-emerald-600" />
            Setup Guide
          </CardTitle>
          <CardDescription>Follow these steps to connect your WooCommerce store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Generate Keys</p>
                <p className="text-xs text-muted-foreground">
                  WooCommerce → Settings → API → Keys → Add New
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Enter Credentials</p>
                <p className="text-xs text-muted-foreground">Paste Store URL, Key, and Secret below</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Test Connection</p>
                <p className="text-xs text-muted-foreground">Click &quot;Test Connection&quot; to verify</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
                4
              </div>
              <div>
                <p className="text-sm font-medium">Setup Webhook</p>
                <p className="text-xs text-muted-foreground">
                  Add webhook URL in WooCommerce for live updates
                </p>
              </div>
            </div>
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
          <CardDescription>Enter your WooCommerce store credentials</CardDescription>
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

          <Button
            onClick={handleTestConnection}
            disabled={testing || !storeUrl || !consumerKey || !consumerSecret}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" /> Test Connection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>Configure WooCommerce to push order updates in real-time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm bg-muted" />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this URL in WooCommerce → Settings → Webhooks → Add New
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-sm">Recommended Events</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {webhookEvents.map((event) => (
                <Badge key={event} variant="outline" className="text-xs">
                  {event}
                </Badge>
              ))}
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
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
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
