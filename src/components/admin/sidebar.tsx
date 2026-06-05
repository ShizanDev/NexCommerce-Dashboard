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
import { Store, LayoutDashboard, ShoppingCart, Package, Users, Settings, Wifi, WifiOff, Clock, Activity, Shield } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { apiGet } from '@/lib/api-fetch'

const navItems: { view: ActiveView; label: string; icon: React.ElementType; badge?: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'orders', label: 'Orders', icon: ShoppingCart, badge: 'WC' },
  { view: 'products', label: 'Products', icon: Package },
  { view: 'customers', label: 'Customers', icon: Users },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
  const { activeView, setActiveView, userRole, userId } = useAppStore()
  const [wcConnected, setWcConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const mountedRef = useRef(false)

  useEffect(() => {
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

    mountedRef.current = true
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
      <SidebarHeader className="border-b px-4 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                <Store className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">WC Dashboard</span>
                <span className="truncate text-xs text-muted-foreground">WooCommerce</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarMenu>
          {navItems.map((item) => (
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

        {isSuperAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              Administration
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === 'super-admin'}
                  onClick={() => setActiveView('super-admin')}
                  tooltip="Super Admin"
                >
                  <Shield className="size-4 text-amber-600" />
                  <span>Super Admin</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          {wcConnected ? (
            <>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Wifi className="size-3" />
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
              <WifiOff className="size-3" />
              <span className="group-data-[collapsible=icon]:hidden">Not Connected</span>
            </span>
          )}
        </div>

        <div className="flex items-center text-xs text-muted-foreground">
          <Activity className="mr-1.5 size-3" />
          <span className="font-mono">v2.3.0</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
