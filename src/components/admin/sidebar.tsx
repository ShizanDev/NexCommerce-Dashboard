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
} from '@/components/ui/sidebar'
import { Store, LayoutDashboard, ShoppingCart, Package, Users, Settings, BadgeCheck, BadgeX } from 'lucide-react'
import { useEffect, useState } from 'react'

const navItems: { view: ActiveView; label: string; icon: React.ElementType; badge?: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'orders', label: 'Orders', icon: ShoppingCart, badge: 'WC' },
  { view: 'products', label: 'Products', icon: Package },
  { view: 'customers', label: 'Customers', icon: Users },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
  const { activeView, setActiveView } = useAppStore()
  const [wcConnected, setWcConnected] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setWcConnected(data.wcConnected || false))
      .catch(() => {})
  }, [])

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
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">v2.1.0</span>
          {wcConnected ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="size-3" />
              <span className="group-data-[collapsible=icon]:hidden">Connected</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-500">
              <BadgeX className="size-3" />
              <span className="group-data-[collapsible=icon]:hidden">Not Connected</span>
            </span>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
