// src/lib/authz.ts
import type { Role } from '@/generated/prisma/client'
export type Action = 'create'|'read'|'update'|'delete'|'purge'
export type Entity = 'Client'|'MasterContract'|'Annex'|'Work'|'Document'|'Trash'

export function can(role: Role, action: Action, entity: Entity): boolean {
  if (role === 'ADMIN') return true
  if (action === 'delete') return false          // delete is Admin-only (trash) — see trash service
  if (action === 'purge') return false
  switch (role) {
    case 'OPERATIONS': return ['create','read','update'].includes(action) && entity !== 'Trash'
    case 'LEGAL':      return ['create','read','update'].includes(action)
    case 'FINANCE':    return action === 'read'   // read-only across the board
    case 'VIEWER':     return action === 'read'
    default:           return false
  }
}

const SENSITIVE: Record<string, string[]> = {
  Client: ['nationalId'],
  MasterContract: ['revenueShareBps','minPayoutCents'],
  Document: ['storagePath'],
}
export function redactSensitive<T extends Record<string, any>>(role: Role, entity: Entity, row: T): T {
  if (role !== 'OPERATIONS' && role !== 'VIEWER') return row
  const result = { ...row } as T
  for (const f of SENSITIVE[entity] ?? []) if (f in result) (result as any)[f] = null
  return result
}
