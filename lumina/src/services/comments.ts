import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { writeAudit } from '@/lib/audit'
import { AuthzError, ValidationError } from '@/lib/errors'
import { isCommentableEntity } from '@/lib/activity-constants'
import type { Entity } from '@/lib/authz'
import { GRANT_TYPES } from '@/lib/rights'
import { ensureWatching } from '@/services/watchers'
import { resolveMentions } from '@/services/mentions'
import { createForComment } from '@/services/notifications'

const MAX_BODY = 4000

export interface CommentView {
  id: string
  body: string
  createdAt: Date
  editedAt: Date | null
  author: { id: string | null; name: string; hasAvatar: boolean }
  mine: boolean
}

function assertEntity(entity: string) {
  if (!isCommentableEntity(entity)) throw new ValidationError('INVALID_INPUT', 'entity not commentable')
}

function assertBody(body: string) {
  const t = body.trim()
  if (t.length === 0) throw new ValidationError('INVALID_INPUT', 'empty comment')
  if (t.length > MAX_BODY) throw new ValidationError('INVALID_INPUT', 'comment too long')
  return t
}

async function caller() {
  const s = await loadSession()
  if (!s) throw new AuthzError('UNAUTHENTICATED')
  return s
}

export async function listComments(entity: string, entityId: string): Promise<CommentView[]> {
  assertEntity(entity)
  const u = await requireUser('read', entity as Entity)
  const rows = await db.comment.findMany({
    where: { entity, entityId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, body: true, createdAt: true, editedAt: true, authorId: true },
  })
  const ids = [...new Set(rows.map((r) => r.authorId))]
  const users = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, avatarPath: true } })
    : []
  const map = new Map(users.map((x) => [x.id, x]))
  return rows.map((r) => {
    const a = map.get(r.authorId)
    return {
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      author: a
        ? { id: a.id, name: a.name, hasAvatar: Boolean(a.avatarPath) }
        : { id: null, name: 'مستخدم محذوف', hasAvatar: false },
      mine: r.authorId === u.id,
    }
  })
}

/** Resolve a record's display label + activity link for notifications. */
async function describeEntityTarget(entity: string, entityId: string): Promise<{ label: string; href: string }> {
  switch (entity) {
    case 'Client': {
      const c = await db.client.findUnique({ where: { id: entityId }, select: { stageName: true, legalName: true } })
      return { label: c?.stageName ?? c?.legalName ?? 'عميل', href: `/clients/${entityId}?tab=activity` }
    }
    case 'MasterContract': {
      const k = await db.masterContract.findUnique({ where: { id: entityId }, select: { grantType: true } })
      const label = k ? GRANT_TYPES[k.grantType as keyof typeof GRANT_TYPES]?.ar ?? String(k.grantType) : 'عقد'
      return { label, href: `/contracts/${entityId}` }
    }
    case 'Work': {
      const w = await db.work.findUnique({ where: { id: entityId }, select: { title: true } })
      return { label: w?.title ?? 'عمل', href: `/works/${entityId}` }
    }
    case 'Document': {
      const d = await db.document.findUnique({ where: { id: entityId }, select: { filename: true } })
      return { label: d?.filename ?? 'مستند', href: `/documents/${entityId}/activity` }
    }
    default:
      return { label: entity, href: '/' }
  }
}

export async function addComment(entity: string, entityId: string, body: string, mentionIds: string[] = []) {
  assertEntity(entity)
  const u = await requireUser('read', entity as Entity) // read-access ⇒ may comment
  const clean = assertBody(body)
  const row = await db.comment.create({ data: { authorId: u.id, entity, entityId, body: clean } })
  // Best-effort: surface the discussion in the global feed without blocking.
  try {
    await writeAudit({ actorId: u.id, action: 'COMMENT', entity, entityId, meta: { commentId: row.id } })
  } catch (err) {
    console.warn('[addComment] audit failed (best-effort):', err)
  }
  // Best-effort: auto-watch, resolve mentions, and fan out notifications.
  try {
    const actor = await db.user.findUnique({ where: { id: u.id }, select: { name: true } })
    await ensureWatching(u.id, entity, entityId)
    const resolved = await resolveMentions(entity, mentionIds, clean)
    for (const m of resolved) await ensureWatching(m, entity, entityId)
    const target = await describeEntityTarget(entity, entityId)
    await createForComment({
      entity,
      entityId,
      commentId: row.id,
      body: clean,
      actorId: u.id,
      actorName: actor?.name ?? 'مستخدم',
      entityLabel: target.label,
      href: target.href,
      mentionIds: resolved,
    })
  } catch (err) {
    console.warn('[addComment] notify failed (best-effort):', err)
  }
  return row.id
}

export async function editComment(id: string, body: string) {
  const me = await caller()
  const clean = assertBody(body)
  const row = await db.comment.findUnique({ where: { id }, select: { authorId: true, deletedAt: true } })
  if (!row || row.deletedAt) throw new ValidationError('INVALID_INPUT', 'comment not found')
  if (row.authorId !== me.id) throw new AuthzError('FORBIDDEN')
  await db.comment.update({ where: { id }, data: { body: clean, editedAt: new Date() } })
}

export async function deleteComment(id: string) {
  const me = await caller()
  const row = await db.comment.findUnique({ where: { id }, select: { authorId: true } })
  if (!row) throw new ValidationError('INVALID_INPUT', 'comment not found')
  if (row.authorId !== me.id && me.role !== 'ADMIN') throw new AuthzError('FORBIDDEN')
  await db.comment.update({ where: { id }, data: { deletedAt: new Date() } })
}
