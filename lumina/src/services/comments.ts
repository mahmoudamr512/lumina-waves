import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { writeAudit } from '@/lib/audit'
import { AuthzError, ValidationError } from '@/lib/errors'
import { isCommentableEntity } from '@/lib/activity-constants'
import type { Entity } from '@/lib/authz'

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

export async function addComment(entity: string, entityId: string, body: string) {
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
