// src/lib/authz.ts
import type { Role } from '@/generated/prisma/client'
export type Action = 'create'|'read'|'update'|'delete'|'purge'
export type Entity = 'Client'|'MasterContract'|'Annex'|'Work'|'Document'|'Trash'

export function can(role: Role, action: Action, entity: Entity): boolean {
  if (role === 'ADMIN') return true
  // Trash is ADMIN-only for all non-ADMIN roles (purge, hard-delete, restore all admin-gated)
  if (entity === 'Trash') return false
  if (action === 'delete') return false          // delete is Admin-only (trash) — see trash service
  if (action === 'purge') return false
  switch (role) {
    case 'OPERATIONS': return ['create','read','update'].includes(action)
    case 'LEGAL':      return ['create','read','update'].includes(action)
    case 'FINANCE':    return action === 'read'   // read-only across the board
    case 'VIEWER':     return action === 'read'
    default:           return false
  }
}

// Spec: sensitive fields (nationalId, revenueShareBps, minPayoutCents, storagePath) are
// visible only to ADMIN, LEGAL, and FINANCE. All other roles — including any future/unknown
// Role values — must have these fields redacted (fail-closed). This is a deliberate,
// audited per-role decision; a future refinement could go per-field.
const CAN_SEE_SENSITIVE: Role[] = ['ADMIN', 'LEGAL', 'FINANCE']

// Typed as Partial<Record<Entity, string[]>> so an entity-key typo is a compile error.
const SENSITIVE: Partial<Record<Entity, string[]>> = {
  Client: ['nationalId'],
  MasterContract: ['revenueShareBps','minPayoutCents'],
  Document: ['storagePath'],
}
export function redactSensitive<T extends Record<string, unknown>>(role: Role, entity: Entity, row: T): T {
  // Fail-closed: redact for ANY role NOT in the explicit allowlist
  if (CAN_SEE_SENSITIVE.includes(role)) return row
  const result = { ...row } as Record<string, unknown>
  for (const f of SENSITIVE[entity] ?? []) if (f in result) result[f] = null
  return result as T
}
