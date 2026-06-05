import { create } from 'zustand'

export type ActiveView = 'dashboard' | 'orders' | 'products' | 'customers' | 'settings'

interface AppState {
  activeView: ActiveView
  sidebarOpen: boolean
  isLoggedIn: boolean
  userName: string
  setActiveView: (view: ActiveView) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setLoggedIn: (loggedIn: boolean, name?: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  sidebarOpen: true,
  isLoggedIn: false,
  userName: '',
  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLoggedIn: (loggedIn, name) => set({ isLoggedIn: loggedIn, userName: name || '' }),
}))
