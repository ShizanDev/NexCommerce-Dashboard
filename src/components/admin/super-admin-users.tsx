'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  UserCog,
  Trash2,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Users,
  Mail,
  Calendar,
  Clock,
  ShoppingBag,
  Package,
  UserCircle,
  DollarSign,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { apiGet, apiPut, apiDelete } from '@/lib/api-fetch'
import { useAppStore } from '@/stores/app-store'

// ─── Type Definitions ───────────────────────────────────────────────────

interface UserRecord {
  id: string
  email: string
  name: string
  role: string
  status: string
  lastLoginAt: string | null
  createdAt: string
  wcConnected: boolean
  orderCount: number
  customerCount: number
  productCount: number
  revenue: number
}

// ─── Currency Formatter ─────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

// ─── Badge Helpers ─────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case 'super_admin':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 border-0">
          <Shield className="mr-1 h-3 w-3" />
          Super Admin
        </Badge>
      )
    case 'admin':
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 border-0">
          <UserCog className="mr-1 h-3 w-3" />
          Admin
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          {role.replace(/_/g, ' ')}
        </Badge>
      )
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 border-0">
          <CheckCircle className="mr-1 h-3 w-3" />
          Active
        </Badge>
      )
    case 'suspended':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-300 border-0">
          <Ban className="mr-1 h-3 w-3" />
          Suspended
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          {status}
        </Badge>
      )
  }
}

function WcConnectedBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 border-0">
        <Wifi className="mr-1 h-3 w-3" />
        Connected
      </Badge>
    )
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400 border-0">
      <WifiOff className="mr-1 h-3 w-3" />
      Not Connected
    </Badge>
  )
}

// ─── Loading Skeleton ───────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Filter bar skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      {/* Table header skeleton */}
      <Skeleton className="h-10 w-full rounded-md" />
      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="rounded-full bg-muted p-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {hasFilters ? 'No users match your filters' : 'No users yet'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? 'Try adjusting your search or filter criteria'
            : 'Users will appear here once they register on the platform'}
        </p>
      </div>
    </div>
  )
}

// ─── Error State ────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Failed to load users</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  )
}

// ─── User Detail Dialog ────────────────────────────────────────────────

