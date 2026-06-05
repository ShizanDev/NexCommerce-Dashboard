import { create } from 'zustand'

export type ActiveView = 'dashboard' | 'orders' | 'products' | 'customers' | 'settings' | 'super-admin'

interface AppState {
  activeView: ActiveView
  sidebarOpen: boolean
  isLoggedIn: boolean
  userName: string
  userId: string
  userRole: string
  setActiveView: (view: ActiveView) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setLoggedIn: (loggedIn: boolean, name?: string, userId?: string, role?: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  sidebarOpen: true,
  isLoggedIn: false,
  userName: '',
  userId: '',
  userRole: '',
  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLoggedIn: (loggedIn, name, userId, role) => set({
    isLoggedIn: loggedIn,
    userName: name || '',
    userId: userId || '',
    userRole: role || '',
  }),
}))
