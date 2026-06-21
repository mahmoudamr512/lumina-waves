import { db } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

export type AuditInput = {
  actorId: string | null
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'RESTORE'
    | 'PURGE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'LOGIN_FAILED'
    | 'DOWNLOAD'
    | 'COMMENT'
  entity: string
  entityId: string
  before?: unknown
  after?: unknown
  meta?: unknown
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
      meta: (i.meta ?? Prisma.JsonNull) as NullableJson,
    },
  })
}