function UserDetailDialog({
  user,
  open,
  onOpenChange,
  isSelf,
  onToggleRole,
  onToggleStatus,
  actionLoading,
}: {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isSelf: boolean
  onToggleRole: () => void
  onToggleStatus: () => void
  actionLoading: boolean
}) {
  if (!user) return null

  const isAdmin = user.role === 'admin'
  const isActive = user.status === 'active'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            Complete profile and store information for {user.name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Profile Info ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Profile
            </h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">Display Name</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={user.role} />
                  <span className="text-xs text-muted-foreground">Role</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={user.status} />
                  <span className="text-xs text-muted-foreground">Status</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Store Info ───────────────────────────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Store Data
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="text-xs">WooCommerce</span>
                </div>
                <WcConnectedBadge connected={user.wcConnected} />
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="text-xs">Orders</span>
                </div>
                <p className="text-lg font-semibold">{user.orderCount.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="h-3.5 w-3.5" />
                  <span className="text-xs">Products</span>
                </div>
                <p className="text-lg font-semibold">{user.productCount.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">Customers</span>
                </div>
                <p className="text-lg font-semibold">{user.customerCount.toLocaleString('en-IN')}</p>
              </div>
              <div className="col-span-2 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs">Total Revenue</span>
                </div>
                <p className="text-lg font-semibold">{currencyFormatter.format(user.revenue)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Account Info ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Account
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Last Login
                </span>
                <span className="font-medium">
                  {user.lastLoginAt
                    ? format(new Date(user.lastLoginAt), 'dd MMM yyyy, HH:mm')
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined
                </span>
                <span className="font-medium">
                  {format(new Date(user.createdAt), 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        {!isSelf && (
          <>
            <Separator />
            <DialogFooter className="flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={onToggleRole}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isAdmin ? (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Make Super Admin
                  </>
                ) : (
                  <>
                    <UserCog className="mr-2 h-4 w-4" />
                    Make Admin
                  </>
                )}
              </Button>
              <Button
                variant={isActive ? 'destructive' : 'default'}
                onClick={onToggleStatus}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isActive ? (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Suspend
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────

function DeleteConfirmDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  deleting,
}: {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  deleting: boolean
}) {
  if (!user) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
            Delete User
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This action <span className="font-semibold text-destructive">cannot be undone</span>.
                The user account and all associated data will be permanently removed.
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{user.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
              <p className="font-medium">
                Are you sure you want to delete this user?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminUsers() {
  // ── State ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [wcFilter, setWcFilter] = useState('all')

  // Dialogs
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Current user from store (for self-check)
  const currentUserId = useAppStore((s) => s.userId)

  // ── Data Fetching ──────────────────────────────────────────────────
  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch users')
      const json = await res.json()
      setUsers(json.users || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // ── Filtering ──────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesName = (user.name || '').toLowerCase().includes(q)
        const matchesEmail = user.email.toLowerCase().includes(q)
        if (!matchesName && !matchesEmail) return false
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) return false

      // WC filter
      if (wcFilter === 'connected' && !user.wcConnected) return false
      if (wcFilter === 'not_connected' && user.wcConnected) return false

      return true
    })
  }, [users, searchQuery, roleFilter, statusFilter, wcFilter])

  const hasActiveFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || wcFilter !== 'all'

  // ── Actions ────────────────────────────────────────────────────────
  const isSelf = useCallback(
    (userId: string) => userId === currentUserId,
    [currentUserId]
  )

  async function handleToggleRole(user: UserRecord) {
    if (isSelf(user.id)) {
      toast.error('You cannot change your own role')
      return
    }

    setActionLoading(true)
    try {
      const newRole = user.role === 'super_admin' ? 'admin' : 'super_admin'
      const res = await apiPut(`/api/admin/users/${user.id}`, { role: newRole })
      if (!res.ok) throw new Error('Failed to update role')

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      )
      toast.success(
        `${user.name || user.email} is now ${newRole === 'super_admin' ? 'Super Admin' : 'Admin'}`
      )

      // Update detail dialog if open
      if (detailUser?.id === user.id) {
        setDetailUser((prev) => (prev ? { ...prev, role: newRole } : null))
      }
    } catch {
      toast.error('Failed to update user role')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggleStatus(user: UserRecord) {
    if (isSelf(user.id)) {
      toast.error('You cannot suspend or activate your own account')
      return
    }

    setActionLoading(true)
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active'
      const res = await apiPut(`/api/admin/users/${user.id}`, { status: newStatus })
      if (!res.ok) throw new Error('Failed to update status')

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      )
      toast.success(
        `${user.name || user.email} has been ${newStatus === 'suspended' ? 'suspended' : 'activated'}`
      )

      // Update detail dialog if open
      if (detailUser?.id === user.id) {
        setDetailUser((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch {
      toast.error('Failed to update user status')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteUser || isSelf(deleteUser.id)) {
      toast.error('You cannot delete your own account')
      return
    }

    setDeleting(true)
    try {
      const res = await apiDelete(`/api/admin/users/${deleteUser.id}`)
      if (!res.ok) throw new Error('Failed to delete user')

      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id))
      toast.success(`${deleteUser.name || deleteUser.email} has been deleted`)
      setDeleteOpen(false)
      setDeleteUser(null)
    } catch {
      toast.error('Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  function openDetail(user: UserRecord) {
    setDetailUser(user)
    setDetailOpen(true)
  }

  function openDeleteConfirm(user: UserRecord) {
    setDeleteUser(user)
    setDeleteOpen(true)
  }

  // ── Error State ────────────────────────────────────────────────────

  if (error && !users.length) {
    return (
      <div className="space-y-6 view-enter">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage platform users, roles, and access control
          </p>
        </div>
        <Card>
          <CardContent>
            <ErrorState message={error} onRetry={fetchUsers} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 view-enter">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage platform users, roles, and access control
        </p>
      </div>

      {/* ── Filter / Search Bar ──────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]" size="sm">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" size="sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={wcFilter} onValueChange={setWcFilter}>
                <SelectTrigger className="w-[170px]" size="sm">
                  <SelectValue placeholder="WC Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All WC Status</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="not_connected">Not Connected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Count Badge */}
            <Badge
              variant="secondary"
              className="h-8 px-3 text-sm font-medium shrink-0"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Users className="h-3.5 w-3.5 mr-1.5" />
              )}
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Users Table ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState hasFilters={!!hasActiveFilters} />
          ) : (
            <div className="overflow-x-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[160px]">Name</TableHead>
                    <TableHead className="min-w-[200px] hidden md:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="min-w-[130px]">Role</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[130px] hidden lg:table-cell">
                      WC Connected
                    </TableHead>
                    <TableHead className="min-w-[80px] text-right hidden xl:table-cell">
                      Orders
                    </TableHead>
                    <TableHead className="min-w-[100px] text-right hidden xl:table-cell">
                      Revenue
                    </TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">
                      Last Login
                    </TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">
                      Joined
                    </TableHead>
                    <TableHead className="w-[60px] sticky right-0 bg-background z-10">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="group"
                    >
                      {/* Name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {(user.name || user.email)
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {user.name || '—'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate md:hidden">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        <span className="truncate block max-w-[200px]">
                          {user.email}
                        </span>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>

                      {/* WC Connected */}
                      <TableCell className="hidden lg:table-cell">
                        <WcConnectedBadge connected={user.wcConnected} />
                      </TableCell>

                      {/* Orders */}
                      <TableCell className="hidden xl:table-cell text-right font-medium tabular-nums">
                        {user.orderCount.toLocaleString('en-IN')}
                      </TableCell>

                      {/* Revenue */}
                      <TableCell className="hidden xl:table-cell text-right font-medium tabular-nums">
                        {currencyFormatter.format(user.revenue)}
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {user.lastLoginAt
                          ? formatDistanceToNow(new Date(user.lastLoginAt), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </TableCell>

                      {/* Joined */}
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {format(new Date(user.createdAt), 'dd MMM yyyy')}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="sticky right-0 bg-background">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {/* View Details */}
                            <DropdownMenuItem onClick={() => openDetail(user)}>
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Role Toggle */}
                            {isSelf(user.id) ? null : (
                              <DropdownMenuItem
                                onClick={() => handleToggleRole(user)}
                                disabled={actionLoading}
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : user.role === 'super_admin' ? (
                                  <UserCog className="h-4 w-4" />
                                ) : (
                                  <Shield className="h-4 w-4" />
                                )}
                                {user.role === 'super_admin'
                                  ? 'Change to Admin'
                                  : 'Change to Super Admin'}
                              </DropdownMenuItem>
                            )}

                            {/* Status Toggle */}
                            {isSelf(user.id) ? null : (
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user)}
                                disabled={actionLoading}
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : user.status === 'active' ? (
                                  <Ban className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                              </DropdownMenuItem>
                            )}

                            {/* Delete */}
                            {!isSelf(user.id) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => openDeleteConfirm(user)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}

                            {isSelf(user.id) && (
                              <>
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5">
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <ShieldAlert className="h-3 w-3" />
                                    Cannot modify your own account
                                  </p>
                                </div>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── User Detail Dialog ───────────────────────────────────────── */}
      <UserDetailDialog
        user={detailUser}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailUser(null)
        }}
        isSelf={detailUser ? isSelf(detailUser.id) : false}
        onToggleRole={() => {
          if (detailUser) handleToggleRole(detailUser)
        }}
        onToggleStatus={() => {
          if (detailUser) handleToggleStatus(detailUser)
        }}
        actionLoading={actionLoading}
      />

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      <DeleteConfirmDialog
        user={deleteUser}
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteUser(null)
        }}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  )
}
