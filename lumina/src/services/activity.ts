import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import type { Action, Entity } from '@/lib/authz'
import type { Role } from '@/generated/prisma/client'

export interface DiffRow {
  field: string
  before: unknown
  after: unknown
}

export interface ActivityActor {
  id: string | null
  name: string
  hasAvatar: boolean
}

export interface ActivityItem {
  id: string
  action: string
  entity: string
  entityId: string
  createdAt: Date
  actor: ActivityActor
  meta: Record<string, unknown> | null
  phrase: string
  diff: DiffRow[] | null
}

// Field values that must never appear in a diff, even to privileged roles. The
// row still shows the field *changed* (value masked to null), except passwordHash
// which is dropped entirely.
const MASKED_FIELDS = new Set(['nationalId', 'revenueShareBps', 'minPayoutCents', 'storagePath'])
const DIFF_ROLES: Role[] = ['ADMIN', 'LEGAL', 'FINANCE']

const ENTITY_AR: Record<string, string> = {
  Client: 'العميل',
  MasterContract: 'العقد',
  Annex: 'الملحق',
  Work: 'العمل',
  Document: 'المستند',
  Folder: 'المجلد',
  Release: 'الإصدار',
  User: 'المستخدم',
}

function entityAr(entity: string): string {
  return ENTITY_AR[entity] ?? entity
}

/** Human-readable Arabic phrase for an audit entry. */
export function describeAudit(a: {
  action: string
  entity: string
  meta: Record<string, unknown> | null
  actorName: string
}): string {
  const who = a.actorName
  const what = entityAr(a.entity)
  const filename = typeof a.meta?.filename === 'string' ? a.meta.filename : undefined
  const email = typeof a.meta?.email === 'string' ? a.meta.email : undefined
  switch (a.action) {
    case 'CREATE':
      return `${who} أنشأ ${what}`
    case 'UPDATE':
      return `${who} حدّث ${what}`
    case 'DELETE':
      return `${who} حذف ${what}`
    case 'RESTORE':
      return `${who} استعاد ${what}`
    case 'PURGE':
      return `${who} أزال ${what} نهائيًا`
    case 'COMMENT':
      return `${who} علّق على ${what}`
    case 'DOWNLOAD':
      return filename ? `${who} نزّل المستند «${filename}»` : `${who} نزّل ${what}`
    case 'LOGIN':
      return `${who} سجّل الدخول`
    case 'LOGOUT':
      return `${who} سجّل الخروج`
    case 'LOGIN_FAILED':
      return email ? `محاولة دخول فاشلة (${email})` : 'محاولة دخول فاشلة'
    default:
      return `${who} • ${a.action} ${what}`
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/**
 * Field-level diff for privileged roles (ADMIN/LEGAL/FINANCE). Sensitive field
 * values are masked to null (the change is still surfaced); passwordHash is
 * dropped entirely. Returns null for non-privileged roles or when there's
 * nothing to diff.
 */
export function auditDiff(role: Role, before: unknown, after: unknown): DiffRow[] | null {
  if (!DIFF_ROLES.includes(role)) return null
  const b = asRecord(before)
  const a = asRecord(after)
  if (!b && !a) return null
  const keys = new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})])
  const rows: DiffRow[] = []
  for (const k of keys) {
    if (k === 'passwordHash') continue
    const bv = b?.[k] ?? null
    const av = a?.[k] ?? null
    if (JSON.stringify(bv) === JSON.stringify(av)) continue
    if (MASKED_FIELDS.has(k)) rows.push({ field: k, before: null, after: null })
    else rows.push({ field: k, before: bv, after: av })
  }
  return rows
}

async function actorResolver(rows: Array<{ actorId: string | null }>) {
  const ids = [...new Set(rows.map((r) => r.actorId).filter((x): x is string => Boolean(x)))]
  const users = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, avatarPath: true } })
    : []
  const map = new Map(users.map((u) => [u.id, u]))
  return (id: string | null): ActivityActor => {
    if (!id) return { id: null, name: 'النظام', hasAvatar: false }
    const u = map.get(id)
    return u ? { id: u.id, name: u.name, hasAvatar: Boolean(u.avatarPath) } : { id: null, name: 'مستخدم محذوف', hasAvatar: false }
  }
}

type AuditRow = {
  id: string
  actorId: string | null
  action: string
  entity: string
  entityId: string
  before: unknown
  after: unknown
  meta: unknown
  createdAt: Date
}

function toItem(row: AuditRow, actor: ActivityActor, role: Role): ActivityItem {
  const meta = asRecord(row.meta)
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    createdAt: row.createdAt,
    actor,
    meta,
    phrase: describeAudit({ action: row.action, entity: row.entity, meta, actorName: actor.name }),
    diff: auditDiff(role, row.before, row.after),
  }
}

/** Per-entity history timeline (excludes COMMENT rows — those live in the comments tab). */
export async function listEntityActivity(entity: string, entityId: string): Promise<ActivityItem[]> {
  const u = await requireUser('read' as Action, entity as Entity)
  const rows = (await db.auditLog.findMany({
    where: { entity, entityId, NOT: { action: 'COMMENT' } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })) as AuditRow[]
  const resolve = await actorResolver(rows)
  return rows.map((r) => toItem(r, resolve(r.actorId), u.role))
}

/** System-wide activity feed — ADMIN only (gated via the ADMIN-only User entity). */
export async function listGlobalActivity(opts?: {
  entity?: string
  actorId?: string
  before?: Date
  take?: number
}): Promise<{ items: ActivityItem[]; nextBefore: Date | null }> {
  const u = await requireUser('read' as Action, 'User')
  const take = opts?.take ?? 30
  const rows = (await db.auditLog.findMany({
    where: {
      ...(opts?.entity ? { entity: opts.entity } : {}),
      ...(opts?.actorId ? { actorId: opts.actorId } : {}),
      ...(opts?.before ? { createdAt: { lt: opts.before } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
  })) as AuditRow[]
  const resolve = await actorResolver(rows)
  const items = rows.map((r) => toItem(r, resolve(r.actorId), u.role))
  const nextBefore = rows.length === take ? rows[rows.length - 1].createdAt : null
  return { items, nextBefore }
}
