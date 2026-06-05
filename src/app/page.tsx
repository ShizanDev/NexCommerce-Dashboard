'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/app-store'
import { LoginPage } from '@/components/admin/login-page'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/admin/sidebar'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, LogOut, User } from 'lucide-react'
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

export default function Home() {
  const { isLoggedIn, activeView, setLoggedIn, userName, userRole, setActiveView } = useAppStore()
  const [mounted, setMounted] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true

    // Check localStorage for session
    const saved = localStorage.getItem('wc_dashboard_session')
    if (saved) {
      try {
        const session = JSON.parse(saved)
        if (session.isLoggedIn) {
          setLoggedIn(true, session.name, session.id, session.role)
        }
      } catch {
        // ignore parse errors
      }
    }

    // Defer setMounted to avoid cascading render warning
    queueMicrotask(() => setMounted(true))
  }, [setLoggedIn])

  if (!mounted) return null

  // Login gate
  if (!isLoggedIn) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </>
    )
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />
      case 'orders': return <OrdersView />
      case 'products': return <ProductsView />
      case 'customers': return <CustomersView />
      case 'settings': return <SettingsView />
      case 'super-admin': return <SuperAdminView />
      default: return <DashboardView />
    }
  }

  const viewLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    orders: 'Orders',
    products: 'Products',
    customers: 'Customers',
    settings: 'Settings',
    'super-admin': 'Super Admin',
  }

  function handleSignOut() {
    localStorage.removeItem('wc_dashboard_session')
    setLoggedIn(false, '', '', '')
    setActiveView('dashboard')
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            <span>{viewLabels[activeView] || 'Dashboard'}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-accent transition-colors outline-none">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">
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
                    <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">OWNER</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderView()}
        </main>
        <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
          WC Dashboard — WooCommerce Order Management System &bull; Built with Next.js 16
        </footer>
      </SidebarInset>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  )
}
