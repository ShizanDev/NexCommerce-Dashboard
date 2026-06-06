import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, isSuperAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only super admins can access audit logs
    const admin = await isSuperAdmin(userId)
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })
    }

    // Fetch audit logs, ordered by most recent first
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200, // Limit to last 200 entries
    })

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        userEmail: log.userEmail,
        action: log.action,
        target: log.target,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Audit logs fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
