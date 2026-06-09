'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/app-store'
import { LoginPage } from '@/components/admin/login-page'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/admin/sidebar'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import { ShoppingCart, LogOut, User, Shield, BarChart3, ScrollText, HeartPulse, Cog, UserCog } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import DashboardView from '@/components/admin/dashboard-view'
import OrdersView from '@/components/admin/orders-view'
import ProductsView from '@/components/admin/products-view'
import CustomersView from '@/components/admin/customers-view'
import SettingsView from '@/components/admin/settings-view'
import SuperAdminView from '@/components/admin/super-admin-view'
import SuperAdminUsers from '@/components/admin/super-admin-users'
import SuperAdminAnalytics from '@/components/admin/super-admin-analytics'
import SuperAdminAuditLogs from '@/components/admin/super-admin-audit-logs'
import SuperAdminSystemHealth from '@/components/admin/super-admin-system-health'
import SuperAdminPlatformSettings from '@/components/admin/super-admin-platform-settings'

export default function Home() {
  const { isLoggedIn, activeView, setLoggedIn, resetAll, userName, userRole, userId, setActiveView } = useAppStore()
  const [mounted, setMounted] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true

    const saved = localStorage.getItem('wc_dashboard_session')
    if (saved) {
      try {
        const session = JSON.parse(saved)
        if (session.isLoggedIn && session.expiresAt && session.expiresAt > Date.now()) {
          setLoggedIn(true, session.name, session.id, session.role)
        } else {
          // Session expired or invalid — clear it
          localStorage.removeItem('wc_dashboard_session')
        }
      } catch {
        localStorage.removeItem('wc_dashboard_session')
      }
    }

    queueMicrotask(() => setMounted(true))
  }, [setLoggedIn])

  // Redirect Super Admin to overview when they log in
  useEffect(() => {
    if (isLoggedIn && userRole === 'super_admin') {
      // Check if the current view is a regular admin view
      const adminViews = ['dashboard', 'orders', 'products', 'customers', 'settings']
      if (adminViews.includes(activeView)) {
        setActiveView('super-admin')
      }
    }
  }, [isLoggedIn, userRole, activeView, setActiveView])

  if (!mounted) return null

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </>
    )
  }

  const isSuperAdmin = userRole === 'super_admin'

  const renderView = () => {
    switch (activeView) {
      // Regular Admin views
      case 'dashboard': return <DashboardView key={userId} />
      case 'orders': return <OrdersView key={userId} />
      case 'products': return <ProductsView key={userId} />
      case 'customers': return <CustomersView key={userId} />
      case 'settings': return <SettingsView key={userId} />
      // Super Admin views
      case 'super-admin': return <SuperAdminView key={userId} />
      case 'sa-users': return <SuperAdminUsers key={userId} />
      case 'sa-analytics': return <SuperAdminAnalytics key={userId} />
      case 'sa-audit': return <SuperAdminAuditLogs key={userId} />
      case 'sa-health': return <SuperAdminSystemHealth key={userId} />
      case 'sa-settings': return <SuperAdminPlatformSettings key={userId} />
      default: return isSuperAdmin ? <SuperAdminView key={userId} /> : <DashboardView key={userId} />
    }
  }

  const viewLabels: Record<string, { label: string; icon: React.ElementType }> = {
    dashboard: { label: 'Dashboard', icon: ShoppingCart },
    orders: { label: 'Orders', icon: ShoppingCart },
    products: { label: 'Products', icon: ShoppingCart },
    customers: { label: 'Customers', icon: ShoppingCart },
    settings: { label: 'Settings', icon: ShoppingCart },
    'super-admin': { label: 'Platform Overview', icon: Shield },
    'sa-users': { label: 'User Management', icon: UserCog },
    'sa-analytics': { label: 'Analytics', icon: BarChart3 },
    'sa-audit': { label: 'Audit Logs', icon: ScrollText },
    'sa-health': { label: 'System Health', icon: HeartPulse },
    'sa-settings': { label: 'Platform Settings', icon: Cog },
  }

  function handleSignOut() {
    localStorage.removeItem('wc_dashboard_session')
    resetAll()
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  const currentViewInfo = viewLabels[activeView] || { label: 'Dashboard', icon: ShoppingCart }

  return (
    <SidebarProvider>
      <AppSidebar key={userId} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card/80 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <currentViewInfo.icon className={`h-4 w-4 ${isSuperAdmin ? 'text-amber-500' : 'text-primary'}`} />
            <span>{currentViewInfo.label}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className={`text-white text-xs font-semibold ${isSuperAdmin ? 'bg-amber-600' : 'bg-primary'}`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{userName || 'Admin'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  <span>{userName || 'Admin'}</span>
                  {userRole === 'super_admin' && (
                    <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded">OWNER</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div key={activeView} className="view-enter">
            {renderView()}
          </div>
        </main>
        <footer className="border-t bg-card/50 px-6 py-3 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} NexCommerce &mdash; Unified Commerce Operations Platform
        </footer>
      </SidebarInset>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  )
}
