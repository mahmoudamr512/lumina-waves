import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

const MODELS = ['Client', 'MasterContract', 'Annex', 'Work', 'Document'] as const
type Model = (typeof MODELS)[number]

// $includeDeleted is the raw PrismaClient; we index it by delegate name (camelCase).
// Prisma's client type doesn't allow arbitrary string indexing, so we narrow to
// the minimum interface we use: findMany, findUnique, update.
type SoftRow = { id: string; deletedAt: Date | null; purgeAfter: Date | null; purgedAt: Date | null }
type PrismaDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<SoftRow[]>
  findUnique: (args: Record<string, unknown>) => Promise<SoftRow | null>
  update: (args: Record<string, unknown>) => Promise<SoftRow>
}
const accessor = (m: Model): PrismaDelegate =>
  (db.$includeDeleted as unknown as Record<string, unknown>)[m[0].toLowerCase() + m.slice(1)] as PrismaDelegate

export async function listTrash() {
  await requireUser('read', 'Trash')
  const out: { id: string; entity: Model; deletedAt: Date; purgeAfter: Date | null }[] = []
  for (const m of MODELS) {
    const rows = await accessor(m).findMany({ where: { deletedAt: { not: null }, purgedAt: null } })
    for (const r of rows) {
      // The where-clause above guarantees deletedAt is not null; the type is narrowed here.
      if (!r.deletedAt) continue
      out.push({ id: r.id, entity: m, deletedAt: r.deletedAt, purgeAfter: r.purgeAfter })
    }
  }
  return out
}

export async function restore(entity: Model, id: string) {
  if (!MODELS.includes(entity as Model)) throw new Error('invalid entity: ' + entity)
  const u = await requireUser('delete', entity) // restore is an Admin-level op
  await accessor(entity).update({ where: { id }, data: { deletedAt: null, purgeAfter: null, purgedAt: null } })
  await writeAudit({ actorId: u.id, action: 'RESTORE', entity, entityId: id })
}

export async function purge(entity: Model, id: string) {
  if (!MODELS.includes(entity as Model)) throw new Error('invalid entity: ' + entity)
  const u = await requireUser('purge', 'Trash') // Admin-only
  // flag as purged (retain row + Drive copy) — no physical destruction
  await accessor(entity).update({ where: { id }, data: { purgedAt: new Date() } })
  await writeAudit({ actorId: u.id, action: 'PURGE', entity, entityId: id })
}

export async function purgeExpired() {
  const now = new Date()
  for (const m of MODELS) {
    const due = await accessor(m).findMany({
      where: { deletedAt: { not: null }, purgedAt: null, purgeAfter: { lt: now } },
    })
    for (const r of due) {
      await accessor(m).update({ where: { id: r.id }, data: { purgedAt: now } })
      await writeAudit({ actorId: 'system', action: 'PURGE', entity: m, entityId: r.id })
    }
  }
}
