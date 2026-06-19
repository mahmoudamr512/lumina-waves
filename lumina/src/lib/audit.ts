import { db } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

export type AuditInput = {
  actorId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'PURGE'
  entity: string
  entityId: string
  before?: unknown
  after?: unknown
}

// Prisma's nullable Json? field accepts `NullableJsonNullValueInput | InputJsonValue`.
// We cast `unknown` to this union so callers can pass arbitrary serialisable data.
type NullableJson = Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue

export async function writeAudit(i: AuditInput) {
  await db.auditLog.create({
    data: {
      actorId: i.actorId,
      action: i.action,
      entity: i.entity,
      entityId: i.entityId,
      before: (i.before ?? Prisma.JsonNull) as NullableJson,
      after: (i.after ?? Prisma.JsonNull) as NullableJson,
    },
  })
}
