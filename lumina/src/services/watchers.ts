import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { AuthzError, ValidationError } from '@/lib/errors'
import { isCommentableEntity } from '@/lib/activity-constants'
import type { Entity } from '@/lib/authz'

function assertEntity(entity: string) {
  if (!isCommentableEntity(entity)) throw new ValidationError('INVALID_INPUT', 'entity not watchable')
}

/** Follow a record (idempotent). Requires read-access to the entity. */
export async function watch(entity: string, entityId: string) {
  assertEntity(entity)
  const u = await requireUser('read', entity as Entity)
  await db.watcher.upsert({
    where: { userId_entity_entityId: { userId: u.id, entity, entityId } },
    create: { userId: u.id, entity, entityId },
    update: {},
  })
}

/** Unfollow a record. */
export async function unwatch(entity: string, entityId: string) {
  assertEntity(entity)
  const u = await requireUser('read', entity as Entity)
  await db.watcher.deleteMany({ where: { userId: u.id, entity, entityId } })
}

/** Whether the current caller watches the record. */
export async function isWatching(entity: string, entityId: string): Promise<boolean> {
  const s = await loadSession()
  if (!s) return false
  const n = await db.watcher.count({ where: { userId: s.id, entity, entityId } })
  return n > 0
}

/** Idempotently add a watcher (internal — no auth gate; caller is trusted). */
export async function ensureWatching(userId: string, entity: string, entityId: string) {
  await db.watcher.upsert({
    where: { userId_entity_entityId: { userId, entity, entityId } },
    create: { userId, entity, entityId },
    update: {},
  })
}

/** All user ids watching a record. */
export async function listWatcherIds(entity: string, entityId: string): Promise<string[]> {
  const rows = await db.watcher.findMany({ where: { entity, entityId }, select: { userId: true } })
  return rows.map((r) => r.userId)
}

// Re-exported only so tests can reference the auth error type if needed.
export { AuthzError }
