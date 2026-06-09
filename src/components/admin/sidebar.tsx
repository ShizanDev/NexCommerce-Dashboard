'use client'

import { useAppStore, type ActiveView } from '@/stores/app-store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  Activity,
  Shield,
  BarChart3,
  ScrollText,
  HeartPulse,
  Cog,
  UserCog,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'

// ─── Regular Admin Navigation Items ─────────────────────────────────

const adminNavItems: { view: ActiveView; label: string; icon: React.ElementType; badge?: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'orders', label: 'Orders', icon: ShoppingCart, badge: 'WC' },
  { view: 'products', label: 'Products', icon: Package },
  { view: 'customers', label: 'Customers', icon: Users },
  { view: 'settings', label: 'Settings', icon: Settings },
]

// ─── Super Admin Navigation Items ───────────────────────────────────

interface SaNavItem {
  view: ActiveView
  label: string
  icon: React.ElementType
  group: string
}

const saNavItems: SaNavItem[] = [
  // Overview & Management
  { view: 'super-admin', label: 'Overview', icon: LayoutDashboard, group: 'PLATFORM' },
  { view: 'sa-users', label: 'User Management', icon: UserCog, group: 'PLATFORM' },
  { view: 'sa-analytics', label: 'Analytics', icon: BarChart3, group: 'PLATFORM' },
  // Governance
  { view: 'sa-audit', label: 'Audit Logs', icon: ScrollText, group: 'GOVERNANCE' },
  { view: 'sa-health', label: 'System Health', icon: HeartPulse, group: 'GOVERNANCE' },
  { view: 'sa-settings', label: 'Platform Settings', icon: Cog, group: 'GOVERNANCE' },
]

// ─── Sidebar Component ─────────────────────────────────────────────

export function AppSidebar() {
  const { activeView, setActiveView, userRole } = useAppStore()
  const [wcConnected, setWcConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    const fetchSettings = async () => {
      try {
        const res = await apiGet('/api/settings')
        if (!res.ok) return
        const data = await res.json()
        if (mountedRef.current) {
          setWcConnected(data.wcConnected === 'true' || data.wcConnected === true)
          setLastSync(data.wc_last_sync || null)
        }
      } catch {
        // Silently fail
      }
    }

    fetchSettings()
    const interval = setInterval(fetchSettings, 30000)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [])

  function getLastSyncText() {
    if (!lastSync) return null
    try {
      return formatDistanceToNow(new Date(lastSync), { addSuffix: true })
    } catch {
      return null
    }
  }

  const isSuperAdmin = userRole === 'super_admin'

  return (
    <Sidebar collapsible="icon">
      {/* ─── Header / Logo ─────────────────────────────── */}
      <SidebarHeader className="border-b h-14 gap-0 px-3 justify-center group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent">
              <div className="relative flex items-center justify-center h-7 w-full overflow-hidden">
                {/* Full logo: fades out when collapsed */}
                <img
                  src="/logo.png"
                  alt="NexCommerce"
                  className="h-7 w-auto object-contain transition-all duration-200 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:scale-95"
                />
                {/* Favicon icon: fades in when collapsed */}
                <img
                  src="/favicon-icon.png"
                  alt="NexCommerce"
                  className="absolute h-7 w-7 object-contain rounded-md transition-all duration-200 ease-in-out opacity-0 group-data-[collapsible=icon]:opacity-100 group-data-[collapsible=icon]:scale-100"
                />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ─── Navigation Content ────────────────────────── */}
      <SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-1">
        {isSuperAdmin ? (
          // ─── SUPER ADMIN SIDEBAR ──────────────────────────────
          <>
            {['PLATFORM', 'GOVERNANCE'].map((group) => {
              const items = saNavItems.filter((i) => i.group === group)
              return (
                <SidebarGroup key={group}>
                  <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
                    {group}
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.view}>
                        <SidebarMenuButton
                          isActive={activeView === item.view}
                          onClick={() => setActiveView(item.view)}
                          tooltip={item.label}
                        >
                          <item.icon className={`size-4 ${activeView === item.view ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )
            })}
          </>
        ) : (
          // ─── REGULAR ADMIN SIDEBAR ─────────────────────────────
          <SidebarMenu>
            {adminNavItems.map((item) => (
              <SidebarMenuItem key={item.view}>
                <SidebarMenuButton
                  isActive={activeView === item.view}
                  onClick={() => setActiveView(item.view)}
                  tooltip={item.label}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto flex h-5 items-center rounded-md bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>

      {/* ─── Footer ─────────────────────────────────────── */}
      <SidebarFooter className="border-t px-2 py-2.5 space-y-1.5 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:items-center">
        {/* WC Connection Status (only for regular admin) */}
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 text-xs justify-center group-data-[collapsible=icon]:justify-center">
            {wcConnected ? (
              <>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Wifi className="size-3.5 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden font-medium">Connected</span>
                </div>
                {lastSync && (
                  <span className="flex items-center gap-0.5 text-muted-foreground group-data-[collapsible=icon]:hidden">
                    <Clock className="size-2.5" />
                    {getLastSyncText()}
                  </span>
                )}
              </>
            ) : (
              <span className="flex items-center gap-1 text-amber-500">
                <WifiOff className="size-3.5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Not Connected</span>
              </span>
            )}
          </div>
        )}

        {/* Super Admin Footer Badge */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2 text-xs justify-center group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Shield className="size-3.5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden font-medium">Super Admin</span>
            </div>
          </div>
        )}

        <div className="flex items-center text-xs text-muted-foreground justify-center group-data-[collapsible=icon]:justify-center">
          <Activity className="size-3 shrink-0" />
          <span className="font-mono group-data-[collapsible=icon]:hidden ml-1.5">v2.4.0</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
