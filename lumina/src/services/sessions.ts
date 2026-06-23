import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { writeAudit } from '@/lib/audit'
import { AuthzError } from '@/lib/errors'
import { notifyUser } from '@/services/notifications'

async function notifySessionRevoked(targetId: string, actorId: string, title: string) {
  if (targetId === actorId) return
  try {
    await notifyUser(targetId, { actorId, type: 'ACCOUNT', entity: 'User', entityId: targetId, title, href: '/account' })
  } catch (err) {
    console.warn('[sessions] revoke notify failed (best-effort):', err)
  }
}

const SESSION_SELECT = {
  id: true,
  ip: true,
  userAgent: true,
  createdAt: true,
  lastSeenAt: true,
  expiresAt: true,
  revokedAt: true,
} as const

// ── Admin (ADMIN-only via the User entity) ──────────────────────────────────

export async function listSessionsForUser(userId: string) {
  await requireUser('read', 'User')
  return db.userSession.findMany({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' },
    select: SESSION_SELECT,
  })
}

export async function revokeSession(sessionId: string) {
  const u = await requireUser('update', 'User')
  const row = await db.userSession.findUnique({ where: { id: sessionId }, select: { userId: true } })
  await db.userSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: sessionId, after: { revokedSession: true } })
  if (row?.userId) await notifySessionRevoked(row.userId, u.id, 'تم إنهاء إحدى جلساتك بواسطة مسؤول')
}

export async function revokeAllUserSessions(userId: string) {
  const u = await requireUser('update', 'User')
  await db.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: userId, after: { revokedAllSessions: true } })
  await notifySessionRevoked(userId, u.id, 'تم إنهاء جميع جلساتك بواسطة مسؤول')
}

// ── Self-service (ownership-scoped, NOT gated by the User entity) ────────────

export async function listMySessions() {
  const me = await loadSession()
  if (!me) throw new AuthzError('UNAUTHENTICATED')
  const rows = await db.userSession.findMany({
    where: { userId: me.id },
    orderBy: { lastSeenAt: 'desc' },
    select: SESSION_SELECT,
  })
  return rows.map((r) => ({ ...r, current: r.id === me.sid }))
}

export async function revokeMySession(sessionId: string) {
  const me = await loadSession()
  if (!me) throw new AuthzError('UNAUTHENTICATED')
  const row = await db.userSession.findUnique({ where: { id: sessionId }, select: { userId: true } })
  if (!row || row.userId !== me.id) throw new AuthzError('FORBIDDEN')
  await db.userSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } })
}

export async function revokeMyOtherSessions() {
  const me = await loadSession()
  if (!me) throw new AuthzError('UNAUTHENTICATED')
  await db.userSession.updateMany({
    where: { userId: me.id, id: { not: me.sid }, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
