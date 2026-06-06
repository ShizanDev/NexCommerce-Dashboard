import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// ─── Extract userId from request ───────────────────────────────────

/**
 * Extract userId from the X-User-Id header.
 * Returns null if not provided or empty.
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('X-User-Id')
  return userId && userId.trim() !== '' ? userId.trim() : null
}

// ─── Validate user exists and optionally check role ─────────────────

/**
 * Validate that the user exists in the database.
 * Returns the user object or null.
 */
export async function validateUser(userId: string) {
  if (!userId) return null
  try {
    return await db.authUser.findUnique({ where: { id: userId } })
  } catch {
    return null
  }
}

/**
 * Validate that the user exists AND has the specified role.
 * Returns the user object or null.
 */
export async function validateUserRole(userId: string, requiredRole: string) {
  const user = await validateUser(userId)
  if (!user || user.role !== requiredRole) return null
  return user
}

/**
 * Check if a user is a super admin.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await validateUser(userId)
  return !!user && user.role === 'super_admin'
}
