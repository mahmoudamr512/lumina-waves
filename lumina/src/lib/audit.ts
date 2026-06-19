import { db } from '@/lib/db'

export type AuditInput = {
  actorId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'PURGE'
  entity: string
  entityId: string
  before?: unknown
  after?: unknown
}

export async function writeAudit(i: AuditInput) {
  await db.auditLog.create({
    data: {
      actorId: i.actorId,
      action: i.action,
      entity: i.entity,
      entityId: i.entityId,
      before: (i.before ?? null) as any,
      after: (i.after ?? null) as any,
    },
  })
}
