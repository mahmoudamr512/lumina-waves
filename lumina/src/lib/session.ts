import { db } from '@/lib/db'
import type { Role } from '@/generated/prisma/client'
import { auth } from '@/lib/auth'

/** JWT max age default in Auth.js is 30 days; keep DB session expiry in step. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Only bump lastSeenAt at most once per this window to avoid a write per request. */
const TOUCH_THROTTLE_MS = 5 * 60 * 1000

/** Record a new login session and return its id (embedded in the JWT as `sid`). */
export async function createSessionRecord(userId: string, ip?: string, userAgent?: string): Promise<string> {
  const row = await db.userSession.create({
    data: { userId, ip, userAgent, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  })
  return row.id
}

/** Idempotently mark a session revoked. */
export async function revokeSessionRecord(sid: string): Promise<void> {
  await db.userSession.updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date() } })
}

/**
 * Authoritative per-request session check (Node runtime). Validates the JWT's
 * `sid` against the DB and returns the LIVE user (so role changes, disable, and
 * revoke take effect immediately). Returns null when the session is revoked,
 * expired, missing, or the user is disabled/soft-deleted.
 */
export async function loadSession(): Promise<{ id: string; role: Role; sid: string } | null> {
  const s = await auth()
  const sid = s?.user?.sid
  if (!sid) return null
  const row = await db.userSession.findUnique({ where: { id: sid }, include: { user: true } })
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null
  if (row.user.deletedAt || row.user.disabledAt) return null
  if (Date.now() - row.lastSeenAt.getTime() > TOUCH_THROTTLE_MS) {
    await db.userSession.update({ where: { id: sid }, data: { lastSeenAt: new Date() } })
  }
  return { id: row.user.id, role: row.user.role, sid }
}
